import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:2}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174')+'/?playtest=rogue');await page.locator('#start:enabled').waitFor();await page.locator('[data-night="2"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 const initial=await snapshot(page);assert.equal(initial.decoys,3);assert.equal(initial.flashes,3);
 const caches=initial.rogue.features.filter(f=>f.kind==='cache');assert.ok(caches.length>=4&&caches.length<=6);assert.equal(caches.filter(f=>f.hasLoot).length,2);
 // Isolate keyboard cabinet/locker interactions from pursuit, locked-door progression and full-inventory behavior.
 // Those mechanics have separate monster and cache tests.
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.skip();s.flashes=s.decoys=s.bandages=0;s.ghostTime=s.ghostDelay=0;s.ghostCooldown=999;s.protection=999;s.door=true;});
 const at=f=>({x:f.x+f.width/2,y:f.y+f.height/2+28});
 const cache=caches.find(f=>f.hasLoot),cp=at(cache);await goTo(page,cp.x,cp.y);assert.match((await snapshot(page)).interaction.text,/搜索/);await page.keyboard.press('e',{delay:90});await page.waitForTimeout(150);
 const gained=await snapshot(page),field={flash:'flashes',decoy:'decoys',bandage:'bandages'}[cache.reward],binding={flash:'F',decoy:'R',bandage:'Q'}[cache.reward];assert.equal(gained[field],1);assert.equal(gained.rogue.stats.cachesOpened,1);assert.ok(gained.rogue.opened.includes(cache.id));assert.ok(gained.feedback.received[binding]>0);assert.match(await page.locator('#receipt-message').textContent(),/获得/);
 const event={id:`rogue-${Date.now()}`,command:'reveal',viewer:'测试'};
 const response=await page.request.post(`${new URL(page.url()).origin}/api/webhook`,{data:event});assert.equal(response.status(),200);await page.waitForFunction(()=>window.__nightshift().reveal>0);
 const duplicate=await page.request.post(`${new URL(page.url()).origin}/api/webhook`,{data:event});assert.equal((await duplicate.json()).status,'duplicate');
 const invalid=await page.request.post(`${new URL(page.url()).origin}/api/webhook`,{data:{id:'invalid',command:'execute'}});assert.equal(invalid.status(),400);
 assert.match(await page.locator('#receipt-message').textContent(),/获得/);await page.keyboard.press('e',{delay:90});assert.equal((await snapshot(page)).rogue.stats.cachesOpened,1);
 const locker=initial.rogue.features.find(f=>f.kind==='locker'),lp=at(locker);await goTo(page,lp.x,lp.y-28,34);assert.match((await snapshot(page)).interaction.text,/藏身柜/);await page.keyboard.press('e',{delay:90});await page.waitForTimeout(150);assert.equal((await snapshot(page)).rogue.hidden,locker.id);await page.keyboard.press('e',{delay:90});await page.waitForTimeout(150);assert.equal((await snapshot(page)).rogue.hidden,'');
 await page.evaluate(()=>window.__nightshiftScene.setPaused(true));const time=(await snapshot(page)).rogue.time;await page.waitForTimeout(600);assert.equal((await snapshot(page)).rogue.time,time);
 assert.deepEqual(errors,[]);console.log('Rogue browser passed: real keyboard cache/locker interaction, one-shot loot, persistent receipt and paused clock (pursuit suppressed fixture).');
}finally{await browser.close();}
