import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5174/?playtest=encounters');await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshift().tutorial.prompt==='move');await page.locator('#tutorial-continue').click();
 await page.keyboard.press('d',{delay:650});await page.waitForFunction(()=>window.__nightshift().tutorial.prompt==='health');assert.ok(await page.locator('#health-bar').evaluate(e=>e.classList.contains('tutorial-target')));
 const state=await page.evaluate(()=>window.__nightshift());await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.__nightshift())).elapsed,state.elapsed);assert.equal(await page.locator('.phase-hud').isVisible(),false);await page.screenshot({path:'/tmp/night-shift-health-tutorial.png'});
 await page.locator('#tutorial-continue').click();await page.waitForFunction(()=>window.__nightshift().tutorial.prompt==='flashlight');assert.ok(await page.locator('#flashlight-toggle').evaluate(e=>e.classList.contains('tutorial-target')));await page.screenshot({path:'/tmp/night-shift-flashlight-tutorial.png'});
 await page.locator('#tutorial-continue').click();assert.ok(!(await page.evaluate(()=>window.__nightshift())).tutorial.completed.includes('flashlight'));
 await page.keyboard.press('t');await page.waitForFunction(()=>!window.__nightshift().flashlightOn);const battery=(await page.evaluate(()=>window.__nightshift())).battery;await page.waitForTimeout(350);assert.equal((await page.evaluate(()=>window.__nightshift())).battery,battery);
 await page.locator('#flashlight-toggle').click();await page.waitForFunction(()=>window.__nightshift().tutorial.completed.includes('flashlight'));assert.ok((await page.evaluate(()=>window.__nightshift())).tutorial.completed.includes('health'));assert.deepEqual(errors,[]);
 console.log('Vitals tutorial: contextual sequence, correct highlights, frozen simulation, T off/click on practice and learned flags passed.');
}finally{await browser.close();}
