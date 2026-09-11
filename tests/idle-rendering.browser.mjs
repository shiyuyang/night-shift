import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const engine=process.env.BROWSER==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
const out=`output/idle-profile/checks-${engine}`;mkdirSync(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:3,seed:0}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=idle-rendering');await page.locator('#start:enabled').waitFor();
 // Compare against the frozen old renderer, including warm-cache calls, changed
 // colors/strength, moving/rotating lights, duplicate sources, doors, props and resize.
 const parity=await page.evaluate(async()=>{
  const {LightRenderer}=await import('/src/light-renderer.ts');const {LightRenderer:Reference}=await import('/tests/fixtures/light-renderer-before-idle.ts');
  const {makeLevel}=await import('/src/levels.ts');const current=new LightRenderer(),reference=new Reference();
  const make=()=>{const c=document.createElement('canvas');c.width=640;c.height=384;return c.getContext('2d',{willReadFrequently:true});};const a=make(),b=make();let comparisons=0,maxError=0,changed=0,maxMasks=0,maxPixels=0;
  for(let night=1;night<=7;night++){
   const level=makeLevel(night,0),walls=level.walls.map(v=>({...v})),props=level.props.map(v=>({...v})),p={...level.spawn};
   for(let frame=0;frame<10;frame++){
    if(frame===6)walls.push({...level.door});if(frame===7)walls.at(-1).width+=12;if(frame===8){walls.pop();props[0].x+=10;}if(frame===9){a.canvas.width=b.canvas.width=480;}
    const lamps=level.lamps.map(l=>({...l,color:frame%3?'#aaccee':'#fa921b',strength:frame%2?.82:.4}));
    lamps.push({x:p.x+frame*2,y:p.y,radius:250,angle:frame*.13,strength:.98,color:'#ddccaa'},{x:p.x,y:p.y,radius:44,strength:.34,color:'#a0acb4'});
    // Two same-position lamps may have independent tints and opacity.
    lamps.push({...lamps[0],color:'#38b970',strength:.12,colorStrength:.07});
    for(let repeat=0;repeat<2;repeat++){
     current.render(a,lamps,walls,props,p,frame===4);reference.render(b,lamps,walls,props,p,frame===4);
     const x=a.getImageData(0,0,a.canvas.width,a.canvas.height).data,y=b.getImageData(0,0,b.canvas.width,b.canvas.height).data;
     for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);if(d){changed++;maxError=Math.max(maxError,d);}}comparisons++;
    }
    if(current.masks.size>lamps.length)throw Error('Moving light cache retained obsolete sources');
    maxMasks=Math.max(maxMasks,current.masks.size);maxPixels=Math.max(maxPixels,[...current.masks.values()].reduce((n,v)=>n+v.mask.width*v.mask.height*2,0));
   }
  }
  return {comparisons,maxError,changed,maxMasks,maxCachedBytes:maxPixels*4};
 });
 assert.equal(parity.changed,0,JSON.stringify(parity));console.log('Pixel parity',parity);
 await page.evaluate(()=>{const s=window.__nightshiftScene;window.__renders=0;s.game.events.on('postrender',()=>window.__renders++);});
 const frozen=async label=>{await page.waitForFunction(()=>window.__nightshiftScene.game.isPaused&&!window.__nightshiftScene.game.loop.running);const before=await page.evaluate(()=>({renders:window.__renders,time:window.__nightshiftScene.state.elapsed}));await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>({renders:window.__renders,time:window.__nightshiftScene.state.elapsed})),before,label);};
 await frozen('title stays still');await page.screenshot({path:`${out}/title.png`});
 await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene.active&&!window.__nightshiftScene.game.isPaused);
 const time=await page.evaluate(()=>window.__nightshiftScene.state.elapsed);await page.waitForTimeout(350);assert.ok(await page.evaluate(t=>window.__nightshiftScene.state.elapsed>t+.2,time));
 await page.locator('#pause').click();await frozen('pause stays still');await page.setViewportSize({width:1440,height:900});await frozen('paused resize stays still');await page.screenshot({path:`${out}/pause.png`});
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.state.battery=5;s.frame=1;s.sync();});await frozen('paused low battery redraw');
 const dim=await page.evaluate(()=>window.__nightshiftScene.canvas.canvas.toDataURL());
 await page.evaluate(async()=>{const s=window.__nightshiftScene,{giftDefinitions}=await import('/src/runtime/live-gifts.ts');const giftId=Object.keys(giftDefinitions).find(id=>giftDefinitions[id].kind==='battery');s.frame=1;s.receiveGift({id:'idle-battery',runId:s.gifts.runId,giftId,count:1,viewer:'Test',userId:'idle-test'});});
 await frozen('paused gift redraw');assert.equal(await page.evaluate(()=>window.__nightshiftScene.state.battery),30);assert.notEqual(await page.evaluate(()=>window.__nightshiftScene.canvas.canvas.toDataURL()),dim);
 await page.locator('#resume').click();await page.waitForFunction(()=>!window.__nightshiftScene.game.isPaused);await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');assert.ok(await page.evaluate(()=>window.__nightshiftScene.distance>0));
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.prompt='monster-patroller';s.sync();});await frozen('lesson stays still');await page.locator('#tutorial-continue').click();await page.waitForFunction(()=>!window.__nightshiftScene.game.isPaused&&!window.__nightshiftScene.tutorial.prompt);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.prompt='exit';s.beginExitTour();s.sync();});await page.waitForFunction(()=>window.__nightshiftScene.exitTour==='hold');await frozen('exit tour hold stays still');await page.locator('#tutorial-continue').click();await page.waitForFunction(()=>window.__nightshiftScene.exitTour==='none'&&!window.__nightshiftScene.game.isPaused);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.finish(false,'listener');});await frozen('result stays still');await page.waitForFunction(()=>document.querySelector('.shade-contact-scare').hidden);await page.locator('#result-retry').click();await page.waitForFunction(()=>window.__nightshiftScene.active&&!window.__nightshiftScene.game.isPaused);
 await page.locator('#pause').click();await page.locator('#menu-stages').click();await frozen('return to title stays still');
 assert.deepEqual(errors,[]);writeFileSync(`${out}/summary.json`,JSON.stringify({engine,parity,errors,lifecycle:'title/start/pause/resize/resume/lesson/exit-tour/death/retry/title passed'},null,2));console.log(engine,'idle lifecycle passed');
}finally{await browser.close();}
