import {chromium} from '@playwright/test';import {existsSync,mkdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});mkdirSync('output/finale-pressure',{recursive:true});
const reports=[];
try{
 for(const round of (process.env.DENSITY_ROUNDS?process.env.DENSITY_ROUNDS.split(',').map(Number):[1,2,3,4,5,6,7])){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=density');await page.locator('#start:enabled').waitFor();await page.locator(`[data-night="${round}"]`).click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.skip();s.protection=999;});
  if(round>1)await page.waitForFunction(()=>window.__nightshiftScene.ghost.visible,{},{timeout:24000});
  const daily=await page.evaluate(()=>{const s=window.__nightshiftScene;return s.reserves.filter(r=>r.position).length;});assert.equal(daily,0);
  if(round===4){
   const before=await page.evaluate(()=>{const s=window.__nightshiftScene;s.memory=0;s.patrolUnseen=99;s.lastThreatAt=-100;s.ghostTime=.1;return {x:s.ghost.x,y:s.ghost.y};});
   await page.waitForTimeout(2000);
   const after=await page.evaluate(()=>{const s=window.__nightshiftScene;return {x:s.ghost.x,y:s.ghost.y,time:s.ghostTime,retreat:s.patrolRetreat};});
   assert.ok(after.time>0&&!after.retreat,'Resident monster must not retire after losing its clue');assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>10);
  }
  // Controlled alarm fixture. Spawn origin and motion use real scene updates.
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.door=false;s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+24);s.opened=[true,true,true];s.state.fuses=3;s.escalateSearch();s.flashlightOn=false;});
  if(round<4){await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__nightshiftScene.reserves.filter(r=>r.position).length),0);await page.close();continue;}
  await page.waitForFunction(n=>window.__nightshiftScene.reserves.filter(r=>r.position).length===1,round,{timeout:10000});
  const entry=await page.evaluate(()=>{const s=window.__nightshiftScene;return {exit:s.level.exit,primary:{x:s.ghost.x,y:s.ghost.y},units:s.reserves.flatMap((r,i)=>r.position?[{i,entry:r.entry,position:{...r.position}}]:[]),targets:s.interceptTargets};});
  for(const r of entry.units)assert.ok(Math.hypot(r.entry.x-entry.exit.x,r.entry.y-entry.exit.y)<=225,JSON.stringify({round,r}));
  await page.waitForTimeout(7500);
  const moved=await page.evaluate(()=>window.__nightshiftScene.reserves.map(r=>r.position));
  assert.ok(entry.units.every(r=>Math.hypot(moved[r.i].x-r.position.x,moved[r.i].y-r.position.y)>10));
  if(round===4){
   const trace=[];for(let i=0;i<30;i++){await page.waitForTimeout(1000);trace.push(await page.evaluate(()=>{const s=window.__nightshiftScene;return {remaining:s.exitStartup,door:s.door,count:s.reserves.filter(r=>r.position).length,primaryGap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),units:s.reserves.map(r=>({position:r.position,stun:r.stun}))};}));}
   assert.ok(trace.some(t=>t.door&&t.remaining>0),'Closed room must be breached during alarm');assert.ok(trace.every(t=>t.count===1));assert.ok(trace.some(t=>t.primaryGap<30&&t.remaining>0));
   writeFileSync('output/finale-pressure/exit-interception.json',JSON.stringify({entry,trace},null,2));
   await page.evaluate(async()=>{const s=window.__nightshiftScene;s.setPaused(true);const {Weeper}=await import('/src/runtime/weeper.ts');s.weeper=new Weeper({x:200,y:200});s.weeper.phase='chasing';if(s.patientOwnsPursuit)throw Error('Patient must coexist with regular enemies');s.weeper=undefined;s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.ghost.setPosition(s.player.x,s.player.y);s.ghostTime=24;s.ghostDelay=0;s.stun=0;s.lightFear.reset();for(const r of s.reserves){r.position={x:s.player.x,y:s.player.y};r.stun=0;}s.repel();if(s.reserves.some(r=>r.stun!==2))throw Error('Flash must stun every nearby extra patrol');s.protection=0;s.hit=0;s.state.health=100;s.stun=0;for(const r of s.reserves){r.position={x:s.player.x,y:s.player.y};r.stun=0;}s.updateReinforcement(.01);if(s.state.health!==80)throw Error('Extra patrols must share the contact damage cooldown');});
  }
  await page.screenshot({path:`output/finale-pressure/exit-origin-night-${round}.png`});assert.deepEqual(errors,[]);reports.push({round,daily,entry});console.log(reports.at(-1));await page.close();
 }
 writeFileSync(`output/finale-pressure/exit-density-maps-${process.env.DENSITY_ROUNDS||'all'}.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
