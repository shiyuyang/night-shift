import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {locales} from '../src/i18n/locales.ts';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const locale of (process.env.LOCALES?.split(',')??locales)){
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(l=>localStorage.setItem('night-shift-language-v1',l),locale);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=item-copy');await page.locator('#book-guide').click();await page.evaluate(()=>document.fonts.ready);
 const catalog=JSON.parse(readFileSync(`game/locales/${locale==='zh-Hans'?'zh-CN':locale}.json`));
 assert.equal(await page.locator('#guide-dialog p').nth(1).textContent(),catalog['guide.2']);
 assert.equal(await page.locator('#guide-dialog p').last().textContent(),catalog['guide.startingSupplies']);
 assert.ok((await page.locator('#guide-dialog').textContent()).includes(catalog['gameplay.listener-flash-interrupt']));
 assert.equal(await page.locator('#guide-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+2),false);
 await page.locator('#close-guide').click();await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.tutorial.show('monster-light-shy');s.sync();});
 await page.locator('#tutorial-card').waitFor({state:'visible'});
 assert.ok((await page.locator('#tutorial-copy').textContent()).includes(await page.evaluate(l=>new Intl.NumberFormat(l).format(2.5),locale)));
 assert.equal(await page.locator('#tutorial-copy').evaluate(e=>e.scrollWidth>e.clientWidth+2),false);
 assert.deepEqual(errors,[]);await page.close();console.log('Item guide locale passed:',locale);
}}finally{await browser.close();}
