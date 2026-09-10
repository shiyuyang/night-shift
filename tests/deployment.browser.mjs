import {chromium} from '@playwright/test';
import {preview} from 'vite';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {deliveryFiles} from '../scripts/prepare-delivery.mjs';
const musicCount=JSON.parse(readFileSync(new URL('../game/music.json',import.meta.url))).length;
const prefix=process.env.GAME_BASE_PATH||'/games/night-shift/';
const networkTimeout=Math.max(60000,Number(process.env.TEST_NETWORK_TIMEOUT_MS)||60000);
const server=process.env.DEPLOY_URL?null:await preview({base:prefix,appType:'mpa',preview:{host:'127.0.0.1',port:0}});
const url=process.env.DEPLOY_URL||`http://127.0.0.1:${server.httpServer.address().port}${prefix}`;
const releaseFile=new URL('../deploy/r2-release.json',import.meta.url);
const assetBase=process.env.VITE_ASSET_BASE_URL||(process.env.DEPLOY_URL&&existsSync(releaseFile)?JSON.parse(readFileSync(releaseFile)).assetBaseUrl:url);
const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1440,height:900}});const errors=[],bad=[],local=[];
 // Explicit test-only permission for development proxies using private/Fake-IP DNS.
 if(process.env.TEST_ALLOW_LOCAL_NETWORK==='1')await page.context().grantPermissions(['local-network-access'],{origin:new URL(url).origin});
 const originRequests=[];
 // Exercise uncached delivery, including every cross-origin response body.
 const network=await page.context().newCDPSession(page);
 await network.send('Network.enable');
 await network.send('Network.setCacheDisabled',{cacheDisabled:true});
 if(process.env.TEST_NO_LINODE==='1')await page.route(/https?:\/\/(?:api\.liveinteractivegame\.com|139\.162\.147\.129)(?:\/|:)/,route=>{originRequests.push(route.request().url());return route.abort();});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if((r.url().startsWith(new URL(url).origin)||r.url().startsWith(assetBase))&&!new URL(r.url()).pathname.startsWith('/cdn-cgi/')){local.push(r.url());if(r.status()>=400)bad.push([r.status(),r.url()]);}});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:networkTimeout});await page.locator('#start:enabled').waitFor({timeout:networkTimeout});
 await page.waitForFunction(()=>document.querySelector('#survey')?.dataset.loaded==='true');
 assert.equal(await page.locator('#stage-list button').count(),7);
 assert.equal(await page.locator('[data-command]').count(),0);
 assert.equal(await page.title(),'夜勤病棟');
 const brand=page.locator('.game-brand img');
 assert.equal(await brand.getAttribute('alt'),'夜勤病棟');
 assert.equal(new URL(await brand.getAttribute('src'),url).href,assetBase+'assets/yakin-byoutou-title-alpha-v1.webp?cors=anonymous');
 assert.ok(await brand.evaluate(image=>image.complete&&image.naturalWidth>0),'Title image must load');
 assert.equal(await page.locator('.desk-title p').textContent(),'今晚的病人，比名册上多一位。');
 // Verify the cover's lamp actually changes opacity.
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.desk-lamp-falloff')).opacity)>.1,null,{timeout:25000,polling:'raf'});
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.desk-lamp-falloff')).opacity)===0);
 assert.equal(await page.locator('#start').textContent(),'开始巡查 →');
 assert.equal(await page.locator('.survey-frame span').textContent(),'封楼前留影');
 await page.evaluate(()=>document.fonts.ready);
 assert.ok(await page.evaluate(()=>document.fonts.check('17px PhotoNote','封楼前留影待巡查已巡查开始巡查')));
 assert.ok(await page.locator('.file-stamp').evaluate(e=>getComputedStyle(e,'::after').backgroundImage.includes('hospital-seal-oval-v1.webp')),'The document must use the oval seal');
 // The menu keeps one composition across wide and portrait windows.
 const geometry=()=>page.evaluate(()=>{
  const stage=document.querySelector('#start-layer').getBoundingClientRect();
  const book=document.querySelector('.patrol-book').getBoundingClientRect();
  return {ratio:stage.width/stage.height,x:(book.x-stage.x)/stage.width,y:(book.y-stage.y)/stage.height,width:book.width/stage.width};
 });
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const baseline=await geometry();
 for(const viewport of [{width:900,height:900},{width:540,height:960},{width:1920,height:800}]){
  await page.setViewportSize(viewport);
  await page.waitForTimeout(100);
  const current=await geometry();
  assert.ok(Math.abs(current.ratio-16/9)<.001);
  for(const key of ['x','y','width'])assert.ok(Math.abs(current[key]-baseline[key])<.002,`Menu composition changed: ${key} ${JSON.stringify({baseline,current,viewport})}`);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.ui==='playing');
 await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent?.includes('已就绪'),null,{timeout:60000});
 console.log('Opus playback ready');
 await page.waitForTimeout(1500);await page.screenshot({path:'/tmp/night-shift-deployed.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 assert.ok(local.some(u=>u.endsWith('.ogg')));assert.ok(local.some(u=>u.includes('hospital-')&&u.endsWith('.webp')));
 assert.ok(local.some(u=>new URL(u).pathname.endsWith('.q95.webp')));
 assert.ok(!local.some(u=>new URL(u).pathname.endsWith('.png')));
 assert.equal(new Set(local.filter(u=>u.endsWith('.ogg'))).size,musicCount);
 assert.equal(new Set(local.filter(u=>u.includes('sfx-opus-')&&u.endsWith('.bin'))).size,1);
 assert.ok(!local.some(u=>u.endsWith('.mp3')), 'Normal playback should use Opus only');
 assert.ok(local.every(u=>u.startsWith(assetBase)||new URL(u).pathname.startsWith(prefix)),JSON.stringify(local));
 if(assetBase!==url)assert.ok(local.filter(u=>/\.(webp|ogg|mp3|bin|woff2)$/.test(new URL(u).pathname)).every(u=>u.startsWith(assetBase)),'All media and fonts must use R2');
 // Decode every published image, including archive scenes not selected on night one.
 const imagePaths=deliveryFiles().filter(p=>p.endsWith('.webp'));
 // CSS images may be in the browser cache from a no-CORS request. Make a fresh
 // CORS request for this additional canvas decode check.
 if(process.env.VERIFY_R2==='1')await page.evaluate(async urls=>{for(const url of urls){try{const response=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);const bitmap=await createImageBitmap(await response.blob());if(!bitmap.width||!bitmap.height)throw Error('empty image');bitmap.close();}catch(error){throw Error(url+': '+error);}}},imagePaths.map(p=>new URL(p,assetBase).href));
 for(const path of ['assets/watch-desk-v1.png','audio/menu-theme-v2.mp3','audio/menu-theme-v1.json']){
  assert.equal((await page.request.get(new URL(path,url).href)).status(),404,'Source/unused file was published: '+path);
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(bad,[]);
 assert.deepEqual(originRequests,[],'Game attempted to contact Linode/API');
 console.log('Deployment checks passed:',url,`— game start, ${process.env.VERIFY_R2==='1'?imagePaths.length+' images verified':'bulk R2 verification skipped'}, ${musicCount} music + 1 sound pack (${'Opus'}), no source/unused files, correct asset origin.`);
}finally{await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));}
