import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.addInitScript(()=>localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper'])));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=listener');await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 // Hold the monster briefly to isolate hearing from distance changes caused by pursuit.
 const setup=async(x)=>page.evaluate(x=>{const s=window.__nightshiftScene;s.tutorial.enabled=false;s.tutorial.prompt=null;s.paused=false;s.state.fuses=1;s.door=true;s.player.setPosition(200,414);s.ghost.setPosition(x,414);s.ghostTime=24;s.ghostDelay=0;s.stun=20;s.protection=999;s.memory=10;s.lastKnown={x:200,y:265};s.weeperNoise=0;s.step=0;s.route=[];s.routeTimer=0;s.patrolRetreat=false;},x);
 const walk=async()=>{await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');};
 await setup(310);await walk();const heard=await page.evaluate(()=>{const s=window.__nightshiftScene;return {last:s.lastKnown,player:{x:s.player.x,y:s.player.y},noise:s.weeperNoise};});
 assert.ok(heard.player.x>240,JSON.stringify(heard));assert.ok(heard.last.x>220&&heard.last.y===414,'Nearby walking must replace the stale box clue');assert.equal(heard.noise,0,'Walking must not become a loud event for the patient');
 await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(()=>window.__nightshiftScene.lastKnown),heard.last,'Standing still creates no fresh clue');
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.stun=0;s.protection=999;});await page.waitForFunction(()=>{const s=window.__nightshiftScene;return Math.hypot(s.ghost.x-s.player.x,s.ghost.y-s.player.y)<26;});
 await setup(780);await walk();assert.deepEqual(await page.evaluate(()=>window.__nightshiftScene.lastKnown),{x:200,y:265},'Distant quiet footsteps remain inaudible');
 // Continuous ordinary walking must no longer preserve a comfortable lead.
 await setup(360);await page.evaluate(()=>{const s=window.__nightshiftScene;s.player.setPosition(476,414);s.state.fuses=0;s.stun=0;s.lastKnown={x:476,y:414};s.memory=6;s.route=[];s.routeTimer=0;});
 const initial=await page.evaluate(()=>{const s=window.__nightshiftScene;return Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y);});
 await page.keyboard.down('d');await page.waitForTimeout(4000);await page.keyboard.up('d');
 const chase=await page.evaluate(()=>{const s=window.__nightshiftScene;return {gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),x:s.player.x,speed:s.pursuitSpeed};});
 assert.ok(chase.x>750,'Player must actually walk throughout the chase');assert.ok(chase.gap<initial-45,JSON.stringify({initial,chase}));assert.ok(chase.speed<125,'Sprint must remain faster');console.log('Walking chase:',{initial,...chase});
 console.log('Listener: real walking keys refresh nearby clues, standing and distant walking stay quiet, pursuit reaches the new location.');
}finally{await browser.close();}
