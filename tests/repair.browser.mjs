import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {writeFileSync,mkdirSync} from 'node:fs';import {goTo,snapshot} from './navigation.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});mkdirSync('output/repair',{recursive:true});const reports=[];
try{
 for(const round of [2,6]){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));localStorage.setItem('night-shift-language-v1','en');const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{original(a);if(a instanceof Uint32Array&&a.length===1)a[0]=895950400;return a;};});
  await page.goto('http://localhost:5191/?playtest=repair');await page.locator('#start:enabled').waitFor();await page.locator(`[data-night="${round}"]`).click();await page.locator('#start').click();await page.waitForFunction(n=>window.__nightshiftScene?.active&&window.__nightshift().night===n,round);
  const initial=await snapshot(page),l=initial.level;assert.equal(initial.night,round);if(round===2){assert.equal(initial.weeper.position.x,910);assert.equal(initial.weeper.position.y,216);}
  // Existing sanctuary isolates route and event correctness. Natural generation and keyboard interactions are retained.
  await page.evaluate(()=>{window.__repairAid=setInterval(()=>{const s=window.__nightshiftScene;if(s?.active&&!s.paused)s.command('sanctuary','world');},1000);});
  const use=async()=>{await page.keyboard.press('e',{delay:70});await page.waitForTimeout(150);};
  for(const [target,r,index] of [[l.key,27,-1],[l.boxes[0],35,0],[l.boxes[1],35,1],[l.doorUse,8,-2],[l.boxes[2],35,2]]){
   await goTo(page,target.x,target.y,r);await use();const s=await snapshot(page);if(index>=0)assert.ok(s.opened[index]);if(index===-1)assert.ok(s.key);if(index===-2)assert.ok(s.door);
  }
  const final=await snapshot(page);assert.ok(final.exitStartup>28&&final.exitStartup<=30);await page.screenshot({path:`output/repair/night-${round}-finale.png`});
  if(round===6){await page.waitForFunction(()=>window.__nightshift().morgueDrawer.phase==='open');await page.screenshot({path:'output/repair/morgue-drawer.png'});}
  await goTo(page,l.exit.x,l.exit.y,20);await page.waitForFunction(()=>window.__nightshift().exitStartup===0);await use();await page.locator('#result-screen').waitFor({state:'visible'});assert.equal(await page.locator('#result-screen').getAttribute('data-outcome'),'won');assert.deepEqual(errors,[]);
  reports.push({round,seed:l.generation?.seed,initialPatient:initial.weeper?.position,countdown:final.exitStartup,drawer:(await snapshot(page)).morgueDrawer,assistance:'sanctuary every second; no teleports, forced spawn, inventory or unlock edits',errors});writeFileSync('output/repair/browser.json',JSON.stringify(reports,null,2));await page.close();console.log('Natural route passed '+round);
 }
}finally{await browser.close();}
