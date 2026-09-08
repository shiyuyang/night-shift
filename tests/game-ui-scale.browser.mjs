import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
mkdirSync('output/localization',{recursive:true});const report=[];
try{for(const locale of ['zh-Hans','de','ar']){
 const page=await browser.newPage({viewport:{width:1280,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(l=>localStorage.setItem('night-shift-language-v1',l),locale);
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('#start:enabled').click();await page.locator('#tutorial-card:not([hidden])').waitFor();await page.evaluate(()=>document.fonts.ready);
 let baseline;
 for(const [width,height] of [[1280,768],[640,384],[390,844],[320,240]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const state=await page.evaluate(()=>{const host=document.querySelector('#game-wrap'),scale=parseFloat(getComputedStyle(host).getPropertyValue('--game-ui-scale'));const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};const sels=['#play-hud','.game-overlay-stage','#tutorial-title','#tutorial-continue','#flashlight-toggle','#health-bar'];return {scale,canvas:rect(document.querySelector('#game canvas')),boxes:Object.fromEntries(sels.map(s=>[s,rect(document.querySelector(s))]))};});
  const hud=state.boxes['#play-hud'];for(const k of ['x','y','width','height'])assert.ok(Math.abs(hud[k]-state.canvas[k])<2,locale+' HUD/canvas '+k);
  const normalized=Object.fromEntries(Object.entries(state.boxes).map(([s,r])=>[s,{width:r.width/state.scale,height:r.height/state.scale}]));
  if(!baseline)baseline=normalized;else for(const s of Object.keys(normalized))for(const k of ['width','height'])assert.ok(Math.abs(normalized[s][k]-baseline[s][k])<2,`${locale} ${width} ${s} ${k} must scale with canvas`);
  await page.screenshot({path:`output/localization/scaling-${locale}-${width}.png`});report.push({locale,width,height,...state});
 }
 await page.locator('#tutorial-skip').click();await page.locator('#pause').click();await page.locator('#resume').click();assert.ok(await page.locator('#pause-menu').evaluate(e=>e.hidden));assert.deepEqual(errors,[]);await page.close();console.log('Proportional UI verified',locale);
}writeFileSync('output/localization/scaling-report.json',JSON.stringify(report,null,2));}finally{await browser.close();await server.close();}
