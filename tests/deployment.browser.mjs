import {chromium} from '@playwright/test';
import {preview} from 'vite';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {deliveryFiles} from '../scripts/prepare-delivery.mjs';
const prefix=process.env.GAME_BASE_PATH||'/games/night-shift/';
const server=process.env.DEPLOY_URL?null:await preview({base:prefix,appType:'mpa',preview:{host:'127.0.0.1',port:0}});
const url=process.env.DEPLOY_URL||`http://127.0.0.1:${server.httpServer.address().port}${prefix}`;
const releaseFile=new URL('../deploy/r2-release.json',import.meta.url);
const assetBase=process.env.VITE_ASSET_BASE_URL||(process.env.DEPLOY_URL&&existsSync(releaseFile)?JSON.parse(readFileSync(releaseFile)).assetBaseUrl:url);
const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],bad=[],local=[];
 const fallback=process.env.TEST_MP3_FALLBACK==='1';
 const originRequests=[];
 if(process.env.TEST_NO_LINODE==='1')await page.route(/https?:\/\/(?:api\.liveinteractivegame\.com|139\.162\.147\.129)(?:\/|:)/,route=>{originRequests.push(route.request().url());return route.abort();});
 if(fallback)await page.route(/(?:\.ogg$|sfx-opus-.*\.bin$)/,route=>route.fulfill({status:200,contentType:'application/octet-stream',body:'unsupported audio fixture'}));
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if((r.url().startsWith(new URL(url).origin)||r.url().startsWith(assetBase))&&!new URL(r.url()).pathname.startsWith('/cdn-cgi/')){local.push(r.url());if(r.status()>=400)bad.push([r.status(),r.url()]);}});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#start:enabled').waitFor({timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#survey')?.dataset.loaded==='true');
 assert.equal(await page.locator('[data-command]').count(),0);
 assert.equal(await page.title(),'夜勤病棟');
 const brand=page.locator('.game-brand img');
 assert.equal(await brand.getAttribute('alt'),'夜勤病棟');
 assert.equal(await brand.getAttribute('src'),assetBase+'assets/yakin-byoutou-title-v4.webp');
 assert.ok(await brand.evaluate(image=>image.complete&&image.naturalWidth>0),'Title image must load');
 assert.equal(await page.locator('.desk-title p').textContent(),'今晚的病人，比名册上多一位。');
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.ui==='playing');
 await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent?.includes('已就绪'),null,{timeout:60000});
 console.log(fallback?'MP3 fallback playback ready':'Opus playback ready');
 await page.waitForTimeout(1500);await page.screenshot({path:'/tmp/night-shift-deployed.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 assert.ok(local.some(u=>u.endsWith('.ogg')));assert.ok(local.some(u=>u.includes('hospital-')&&u.endsWith('.webp')));
 assert.ok(local.some(u=>u.endsWith('.q95.webp')));
 assert.ok(!local.some(u=>u.endsWith('.png')));
 assert.equal(new Set(local.filter(u=>u.endsWith(fallback?'.mp3':'.ogg'))).size,9);
 assert.equal(new Set(local.filter(u=>u.includes(fallback?'sfx-mp3-':'sfx-opus-')&&u.endsWith('.bin'))).size,1);
 if(!fallback)assert.ok(!local.some(u=>u.endsWith('.mp3')), 'Normal playback should use Opus only');
 assert.ok(local.every(u=>u.startsWith(assetBase)||new URL(u).pathname.startsWith(prefix)),JSON.stringify(local));
 if(assetBase!==url)assert.ok(local.filter(u=>/\.(webp|ogg|mp3|bin|woff2)$/.test(u)).every(u=>u.startsWith(assetBase)),'All media and fonts must use R2');
 // Decode every published image, including archive scenes not selected on night one.
 const imagePaths=deliveryFiles().filter(p=>p.endsWith('.webp'));
 // CSS images may be in the browser cache from a no-CORS request. Make a fresh
 // CORS request for this additional canvas decode check.
 await page.evaluate(async urls=>{for(const url of urls){try{const response=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);const bitmap=await createImageBitmap(await response.blob());if(!bitmap.width||!bitmap.height)throw Error('empty image');bitmap.close();}catch(error){throw Error(url+': '+error);}}},imagePaths.map(p=>new URL(p,assetBase).href));
 for(const path of ['assets/watch-desk-v1.png','audio/menu-theme-v2.mp3','audio/menu-theme-v1.json']){
  assert.equal((await page.request.get(new URL(path,url).href)).status(),404,'Source/unused file was published: '+path);
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(bad,[]);
 assert.deepEqual(originRequests,[],'Game attempted to contact Linode/API');
 console.log('Deployment checks passed:',url,`— game start, 16 images, 9 music + 1 sound pack (${fallback?'MP3 fallback':'Opus'}), no source/unused files, correct asset origin.`);
}finally{await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));}
