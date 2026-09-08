import {chromium} from '@playwright/test';
import {preview} from 'vite';
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const prefix=process.env.GAME_BASE_PATH||'/night-shift/';
const server=process.env.DEPLOY_URL?null:await preview({base:prefix,appType:'mpa',preview:{host:'127.0.0.1',port:0}});
const url=process.env.DEPLOY_URL||`http://127.0.0.1:${server.httpServer.address().port}${prefix}`;
const assetBase=process.env.VITE_ASSET_BASE_URL||JSON.parse(readFileSync(new URL('../deploy/r2-release.json',import.meta.url))).assetBaseUrl;
const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome-stable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1440,height:900}});
 const fixture=url+'__image_cache_fixture';
 await page.route(fixture,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Cache fixture</title>'}));
 await page.goto(fixture);
 await page.unroute(fixture);
 // Deliberately keep the real browser cache enabled. R2's no-Origin response
 // has no ACAO header and must not poison later CORS image/canvas requests.
 const paths=['yakin-byoutou-title-v4.webp','archive-ward-v1.q95.webp'];
 await page.evaluate(async urls=>{for(const url of urls)await new Promise((resolve,reject)=>{
  const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Cache priming failed: '+url));image.src=url;document.body.append(image);
 });},paths.map(p=>assetBase+'assets/'+p));
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.game-brand img')?.naturalWidth>0&&document.querySelector('#survey')?.dataset.loaded==='true',null,{timeout:60000});
 const pixels=await page.locator('#survey').evaluate(canvas=>{
  const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return colors.size;
 });
 assert.ok(pixels>100,'Archive canvas must contain the photograph, not a blank fill or error label');
 assert.ok(await page.locator('.game-brand img').getAttribute('src').then(src=>src.endsWith('?cors=anonymous')));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:process.env.DEPLOY_URL?'/tmp/night-shift-cache-production.png':'/tmp/night-shift-cache-local.png'});
 console.log('Warm-cache checks passed:',url,'— title decoded, archive photograph rendered and readable, no CORS errors');
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
