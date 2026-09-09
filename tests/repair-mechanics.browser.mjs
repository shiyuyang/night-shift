import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://localhost:5191/')+'?playtest=repair');await page.locator('#start:enabled').waitFor();await page.locator('[data-night="6"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active&&window.__nightshift().night===6);
 // Isolated live-scene door fixture; natural walkthrough is checked separately.
 await page.evaluate(()=>{const s=window.__nightshiftScene,d=s.level.door;s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=999;s.state.fuses=3;s.exitStartup=30;s.player.setPosition(d.x+d.width/2,d.y-55);s.ghost.setPosition(d.x+d.width/2-180,d.y+72);s.ghostTime=25;s.ghostDelay=0;s.ghost.setVisible(true);s.lastKnown={x:s.player.x,y:s.player.y};s.memory=0;s.route=[];s.routeTimer=0;s.rules={...s.rules,threat:'patroller'};s.protection=20;s.flashlightOn=false;});
 try{await page.waitForFunction(()=>window.__nightshift().doorBreach>1,null,{timeout:20000});}catch(error){console.log(await page.evaluate(()=>{const s=window.__nightshiftScene;return {door:s.level.door,target:s.doorTarget,ghost:{x:s.ghost.x,y:s.ghost.y},route:s.route,player:{x:s.player.x,y:s.player.y},solids:s.monsterSolids(),retreat:s.patrolRetreat,phase:s.state.phase};}));throw error;}
 // Leaving the room cancels the task even after battering has begun.
 await page.evaluate(()=>{const s=window.__nightshiftScene,d=s.level.door;s.player.setPosition(d.x+d.width/2,d.y+72);});
 await page.waitForFunction(()=>!window.__nightshift().doorTarget&&window.__nightshift().doorBreach===0);
 await page.evaluate(()=>{const s=window.__nightshiftScene,d=s.level.door;s.player.setPosition(d.x+d.width/2,d.y-55);});
 await page.waitForFunction(()=>window.__nightshift().doorBreach>1);await page.keyboard.press('f');await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>window.__nightshift())).doorBroken,false);
 // The flash may be blocked by the actual door. Pause must always freeze battering.
 await page.evaluate(()=>window.__nightshiftScene.setPaused(true));const stopped=await page.evaluate(()=>window.__nightshift().doorBreach);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__nightshift().doorBreach),stopped);
 await page.evaluate(()=>window.__nightshiftScene.setPaused(false));await page.waitForFunction(()=>window.__nightshift().doorBroken,null,{timeout:12000});assert.equal(await page.evaluate(()=>window.__nightshift().door),true);await page.screenshot({path:'output/repair/door-breached.png'});
 // Decode every authored Opus file using the actual browser audio implementation.
 const audio=await page.evaluate(async()=>{const effects=(await import('/game/audio-sfx.json')).default,music=(await import('/game/music.json')).default,ctx=new AudioContext();for(const a of [...effects,...music]){const buffer=await ctx.decodeAudioData(await (await fetch(a.opusFile)).arrayBuffer());if(buffer.duration<=0)throw Error(a.id);}await ctx.close();return {effects:effects.length,music:music.length};});assert.equal(audio.effects,39);assert.equal(audio.music,10);
 assert.deepEqual(errors,[]);console.log('Live door breach, pause and all 49 Opus decodes passed.');
}finally{await browser.close();}
