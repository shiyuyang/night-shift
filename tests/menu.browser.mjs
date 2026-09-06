import {chromium} from '@playwright/test';
import {preview} from 'vite';
import assert from 'node:assert/strict';
const server=await preview({base:'/games/night-shift/',preview:{host:'127.0.0.1',port:0}});
const url=`http://127.0.0.1:${server.httpServer.address().port}/games/night-shift/`;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,height] of [[1440,900],[1920,1080],[390,844],[1024,600]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:8})));
 await page.goto(url);await page.locator('#start:enabled').waitFor();await page.waitForFunction(()=>document.querySelector('#survey').dataset.loaded==='true');
 for(const locale of ['zh-CN','en']){
 await page.locator('#menu-language').selectOption(locale);assert.equal(await page.locator('html').getAttribute('lang'),locale);
 await page.locator('#stage-prev').click();await page.locator('[data-night="2"]').click();
 assert.equal(await page.locator('#file-title').textContent(),locale==='en'?'Medical Stores':'药品仓库');
 await page.locator('#stage-next').click();assert.equal(await page.locator('[data-night="9"]').isDisabled(),true);
 await page.locator('#start-layer').evaluate(el=>el.scrollTop=0);await page.waitForTimeout(350);await page.screenshot({path:`/tmp/night-shift-journal-${locale}-${width}.png`});
 const overflow=await page.locator('.patrol-book').evaluate(el=>el.scrollWidth>el.clientWidth+3);assert.equal(overflow,false,`${locale} ${width}`);
 await page.locator('#book-guide').click();assert.equal(await page.locator('#guide-dialog').evaluate(el=>el.open),true);await page.locator('#close-guide').click();
 await page.locator('#desk-settings').click();assert.equal(await page.locator('#pause-menu').isVisible(),true);await page.locator('#resume').click();
 }
 await page.reload();await page.locator('#start:enabled').waitFor();assert.equal(await page.locator('#menu-language').inputValue(),'en');assert.equal(await page.locator('.desk-title h2').textContent(),'NIGHT SHIFT');
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.ui==='playing');assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Journal menu: both languages, persistence, stage locks, guide/settings, signing and four viewports passed.');
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
