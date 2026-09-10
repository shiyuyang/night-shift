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
  const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.weeper=undefined;s.round=4;s.rules={...s.rules,threat:'listener'};s.state.fuses=3;s.opened=[true,true,true];s.door=true;s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.cooldown=999;s.interceptTargets=[];
  const clue={x:s.level.boxes[2].x,y:s.level.boxes[2].y};s.ghost.setPosition(clue.x,clue.y);s.player.setPosition(s.level.exit.x,s.level.exit.y);s.lastKnown={...clue};s.memory=0;
  s.hear(5,true);const quiet={...s.lastKnown};
  s.updateReinforcement(.016);const checkpoints=JSON.stringify(s.interceptTargets);
  s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.interceptClock=0;s.updateReinforcement(.016);
  const unchanged=checkpoints===JSON.stringify(s.interceptTargets);
  // Run real frames while stationary and far from the remembered box.
  s.reserves.forEach(r=>{r.position=null;r.used=true;});s.boxBlink.used=true;s.exitStartup=30;s.protection=100;
  s.setPaused(false);for(let i=0;i<320;i++)s.update(i*16,16);s.setPaused(true);
  return {clue,quiet,unchanged,lastKnown:s.lastKnown,memory:s.memory,active:s.active};
 });
 assert.deepEqual(result.quiet,result.clue);assert.equal(result.unchanged,true);assert.deepEqual(result.lastKnown,result.clue);assert.equal(result.memory,0);assert.equal(result.active,true);

 const patrol=await p.evaluate(()=>{
  const s=window.__nightshiftScene;s.round=2;s.state.fuses=1;s.opened=[true,false,false];s.door=true;s.memory=0;s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.protection=999;s.ghost.setPosition(s.level.spawn.x,s.level.spawn.y);s.lastKnown={x:s.ghost.x,y:s.ghost.y};s.pursuitSearch.reset();s.pursuitSearch.tick(.01,s.ghost,s.lastKnown,s.monsterSolids(),s.level.bounds);s.pursuitSearch.remaining=0;s.patrolCircuit.reset();
  const daily=s.pressurePatrolPoints();s.state.fuses=3;const finale=s.pressurePatrolPoints();s.state.fuses=1;
  const targets=new Set();let moved=0,previous={x:s.ghost.x,y:s.ghost.y};
  s.setPaused(false);for(let i=0;i<1000;i++){s.update(i*50,50);if(s.patrolCircuit.target)targets.add(JSON.stringify(s.patrolCircuit.target));moved+=Math.hypot(s.ghost.x-previous.x,s.ghost.y-previous.y);previous={x:s.ghost.x,y:s.ghost.y};}s.setPaused(true);
  return {daily,finale,exit:s.level.exit,boxes:s.level.boxes,targets:targets.size,moved,health:s.state.health};
 });
 assert.ok(patrol.daily.some(p=>p.x===patrol.boxes[1].x&&p.y===patrol.boxes[1].y));
 assert.ok(!patrol.daily.some(p=>p.x===patrol.boxes[0].x&&p.y===patrol.boxes[0].y));
 assert.deepEqual(patrol.finale.at(-1),patrol.exit);assert.ok(patrol.targets>=2);assert.ok(patrol.moved>500);
 console.log('Scene objective patrol checked:',{targets:patrol.targets,moved:Math.round(patrol.moved)});
 assert.deepEqual(errors,[]);console.log('Browser escape checks passed:',result);
}finally{await browser.close();}
