import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
mkdirSync('output/monster-death',{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=monster-death');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="1"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 async function prepare(kind,health=1){await p.evaluate(({kind,health})=>{const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.weeper=undefined;s.weeperIntroUsed=true;s.flashlightOn=false;s.lightFear.reset?.();s.rules={...s.rules,threat:kind};s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.ghost.setPosition(s.player.x,s.player.y);s.ghostTime=20;s.ghostDelay=0;s.cooldown=999;s.opened[0]=true;s.state.fuses=1;s.state.health=health;s.hit=0;s.protection=0;s.stun=0;s.flashSafety=0;s.memory=10;s.patrolRetreat=false;s.rogue.hidden='';}, {kind,health});}
 // Actual contact update, not a direct finish() or UI call.
 await prepare('listener',100);await p.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);s.update(0,16);s.setPaused(true);});assert.ok(await p.evaluate(()=>window.__nightshiftScene.state.health>0&&window.__nightshiftScene.state.health<100));assert.equal(await p.locator('.shade-contact-scare').isVisible(),false);
 for(const kind of ['listener','light-shy','patroller','weeper','reserve','shade']){
  await prepare(kind==='reserve'?'patroller':kind);
  await p.evaluate(async kind=>{const s=window.__nightshiftScene;if(kind==='weeper'){const {Weeper}=await import('/src/runtime/weeper.ts');s.weeper=new Weeper({x:s.player.x,y:s.player.y});s.weeper.phase='dash';s.weeper.clock=.5;s.weeper.grace=0;s.updateWeeper(.016,false);}
   else if(kind==='reserve'){s.reserves[0].position={x:s.player.x,y:s.player.y};s.reserves[0].used=true;s.reserves[0].warning=0;s.reserves[0].guard=0;s.state.fuses=3;s.opened=[true,true,true];s.round=4;s.updateReinforcement(.016);}
   else if(kind==='shade'){s.gifts.shade=20;s.giftShade.position={x:s.player.x,y:s.player.y};s.giftShade.contactWait=0;s.giftShade.tear=0;s.updateGifts(.016);}
   else{s.setPaused(false);s.update(0,16);}
  },kind);
  await p.waitForFunction(()=>!window.__nightshiftScene.active,{},{timeout:3000});
  const expected=kind==='reserve'?'patroller':kind;assert.equal(await p.locator('.shade-contact-scare').getAttribute('data-kind'),expected);
  await p.locator('.shade-contact-scare').evaluate(el=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=270;}});
  const visual=await p.evaluate(()=>{const el=document.querySelector('.shade-contact-scare'),f=el.querySelector('.shade-scare-face'),r=el.querySelector('.shade-scare-room'),data=f.getContext('2d').getImageData(0,0,f.width,f.height).data,colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return {colors:colors.size,width:f.width,height:f.height,roomWidth:r.width,resultInert:document.querySelector('#result-screen').inert};});
  assert.equal(visual.width,256);assert.equal(visual.height,170);assert.ok(visual.colors>3&&visual.colors<=13);assert.ok(visual.roomWidth>0);assert.ok(visual.resultInert);
  await p.screenshot({path:`output/monster-death/${kind}.png`});
  await p.locator('.shade-contact-scare').evaluate(el=>{for(const a of el.getAnimations({subtree:true}))a.play();});await p.waitForFunction(()=>document.querySelector('.shade-contact-scare').hidden);
  assert.equal(await p.locator('#result-screen').evaluate(el=>el.inert),false);assert.equal(await p.locator('#result-screen').isVisible(),true);await p.locator('#result-retry').click();await p.waitForFunction(()=>window.__nightshiftScene.active);assert.equal(await p.locator('.shade-contact-scare').isVisible(),false);
  console.log(kind,'lethal source / rendered portrait / result lock / reset passed');
 }
 // Reduced motion has neither zoom nor room flicker, and cancellation restores interaction.
 await p.emulateMedia({reducedMotion:'reduce'});await prepare('listener');await p.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);s.update(0,16);});
 const frames=await p.locator('.shade-scare-face').evaluate(el=>el.getAnimations()[0].effect.getKeyframes());assert.ok(frames.every(f=>!f.transform));
 await p.evaluate(()=>window.__nightshiftScene.startRun(1));await p.waitForFunction(()=>document.querySelector('.shade-contact-scare').hidden);assert.equal(await p.locator('#result-screen').evaluate(el=>el.inert),false);
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
