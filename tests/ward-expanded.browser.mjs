import {chromium} from '@playwright/test';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';

// Keyboard-only navigation and real interactions; periodic existing sanctuary
// isolates route/camera correctness from difficulty balancing. No teleporting.
const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
const output='output/ward-expanded';mkdirSync(output,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>{
  localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));
  localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:4}));
 });
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5187')+'/?playtest=ward');
 await page.locator('#start:enabled').waitFor();await page.locator('[data-night="1"]').click();await page.locator('#start').click();
 await page.waitForFunction(()=>window.__nightshiftScene?.active);
 await page.locator('#tutorial-card').waitFor({state:'visible'});
 const frozen=(await snapshot(page)).elapsed;await page.waitForTimeout(200);assert.equal((await snapshot(page)).elapsed,frozen);
 await page.locator('#tutorial-skip').click();
 await page.evaluate(()=>{
  window.__wardAid=setInterval(()=>{const s=window.__nightshiftScene;if(s?.active&&!s.paused&&!s.tutorial.prompt)s.command('sanctuary','world');},2000);
 });
 const l=(await snapshot(page)).level;assert.equal(l.width,1280);assert.equal(l.height,768);
 const use=async()=>{await page.keyboard.press('e',{delay:80});await page.waitForTimeout(150);};
 await page.screenshot({path:output+'/entry.png'});
 await goTo(page,l.key.x,l.key.y,27);await use();assert.equal((await snapshot(page)).key,true);
 await page.screenshot({path:output+'/nurse-station.png'});
 await goTo(page,l.boxes[0].x,l.boxes[0].y,35);await use();assert.equal((await snapshot(page)).opened[0],true);
 await goTo(page,l.boxes[1].x,l.boxes[1].y,35);await use();assert.equal((await snapshot(page)).opened[1],true);
 // Cross the workroom connection below the original 576-high map.
 await goTo(page,1010,625);assert.ok((await snapshot(page)).camera.y>200);
 await page.screenshot({path:output+'/workroom-loop.png'});
 await goTo(page,l.doorUse.x,l.doorUse.y,8);await use();assert.equal((await snapshot(page)).door,true);
 assert.ok((await snapshot(page)).camera.x>500);
 await goTo(page,l.door.x+l.door.width/2,l.door.y-36,8);await use();assert.equal((await snapshot(page)).door,false);await use();assert.equal((await snapshot(page)).door,true);
 await goTo(page,l.boxes[2].x,l.boxes[2].y,35);await use();assert.equal((await snapshot(page)).opened[2],true);
 const escapeStart=await snapshot(page);
 await page.screenshot({path:output+'/isolation.png'});
 await goTo(page,l.exit.x,l.exit.y,20);await page.waitForFunction(()=>window.__nightshift().exitStartup===0);await use();
 await page.locator('#result-screen').waitFor({state:'visible'});
 assert.equal(await page.locator('#next-night').isEnabled(),true);
 const end=await snapshot(page);assert.equal(end.health>0,true);assert.equal(end.opened.every(Boolean),true);
 await page.screenshot({path:output+'/escaped.png'});
 assert.deepEqual(errors,[]);
 const report={width:l.width,height:l.height,assistance:'Existing sanctuary every 2 seconds; keyboard navigation, no teleporting',elapsed:end.elapsed,walkDistance:end.walkDistance,escapeSeconds:end.elapsed-escapeStart.elapsed,escapeWalkDistance:end.walkDistance-escapeStart.walkDistance,health:end.health,errors};
 writeFileSync(output+'/browser-report.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}catch(e){await page.screenshot({path:output+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
