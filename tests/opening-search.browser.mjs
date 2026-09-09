import {chromium} from '@playwright/test';
import {existsSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});
mkdirSync('output/opening-search',{recursive:true});
try{
 for(const round of [1,2,6]){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=opening-search');
  await page.locator('#start:enabled').waitFor();await page.locator(`[data-night="${round}"]`).click();await page.locator('#start').click();
  await page.waitForFunction(n=>window.__nightshiftScene?.active&&window.__nightshift().night===n,round);
  // Isolate placement and interaction from combat; navigation remains real input.
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.skip();window.__searchAid=setInterval(()=>{if(s.active&&!s.paused)s.command('sanctuary','world');},2000);});
  const initial=await snapshot(page),l=initial.level;
  await page.screenshot({path:`output/opening-search/night-${round}-entry.png`});
  await goTo(page,l.key.x,l.key.y,25);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(150);
  assert.equal((await snapshot(page)).key,true);
  await goTo(page,l.boxes[0].x,l.boxes[0].y,32);await page.keyboard.press('e',{delay:80});await page.waitForTimeout(200);
  assert.equal((await snapshot(page)).opened[0],true);
  await page.screenshot({path:`output/opening-search/night-${round}-box.png`});
  assert.deepEqual(errors,[]);console.log({round,key:l.key,box:l.boxes[0],walkDistance:(await snapshot(page)).walkDistance});await page.close();
 }
}finally{await browser.close();}
