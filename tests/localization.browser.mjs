import {chromium} from '@playwright/test';import {createServer} from 'vite';import assert from 'node:assert/strict';import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const server=process.env.I18N_URL?null:await createServer({server:{host:'127.0.0.1',port:0}});if(server)await server.listen();const url=process.env.I18N_URL??`http://127.0.0.1:${server.httpServer.address().port}/`;
const executablePath=['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);const browser=await chromium.launch({executablePath,headless:true});const result=[];mkdirSync('output/localization',{recursive:true});
try{for(const locale of (process.env.I18N_LOCALES?.split(',')??['en','zh-Hans','zh-Hant','ja','de','ar','he','th','my','vi'])){
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(l=>{localStorage.setItem('night-shift-language-v1',l);localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:3}));},locale);await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#start:enabled').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('html').getAttribute('lang'),locale);assert.equal(await page.locator('html').getAttribute('dir'),['ar','he'].includes(locale)?'rtl':'ltr');
 const label=await page.locator('#start').textContent();assert.ok(label?.trim());const expected=JSON.parse(readFileSync('game/locales/'+(locale==='zh-Hans'?'zh-CN':locale)+'.json'));assert.equal(label,expected['menu.start'],locale+' must load its own catalog');
 const measure=()=>page.evaluate(()=>{const selectors=['#start','#file-title','#file-date','#file-note','#stage-detail','.book-tabs','.desk-footnote'];return selectors.map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {selector,width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+2};});});
 const attachment=await page.evaluate(()=>{const tabs=document.querySelector('.book-tabs').getBoundingClientRect(),book=document.querySelector('.patrol-book').getBoundingClientRect();if(tabs.right>book.right+1||tabs.left<book.left-1)throw new Error('Tabs extend beyond book');return tabs.bottom-book.top;});assert.ok(attachment>=0&&attachment<24,locale+' tabs must overlap the book edge');
 const assertCover=async()=>{
  const geometry=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();const brand=document.querySelector('.game-brand img');
   return {bodyBottom:rect('.archive-sheet').bottom,buttonTop:rect('#start').top,buttonBottom:rect('#start').bottom,rule:rect('.book-footer').bottom,brandLoaded:brand.complete&&brand.naturalWidth>0,brandOpacity:getComputedStyle(brand).opacity};
  });
  assert.ok(geometry.buttonTop>geometry.bodyBottom,locale+' action must not overlap record');
  assert.ok(geometry.buttonBottom<geometry.rule,locale+' action must stay above rule');
  const stamp=await page.locator('.file-stamp').evaluate(e=>({ratio:e.offsetWidth/e.offsetHeight,overflow:e.scrollWidth>e.clientWidth+1}));
  assert.ok(Math.abs(stamp.ratio-3)<.01,locale+' stamp die must preserve 3:1 ratio');
  assert.ok(!stamp.overflow,locale+' stamp label must fit its die');
  const clipped=await page.evaluate(()=>['.archive-sheet'].filter(s=>{const e=document.querySelector(s);return e.scrollHeight>e.clientHeight+2;}));
  assert.deepEqual(clipped,[],locale+' records must fit without scrolling or clipping');
  assert.ok(geometry.brandLoaded&&Number(geometry.brandOpacity)>0,locale+' wordmark must render directly');
 };
 assert.equal(await page.locator('#stage-list button').count(),7);
 assert.ok(await page.locator('#stage-list button').evaluateAll(rows=>rows.every(row=>getComputedStyle(row).height==='48px')));
 const indexFits=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#stage-list button')];return rows.at(-1).getBoundingClientRect().bottom<=document.querySelector('.stage-pages').getBoundingClientRect().top&&rows.every(row=>[...row.querySelectorAll('b,small')].every(text=>text.scrollWidth<=text.clientWidth+1&&text.getBoundingClientRect().bottom<=row.getBoundingClientRect().bottom+1));});
 assert.ok(indexFits,locale+' seven chapter rows must fit above pagination');
 await assertCover();
 for(let stage=0;stage<3;stage++){await page.locator('#stage-list button').nth(stage).click();await assertCover();assert.ok(await page.locator('.file-stamp').evaluate(e=>{const s=getComputedStyle(e);return s.color==='rgb(141, 68, 73)'&&s.borderTopWidth==='0px'&&s.boxShadow==='none'}),'Status seal must stay red without a rectangular border');}
 await page.locator('#stage-list button').first().click();
 const metrics=await measure();assert.deepEqual(metrics.filter(m=>m.overflow),[],locale+' horizontal clipping');await page.screenshot({path:`output/localization/${locale}.png`});
 await page.locator('#book-guide').click();assert.ok(await page.locator('#guide-dialog').evaluate(e=>e.open));await page.locator('#close-guide').click();
 await page.locator('#desk-settings').click();await page.locator('#resume').click();assert.ok(await page.locator('#pause-menu').evaluate(e=>e.hidden));
 for(const viewport of [{width:540,height:960},{width:1920,height:800}]){await page.setViewportSize(viewport);await page.waitForTimeout(80);const ratio=await page.locator('#start-layer').evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height;});assert.ok(Math.abs(ratio-16/9)<.001);}
 await page.setViewportSize({width:1280,height:720});await page.locator('#start').click();await page.locator('#start-layer.hidden').waitFor({state:'attached'});await page.waitForTimeout(600);assert.equal(await page.locator('html').getAttribute('lang'),locale);await page.screenshot({path:`output/localization/${locale}-game.png`});assert.deepEqual(errors,[]);result.push({locale,label,metrics});await page.close();console.log('Verified',locale);
}writeFileSync('output/localization/browser-report.json',JSON.stringify(result,null,2));}finally{await browser.close();if(server)await server.close();}
