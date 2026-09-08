import {chromium} from '@playwright/test';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';

const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
const output='output/industrial-maps';mkdirSync(output,{recursive:true});
const reports=[];
try{
 for(const round of [2,3]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  const name=round===2?'warehouse':'plant';page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(()=>{
    localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:3}));
    localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));
   });
   await page.goto((process.env.BASE_URL||'http://127.0.0.1:5187')+'/?playtest=industrial');
   await page.locator('#start:enabled').waitFor();await page.locator(`[data-night="${round}"]`).click();await page.locator('#start').click();
   await page.waitForFunction(n=>window.__nightshiftScene?.active&&window.__nightshift().night===n,round);
   const initial=await snapshot(page),l=initial.level;assert.equal(l.width,1280);assert.equal(l.height,768);
   // Pure lighting fixture uses this map's actual tall-object dimensions.
   const lighting=await page.evaluate(async()=>{
    const s=window.__nightshiftScene,b=s.level.props.find(p=>p.kind==='rack'||p.kind==='engine');
    const {LightRenderer}=await import('/src/light-renderer.ts');const renderer=new LightRenderer(),canvas=document.createElement('canvas');canvas.width=640;canvas.height=384;const ctx=canvas.getContext('2d');
    const lamp={x:b.x-40,y:b.y+b.height/2,radius:400,strength:1,color:'#ffffff',colorStrength:0},player={x:1200,y:700};
    const alpha=()=>ctx.getImageData((b.x+b.width+40)/2,lamp.y/2,1,1).data[3];
    renderer.render(ctx,[lamp],[],[],player,false);const clear=alpha();renderer.render(ctx,[lamp],[b],[],player,false);const blocked=alpha();
    const original=s.lighting.render.bind(s.lighting);let wired=false;
    s.lighting.render=(ctx,lamps,walls,...rest)=>{wired=walls.includes(b);return original(ctx,lamps,walls,...rest);};s.light();s.lighting.render=original;
    return {clear,blocked,wired};
   });
   assert.ok(lighting.blocked>lighting.clear+25,JSON.stringify(lighting));assert.equal(lighting.wired,true);
   // Existing sanctuary assistance isolates traversal from balancing. No teleporting,
   // inventory edits, forced unlocks, or alteration of live monster state.
   await page.evaluate(()=>{window.__industrialAid=setInterval(()=>{const s=window.__nightshiftScene;if(s?.active&&!s.paused)s.command('sanctuary','world');},2000);});
   const use=async()=>{await page.keyboard.press('e',{delay:80});await page.waitForTimeout(150);};
   await page.screenshot({path:`${output}/${name}-entry.png`});
   await goTo(page,l.doorUse.x,l.doorUse.y,10);await use();assert.equal((await snapshot(page)).door,false);
   await goTo(page,l.key.x,l.key.y,27);await use();assert.equal((await snapshot(page)).key,true);
   await goTo(page,l.boxes[0].x,l.boxes[0].y,35);await use();assert.equal((await snapshot(page)).opened[0],true);
   await page.screenshot({path:`${output}/${name}-search.png`});
   await goTo(page,l.boxes[1].x,l.boxes[1].y,35);await use();assert.equal((await snapshot(page)).opened[1],true);
   // Cross the added southern area, then enter the east lock room through its door.
   await goTo(page,round===2?940:930,680,12);assert.ok((await snapshot(page)).camera.y>200);
   await page.screenshot({path:`${output}/${name}-south.png`});
   await goTo(page,l.doorUse.x,l.doorUse.y,8);await use();assert.equal((await snapshot(page)).door,true);
   assert.ok((await snapshot(page)).camera.x>500);
   await goTo(page,l.boxes[2].x,l.boxes[2].y,35);await use();assert.equal((await snapshot(page)).opened[2],true);
   const escapeStart=await snapshot(page);await page.screenshot({path:`${output}/${name}-final-box.png`});
   await goTo(page,l.exit.x,l.exit.y,20);await page.waitForFunction(()=>window.__nightshift().exitStartup===0);await use();
   await page.locator('#result-screen').waitFor({state:'visible'});assert.equal(await page.locator('#result-screen').getAttribute('data-outcome'),'won');
   const end=await snapshot(page);assert.ok(end.health>0);assert.deepEqual(errors,[]);
   await page.screenshot({path:`${output}/${name}-escaped.png`});
   reports.push({round,source:l.source,seed:l.generation.seed,attempts:l.generation.attempts,fallback:l.generation.fallback,lighting,elapsed:end.elapsed,walkDistance:end.walkDistance,escapeSeconds:end.elapsed-escapeStart.elapsed,escapeWalkDistance:end.walkDistance-escapeStart.walkDistance,weeper:initial.weeper?.home??null,assistance:'Existing sanctuary every 2 seconds; real keyboard navigation and lock chain',errors});
   console.log(reports.at(-1));
  }catch(e){await page.screenshot({path:`${output}/${name}-failure.png`,fullPage:true});throw e;}finally{await page.close();}
 }
 writeFileSync(output+'/browser-report.json',JSON.stringify(reports,null,2)+'\n');
}finally{await browser.close();}
