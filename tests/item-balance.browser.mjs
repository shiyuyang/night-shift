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
  const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.weeper=undefined;s.rules={...s.rules,threat:'listener'};s.ghostTime=20;s.ghostDelay=0;s.player.setPosition(420,414);s.ghost.setPosition(450,414);s.stun=0;s.memory=3;s.lastKnown={x:420,y:414};s.finaleTarget={x:500,y:414};
  const initial={flash:s.flashes,decoy:s.decoys,bandage:s.bandages};
  const hit=s.repel(),after={stun:s.stun,memory:s.memory,ghost:{x:s.ghost.x,y:s.ghost.y},clue:{...s.lastKnown},finale:s.finaleTarget};s.hear(3,false,true);const deafClue={...s.lastKnown};
  s.flashes=1000;s.decoys=1000;s.bandages=1000;
  for(const item of ['flash','decoy','bandage'])s.handleRogue([{type:'loot',item,at:{x:420,y:414}}]);
  s.setPaused(false);s.command('supply');s.setPaused(true);s.sync();
  return {initial,hit,after,deafClue,inventory:[s.flashes,s.decoys,s.bandages]};
 });
 assert.deepEqual(result.initial,{flash:4,decoy:4,bandage:2});assert.ok(result.hit);assert.equal(result.after.stun,1);assert.equal(result.after.memory,0);assert.ok(result.after.ghost.x>450);assert.deepEqual(result.deafClue,{x:450,y:414});assert.equal(result.after.finale,undefined);assert.deepEqual(result.inventory,[1002,1001,1002]);
 assert.equal(await p.locator('#flash-count').textContent(),'1002');

 const interruption=await p.evaluate(()=>{
  const s=window.__nightshiftScene;s.rules={...s.rules,threat:'light-shy'};s.player.setPosition(420,414);s.ghost.setPosition(440,414);s.ghostTime=20;s.ghostDelay=0;s.stun=0;s.memory=3;s.lure=8;s.lurePos={x:420,y:414};s.state.fuses=1;s.state.health=100;s.hit=0;s.protection=0;s.flashlightOn=false;s.cooldown=999;
  const before={x:s.ghost.x,y:s.ghost.y};s.setPaused(false);s.update(0,16);s.setPaused(true);
  return {before,after:{x:s.ghost.x,y:s.ghost.y},hesitation:s.distractionResponse.hesitation,health:s.state.health};
 });assert.deepEqual(interruption.after,interruption.before);assert.equal(interruption.hesitation,.65);assert.equal(interruption.health,100);
 console.log('Visible light-shy decoy interruption passed');
 assert.deepEqual(errors,[]);console.log('Listener flash and uncapped supplies passed');
}finally{await browser.close();}
