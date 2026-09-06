import {chromium} from '@playwright/test';
import {preview} from 'vite';
import assert from 'node:assert/strict';
const prefix='/games/night-shift/';
const server=process.env.DEPLOY_URL?null:await preview({base:prefix,preview:{host:'127.0.0.1',port:0}});
const url=process.env.DEPLOY_URL||`http://127.0.0.1:${server.httpServer.address().port}${prefix}`;
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],bad=[],local=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(new URL(url).origin)){local.push(r.url());if(r.status()>=400)bad.push([r.status(),r.url()]);}});
 await page.goto(url);await page.locator('#start:enabled').waitFor({timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#survey')?.dataset.loaded==='true');
 assert.equal(await page.locator('[data-command]').count(),0);
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.ui==='playing');
 await page.waitForFunction(()=>document.querySelector('#music-status')?.textContent?.includes('已就绪'),null,{timeout:60000}).catch(async()=>{
  const s=await page.locator('#music-status').textContent();assert.ok(s.includes('ElevenLabs')&&!s.includes('失败'),s);
 });
 await page.waitForTimeout(1500);await page.screenshot({path:'/tmp/night-shift-deployed.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 assert.ok(local.some(u=>u.endsWith('.opus')));assert.ok(local.some(u=>u.includes('hospital-')&&u.endsWith('.webp')));
 assert.ok(local.every(u=>new URL(u).pathname.startsWith(prefix)),JSON.stringify(local.filter(u=>!new URL(u).pathname.startsWith(prefix))));
 console.log('Deployment checks passed:',url,'— game start, pixel assets, audio, no debug controls, all local requests scoped.');
}finally{await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));}
