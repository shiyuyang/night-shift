import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
mkdirSync('output/monster-death',{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=monster-death');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="1"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);

 const result=await p.evaluate(()=>{
  const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.weeper=undefined;s.round=3;s.rules={...s.rules,threat:'listener'};s.ghostTime=20;s.ghostDelay=0;s.cooldown=999;s.stun=0;s.hit=0;s.protection=0;s.lure=0;s.rogue.features=[];s.player.setPosition(420,414);s.ghost.setPosition(440,414);s.memory=.1;s.lastKnown={x:420,y:414};s.state.fuses=1;s.state.health=10000;s.route=[];s.routeTimer=0;s.pursuitSearch.reset();s.patrolRetreat=false;s.boxBlink.used=true;
  const samples=[];s.setPaused(false);for(let i=0;i<65;i++){s.update(i*50,50);if([0,2,10,20,40,60].includes(i))samples.push({time:(i+1)*.05,health:s.state.health,gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),memory:s.memory,position:{x:s.ghost.x,y:s.ghost.y},clue:{...s.lastKnown},search:s.pursuitSearch.remaining});}s.setPaused(true);return samples;
 });
 assert.ok(result.every(sample=>sample.memory>0));assert.ok(result.every(sample=>sample.gap<26));
 console.log('Listener contact remains a short-lived clue',JSON.stringify(result));
 const lost=await p.evaluate(()=>{const s=window.__nightshiftScene;s.player.setPosition(800,414);s.setPaused(false);for(let i=0;i<30;i++)s.update(i*50,50);s.setPaused(true);return s.memory;});assert.equal(lost,0);
 for(let night=2;night<=7;night++){
  await p.evaluate(n=>localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:n,seed:7})),night);
  await p.reload();await p.locator('#start:enabled').waitFor();await p.locator('[data-night="'+night+'"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
  const opening=await p.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.skip();s.command('ghost','world');s.setPaused(true);return {used:s.openingSpawnUsed,gap:Math.hypot(s.ghost.x-s.player.x,s.ghost.y-s.player.y),visible:s.canSee(s.player,s.ghost),memory:s.memory,delay:s.ghostDelay};});
  assert.ok(opening.used,JSON.stringify({night,opening}));assert.ok(opening.gap>=400);assert.equal(opening.visible,false);assert.equal(opening.memory,0);assert.ok(opening.delay>0);
  console.log('Opening',night,opening);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
