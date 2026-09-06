import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';
import {overlaps} from '../src/collision.ts';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.BASE_URL || 'http://localhost:5174';
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
await page.goto(base);
await page.locator('canvas').waitFor();await page.waitForTimeout(1200);
await page.screenshot({path:'/tmp/night-shift-desktop.png',fullPage:true});
await page.locator('#enter-terminal').click();await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent==='配乐已就绪');assert.equal(await page.locator('#timer').textContent(),'00:00');await page.locator('#start').click();await page.waitForTimeout(1000);
await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent==='配乐已就绪');
await page.screenshot({path:'/tmp/night-shift-play-v3.png',fullPage:true});
assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/audio/')&&e.name.endsWith('.mp3')).length),2);
const alpha=await page.evaluate(async()=>{const im=new Image();im.src='/assets/patient-sheet-v4.png';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let empty=0,solid=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)empty++;if(data[i]>200)solid++;}return {empty,solid};});assert.ok(alpha.empty>100000&&alpha.solid>50000);

assert.equal(await page.locator('#start-layer').evaluate(el=>el.classList.contains('hidden')),true);
await page.locator('#console-toggle').click();
for(const command of ['battery','blackout','sanctuary','ghost']){await page.locator(`[data-command="${command}"]`).click();await page.waitForTimeout(100);}
assert.equal(await page.locator('#event-count').textContent(),'4 EVENTS');
const response=await page.request.post(`${base}/api/webhook`,{data:{id:`browser-${process.pid}`,command:'battery',viewer:'Webhook 检查'}});
assert.equal(response.status(),200);await page.waitForTimeout(200);assert.match(await page.locator('#event-log').textContent(),/Webhook 检查/);
const duplicate=await page.request.post(`${base}/api/webhook`,{data:{id:`browser-${process.pid}`,command:'battery'}});assert.equal((await duplicate.json()).status,'duplicate');
assert.equal(await page.locator('#event-count').textContent(),'5 EVENTS');
const invalid=await page.request.post(`${base}/api/webhook`,{data:{id:'bad',command:'execute'}});assert.equal(invalid.status(),400);
await page.locator('#pause').click();const timer=await page.locator('#timer').textContent();await page.waitForTimeout(1200);assert.equal(await page.locator('#timer').textContent(),timer);
await page.locator('#pause').click();
await page.locator('#settings-nav').click();assert.equal(await page.locator('#connection-panel').isVisible(),true);
await page.locator('#guide').click();assert.equal(await page.locator('#guide-dialog').isVisible(),true);await page.locator('.close-guide').click();
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await page.screenshot({path:'/tmp/night-shift-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
await page.setViewportSize({width:1440,height:1100});
await page.reload();await page.locator('canvas').waitFor();await page.waitForTimeout(500);await page.locator('#start').click();
async function move(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
await goTo(page,239,233);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(200);await page.screenshot({path:'/tmp/night-shift-movement.png'});assert.equal(await page.locator('#fuses').textContent(),'1 / 3');await page.waitForFunction(()=>window.__nightshift().scareVisible,{},{timeout:4000});assert.equal((await snapshot(page)).scareCount,1);assert.equal((await snapshot(page)).health,100);await page.screenshot({path:'/tmp/night-shift-scare.png'});await page.waitForFunction(()=>!window.__nightshift().scareVisible);
await goTo(page,609,415);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(200);assert.equal(await page.locator('#fuses').textContent(),'2 / 3');
await goTo(page,848,235);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(200);assert.equal(await page.locator('#fuses').textContent(),'3 / 3');
await goTo(page,890,323);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(200);assert.equal(await page.locator('#result-title').textContent(),'你活过了这一夜。');
assert.equal(await page.locator('#run-result').isVisible(),true);assert.equal(await page.locator('#next-night').isVisible(),true);assert.equal(await page.locator('#start-layer').evaluate(el=>el.classList.contains('hidden')),true);await page.locator('#result-retry').click();await goTo(page,223,245);await move('w',750);const blocked=await snapshot(page);assert.equal(blocked.solids.some(b=>overlaps(blocked.feet,b)),false);assert.ok(blocked.player.y>216,'South bed edge must stop feet');await page.waitForTimeout(80);assert.equal((await snapshot(page)).moving,false);
await goTo(page,184,182);await goTo(page,223,120);await move('s',600);const north=await snapshot(page);assert.equal(north.solids.some(b=>overlaps(north.feet,b)),false);assert.ok(north.feet.y+north.feet.height<=143,'North bed edge must stop feet');await page.screenshot({path:'/tmp/night-shift-collision-v4.png',fullPage:true});
await page.reload();await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent==='配乐已就绪');
await page.locator('#console-toggle').click();await page.locator('[data-command="ghost"]').click();
await page.waitForFunction(()=>Number(document.querySelector('#threat-screen').style.opacity)>.4,{},{timeout:15000});
await page.waitForFunction(()=>Number(document.querySelector('#health').textContent)<100,{},{timeout:10000});
assert.equal(await page.locator('#flash').evaluate(el=>el.classList.contains('hit')),true);await page.screenshot({path:'/tmp/night-shift-attack.png'});
await page.locator('#sound').click();assert.match(await page.locator('#sound').textContent(),/关闭/);
await page.locator('#pause').click();await page.waitForTimeout(250);assert.equal(await page.locator('#threat-screen').evaluate(el=>Number(el.style.opacity)),0);
await page.locator('#pause').click();await page.waitForFunction(()=>!document.querySelector('#result-screen').hidden,{},{timeout:25000});assert.equal(await page.locator('#result-title').textContent(),'巡逻信号已中断。');assert.equal(await page.locator('#start-layer').evaluate(el=>el.classList.contains('hidden')),true);await page.waitForTimeout(1300);await page.screenshot({path:'/tmp/night-shift-death-report.png'});await page.locator('#result-menu').click();assert.equal(await page.locator('#result-screen').isVisible(),false);assert.equal(await page.locator('#start-layer').evaluate(el=>el.classList.contains('hidden')),false);
assert.deepEqual(errors,[]);console.log('Browser checks passed: render, start, four commands, webhook/SSE, deduplication, invalid input, pause, settings, guide, mobile width, keyboard movement, all three fuses and successful escape; local generated music decoding and transparent character atlas; no page errors.');} finally {await browser.close();}
