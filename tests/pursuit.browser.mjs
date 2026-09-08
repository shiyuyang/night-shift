import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://localhost:5191')+'/?playtest=pursuit');await page.locator('#start:enabled').waitFor();await page.locator('[data-night="3"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 // Find an actual unobstructed corridor in the generated map; use the live scene tick and renderer.
 const pair=await page.evaluate(async()=>{const s=window.__nightshiftScene,{monsterFeetAt,overlaps,clearContact}=await import('/src/collision.ts');const solids=s.monsterSolids();for(let y=160;y<700;y+=8)for(let x=100;x<1000;x+=8){const a={x,y},b={x:x+220,y};if(Array.from({length:111},(_,i)=>({x:x+i*2,y})).every(p=>!solids.some(w=>overlaps(monsterFeetAt(p.x,p.y),w)))&&clearContact(a,b,s.solids()))return {a,b};}throw Error('No clear corridor for far-beam fixture');});
 await page.evaluate(async({a,b})=>{const s=window.__nightshiftScene,{Weeper}=await import('/src/runtime/weeper.ts');s.cooldown=999;s.ghostTime=0;s.protection=100;s.player.setPosition(a.x,a.y);s.weeper=new Weeper(b);s.weeper.grace=0;s.weeperSprite.setVisible(true);s.flashlightOn=true;s.state.battery=10;s.angle=0;},pair);
 await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.__nightshift().weeper.anger),0,'low battery must not wake a patient beyond its beam');
 await page.evaluate(()=>window.__nightshiftScene.state.battery=100);
 await page.waitForFunction(()=>window.__nightshift().weeper.noticed&&window.__nightshift().weeper.frame===4);
 assert.equal(await page.evaluate(()=>Number(window.__nightshiftScene.weeperSprite.frame.name)),4);
 await page.waitForFunction(()=>window.__nightshift().weeper.phase==='warning');await page.waitForFunction(()=>{const s=window.__nightshift();return Math.hypot(s.player.x-s.weeper.position.x,s.player.y-s.weeper.position.y)<180;},{},{timeout:8000}).catch(async e=>{console.log(await page.evaluate(()=>({state:window.__nightshift(),paused:window.__nightshiftScene.paused,route:window.__nightshiftScene.weeper.route})));throw e;});await page.keyboard.press('f');await page.waitForFunction(()=>window.__nightshift().weeper.phase==='stunned');
 // A roaming patient must physically move and use walking frames in the real scene.
 await page.evaluate(async({a,b})=>{const s=window.__nightshiftScene,{Weeper}=await import('/src/runtime/weeper.ts');s.flashlightOn=false;s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.weeper=new Weeper(a,[b]);s.weeper.roamWait=0;},pair);
 await page.waitForFunction(()=>window.__nightshift().weeper.roaming);const roaming=await page.evaluate(()=>window.__nightshift().weeper);assert.ok(roaming.frame>=8&&roaming.frame<=11);
 await page.waitForTimeout(400);assert.ok(Math.hypot((await page.evaluate(()=>window.__nightshift().weeper.position)).x-roaming.position.x,(await page.evaluate(()=>window.__nightshift().weeper.position)).y-roaming.position.y)>5);
 // Use the real encounter command, preserving the warning and entry choice.
 const spawn=await page.evaluate(()=>{const s=window.__nightshiftScene;s.weeper=undefined;s.weeperSprite.setVisible(false);s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.command('ghost','world');return s.snapshot();});assert.equal(spawn.ghostDelay,3);assert.ok(spawn.ghost.time>0);assert.ok(Math.hypot(spawn.ghost.x-spawn.player.x,spawn.ghost.y-spawn.player.y)>=180);
 await page.waitForFunction(()=>window.__nightshift().ghostVisible);
 // A listener searches a stale clue without learning the silent player's position.
 await page.evaluate(({a,b})=>{const s=window.__nightshiftScene;s.ghost.setPosition(a.x,a.y);s.lastKnown={...b};s.memory=0;s.route=[];s.routeTimer=0;s.pursuitSearch.reset();s.rules={...s.rules,threat:'listener'};s.patrolUnseen=0;s.patrolRetreat=false;s.flashlightOn=false;},pair);
 await page.waitForFunction(()=>window.__nightshift().pursuit.searchPoints.length>0);const before=await page.evaluate(()=>window.__nightshift());await page.waitForTimeout(700);const after=await page.evaluate(()=>window.__nightshift());assert.ok(Math.hypot(after.ghost.x-before.ghost.x,after.ghost.y-before.ghost.y)>15);assert.equal(after.patrolRetreat,false);assert.deepEqual(await page.evaluate(()=>window.__nightshiftScene.lastKnown),pair.b);
 await page.evaluate(()=>window.__nightshiftScene.setPaused(true));const frozen=await page.evaluate(()=>window.__nightshift());await page.waitForTimeout(200);assert.deepEqual((await page.evaluate(()=>window.__nightshift())).ghost,frozen.ghost);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.ghostTime=0;s.cooldown=99;s.lastThreatAt=0;s.state.elapsed=40;s.setPaused(false);});
 await page.waitForFunction(()=>window.__nightshiftScene.cooldown<=6);
 assert.deepEqual(errors,[]);console.log('Chrome pursuit checks passed: battery-scaled far beam, warning and flash, rendered roaming, regional spawn warning, moving clue search, pause and quiet-period pressure.');
}finally{await browser.close();}
