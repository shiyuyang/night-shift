import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
mkdirSync('output/localization',{recursive:true});const report=[];
try{for(const locale of ['zh-Hans','de','ar','he','my']){
 const page=await browser.newPage({viewport:{width:1280,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(l=>localStorage.setItem('night-shift-language-v1',l),locale);
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?playtest=ui-scale`,{waitUntil:'domcontentloaded'});await page.locator('#start:enabled').click();await page.locator('#tutorial-card:not([hidden])').waitFor();await page.evaluate(()=>document.fonts.ready);
 let baseline;
 for(const [width,height] of [[1280,768],[640,384],[390,844],[320,240]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const state=await page.evaluate(()=>{const host=document.querySelector('#game-wrap'),scale=parseFloat(getComputedStyle(host).getPropertyValue('--game-ui-scale'));const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};const sels=['#play-hud','.game-overlay-stage','#tutorial-title','#tutorial-continue','#flashlight-toggle','#health-bar'];return {scale,canvas:rect(document.querySelector('#game canvas')),boxes:Object.fromEntries(sels.map(s=>[s,rect(document.querySelector(s))]))};});
  const hud=state.boxes['#play-hud'];for(const k of ['x','y','width','height'])assert.ok(Math.abs(hud[k]-state.canvas[k])<2,locale+' HUD/canvas '+k);
  const normalized=Object.fromEntries(Object.entries(state.boxes).map(([s,r])=>[s,{width:r.width/state.scale,height:r.height/state.scale}]));
  if(!baseline)baseline=normalized;else for(const s of Object.keys(normalized))for(const k of ['width','height'])assert.ok(Math.abs(normalized[s][k]-baseline[s][k])<2,`${locale} ${width} ${s} ${k} must scale with canvas`);
  await page.screenshot({path:`output/localization/scaling-${locale}-${width}.png`});report.push({locale,width,height,...state});
 }
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.setPaused(true);const entry=kind=>({kind,viewer:'Viewer',userId:kind,count:2,key:kind});s.gifts.notice={...entry('warp'),serial:1,status:'queued',value:0};s.gifts.active={entry:entry('failure'),remaining:8};s.gifts.shade=20;s.gifts.shadeOwner=entry('shade');s.gifts.queue=[entry('failure'),entry('warp'),entry('failure')];s.batteryReserve=125;s.sync();});
 let giftBaseline;
 for(const [width,height] of [[1280,768],[640,384],[390,844],[320,240],[2560,1440]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.evaluate(async()=>{window.__nightshiftScene.showGifts();await Promise.all(document.querySelector('.gift-receipt').getAnimations().map(a=>a.finished));});
  const state=await page.evaluate(()=>{const c=document.querySelector('#game canvas').getBoundingClientRect(),scale=c.width/1280;const sels=['.gift-overlay-stage','.gift-receipt','.gift-live','.gift-wait'];return Object.fromEntries(sels.map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:(r.x-c.x)/scale,y:(r.y-c.y)/scale,width:r.width/scale,height:r.height/scale}];}));});
  const stage=state['.gift-overlay-stage'];for(const [key,value] of Object.entries({x:0,y:0,width:1280,height:768}))assert.ok(Math.abs(stage[key]-value)<2,locale+' gift stage '+key);
  assert.ok(Math.abs(state['.gift-receipt'].x-22)<2,locale+' gift slot stays below health, away from right HUD');
  for(const [selector,r] of Object.entries(state)){assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.width<=1281&&r.y+r.height<=769,`${locale} ${width} ${selector} inside game`);}
  if(!giftBaseline)giftBaseline=state;else for(const selector of Object.keys(state))for(const key of ['x','y','width','height'])assert.ok(Math.abs(state[selector][key]-giftBaseline[selector][key])<2,`${locale} ${width} ${selector} ${key} scales with game`);
  report.push({locale,width,height,gifts:state});await page.screenshot({path:`output/localization/scaling-gifts-${locale}-${width}.png`});
 }
 await page.evaluate(()=>window.__nightshiftScene.setPaused(false));
 await page.locator('#pause').click();await page.locator('#resume').click();assert.ok(await page.locator('#pause-menu').evaluate(e=>e.hidden));assert.deepEqual(errors,[]);await page.close();console.log('Proportional UI verified',locale);
}writeFileSync('output/localization/scaling-report.json',JSON.stringify(report,null,2));}finally{await browser.close();await server.close();}
