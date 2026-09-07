import {chromium} from '@playwright/test';
import {existsSync,writeFileSync} from 'node:fs';
const url=process.env.DEPLOY_URL||'https://games.liveinteractivegame.com/night-shift/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync),headless:true});
const runs=[];
try{for(let i=0;i<Number(process.env.RUNS||5)+Number(process.env.WARMUP||0);i++){
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),requests=[],errors=[];
 if(process.env.ISOLATE_GAME==='1'){
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({contentType:'application/javascript',body:''}));
 }
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');const entries=new Map();
 cdp.on('Network.responseReceived',e=>{if(e.response.url.startsWith('http'))entries.set(e.requestId,{url:e.response.url,status:e.response.status,cache:e.response.headers['cf-cache-status'],ray:e.response.headers['cf-ray'],disk:e.response.fromDiskCache,bytes:0});});
 cdp.on('Network.loadingFinished',e=>{if(entries.has(e.requestId))entries.get(e.requestId).bytes=e.encodedDataLength;});
 page.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 const started=performance.now();await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#start:enabled').waitFor({timeout:90000});await page.waitForFunction(()=>document.querySelector('#survey')?.dataset.loaded==='true',null,{timeout:90000});
 const menuMs=performance.now()-started;await page.locator('#start').click();const audioStart=performance.now();
 await page.waitForFunction(()=>document.body.dataset.ui==='playing'&&document.querySelector('#music-status')?.textContent?.includes('已就绪'),null,{timeout:90000});
 const audioMs=performance.now()-audioStart,totalMs=performance.now()-started;
 const media=[...entries.values()].filter(x=>/\.(webp|opus|ogg|mp3|bin|woff2)(?:\?|$)/.test(x.url));
 const row={warmup:i<Number(process.env.WARMUP||0),menuMs,audioMs,totalMs,httpRequests:requests.length,gameRequests:requests.filter(u=>u.includes('/games/night-shift/')||u.includes('night-shift-assets.liveinteractivegame.com')).length,mediaRequests:media.length,mediaTransferBytes:media.reduce((n,x)=>n+x.bytes,0),errors,media};runs.push(row);
 console.log(JSON.stringify({run:i+1,menuMs:Math.round(menuMs),audioMs:Math.round(audioMs),totalMs:Math.round(totalMs),gameRequests:row.gameRequests,errors}));await context.close();
}}finally{writeFileSync(process.env.OUTPUT||'/tmp/night-shift-r2/benchmark.json',JSON.stringify({url,isolated:process.env.ISOLATE_GAME==='1',runs},null,2));await browser.close();}
