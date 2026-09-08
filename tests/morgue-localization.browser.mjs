import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {locales} from '../src/i18n/locales.ts';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
mkdirSync('output/morgue',{recursive:true});mkdirSync('docs/maps',{recursive:true});const reports=[];
try{for(const locale of locales){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(l=>{localStorage.setItem('night-shift-language-v1',l);localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:6}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));},locale);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5187')+'/?playtest=clinical-locales',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#start:enabled').waitFor();
 const catalog=JSON.parse(readFileSync(`game/locales/${locale==='zh-Hans'?'zh-CN':locale}.json`));
 for(const round of [6]){
  await page.locator(`[data-night="${round}"]`).click();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#file-title').textContent(),catalog[`stage.${round-1}`]);assert.equal(await page.locator('#file-note').textContent(),catalog[`note.${round-1}`]);
  const overflow=await page.evaluate(()=>['#file-title','#file-note','#stage-detail',...Array.from(document.querySelectorAll('[data-night]')).map((e)=>`[data-night="${e.dataset.night}"]`)].flatMap(sel=>{const e=document.querySelector(sel);return e.scrollWidth>e.clientWidth+2||(getComputedStyle(e).overflowY!=='visible'&&e.scrollHeight>e.clientHeight+2)?[{sel,w:e.scrollWidth,cw:e.clientWidth,h:e.scrollHeight,ch:e.clientHeight}]:[];}));assert.deepEqual(overflow,[],`${locale} round ${round}`);
  const visible=await page.locator('.archive-sheet').evaluate(e=>{const panel=e.getBoundingClientRect(),last=e.querySelector('#stage-detail'),range=document.createRange();range.selectNodeContents(last);return range.getBoundingClientRect().bottom<=panel.bottom+2;});assert.ok(visible,`${locale} record requires scrolling`);
  if(['zh-Hans','ar','my','de'].includes(locale))await page.screenshot({path:`output/morgue/${locale}-${round}-ledger.png`});
 }
 await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);assert.equal(await page.evaluate(()=>window.__nightshift().level.name),catalog['stage.5']);
 if(locale==='zh-Hans'){
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.paused=true;s.cameras.main.stopFollow();s.cameras.main.setZoom(.5);s.cameras.main.centerOn(640,404);s.lightImage.setVisible(false);});
  await page.locator('#game canvas').screenshot({path:'docs/maps/morgue-expanded.png'});
 }
 assert.deepEqual(errors,[]);reports.push({locale,rounds:[6],errors});await page.close();console.log('Clinical locales:',locale);
}writeFileSync('output/morgue/localization-report.json',JSON.stringify(reports,null,2)+'\n');}finally{await browser.close();}
