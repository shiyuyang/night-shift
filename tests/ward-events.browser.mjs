import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';
import {overlaps} from '../src/collision.ts';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({locale:'zh-CN',viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const use=async()=>{await page.keyboard.press('e',{delay:80});await page.waitForTimeout(180);};
try{
 await page.goto(process.env.BASE_URL||'http://localhost:5174');await page.locator('#start:enabled').click();
 await goTo(page,113,446);await use();assert.equal(await page.locator('#monitor-dialog').isVisible(),true);const normal=await page.locator('#monitor-feed').getAttribute('src');assert.equal((await snapshot(page)).wardEvents.extraBed,false);await page.locator('#monitor-close').click();
 await goTo(page,239,233);await use();assert.equal((await snapshot(page)).wardEvents.bell,'isolation');
 await goTo(page,113,446);await use();assert.notEqual(await page.locator('#monitor-feed').getAttribute('src'),normal);assert.equal((await snapshot(page)).wardEvents.extraBed,true);await page.locator('#acknowledge-call').click();const before=await snapshot(page);await page.waitForTimeout(2200);const after=await snapshot(page);assert.equal(after.elapsed,before.elapsed);assert.equal(after.wardEvents.bell,'waiting');await page.screenshot({path:'/tmp/night-shift-monitor-anomaly.png'});await page.keyboard.press('Escape');await page.waitForTimeout(2300);assert.equal((await snapshot(page)).wardEvents.bell,'west');
 await goTo(page,110,239);await use();assert.equal((await snapshot(page)).wardEvents.bell,'finished');assert.equal((await snapshot(page)).wardEvents.monitorWitnessed,true);
 await goTo(page,296,240);await use();assert.match(await page.locator('#game-message').textContent(),/工号 07/);assert.equal((await snapshot(page)).wardEvents.badgeRead,true);await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');const blocked=await snapshot(page);assert.equal(blocked.solids.some(b=>overlaps(blocked.feet,b)),false);await page.screenshot({path:'/tmp/night-shift-seventh-bed.png'});
 await goTo(page,458,323);assert.equal((await snapshot(page)).wardEvents.extraBed,false);assert.equal((await snapshot(page)).wardEvents.wheelMarks,true);
 await page.locator('#console-toggle').click();await page.locator('[data-command="sanctuary"]').click();await goTo(page,609,415);await use();await goTo(page,848,235);await use();await goTo(page,890,323);await use();assert.equal(await page.locator('#result-title').textContent(),'你活过了这一夜。');await page.locator('#result-retry').click();assert.equal((await snapshot(page)).wardEvents.monitorWitnessed,false);assert.equal((await snapshot(page)).wardEvents.extraBed,false);assert.deepEqual(errors,[]);console.log('Ward story passed: normal/anomalous monitor, paused inspection, bell transfer and silence, seventh bed collision and badge, disappearance with traces, escape and reset.');
}finally{await browser.close();}
