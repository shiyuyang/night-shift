import {chromium} from '@playwright/test';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';

const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
const output='output/garden';mkdirSync(output,{recursive:true});
const reports=[];
try{
 for(const round of [7]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  const name='garden';page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(()=>{
    localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));
    localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));
   });
   await page.goto((process.env.BASE_URL||'http://127.0.0.1:5187')+'/?playtest=industrial');
   await page.locator('#start:enabled').waitFor();await page.locator(`[data-night="${round}"]`).click();await page.locator('#start').click();
   await page.waitForFunction(n=>window.__nightshiftScene?.active&&window.__nightshift().night===n,round);
   const initial=await snapshot(page),l=initial.level;assert.equal(l.width,1280);assert.equal(l.height,768);
   // Existing sanctuary assistance isolates traversal from balancing. No teleporting,
   // inventory edits, forced unlocks, or alteration of live monster state.
   await page.evaluate(()=>{window.__industrialAid=setInterval(()=>{const s=window.__nightshiftScene;if(s?.active&&!s.paused)s.command('sanctuary','world');},2000);});
   const use=async()=>{await page.keyboard.press('e',{delay:80});await page.waitForTimeout(150);};
   await page.screenshot({path:`${output}/${name}-entry.png`});
   await goTo(page,l.doorUse.x,l.doorUse.y,10);await use();assert.equal((await snapshot(page)).door,false);
   await goTo(page,l.key.x,l.key.y,27);await use();assert.equal((await snapshot(page)).key,true);
   await goTo(page,l.boxes[0].x,l.boxes[0].y,35);await use();assert.equal((await snapshot(page)).opened[0],true);
   await page.screenshot({path:`${output}/${name}-search.png`});
   await goTo(page,612,290,12);await page.waitForFunction(()=>window.__nightshift().eventTriggered.includes('garden_dark_wave'));
   await page.waitForFunction(()=>window.__nightshift().environment.LampWest===.06);
   await page.screenshot({path:`${output}/lights-dim.png`});
   await page.waitForFunction(()=>window.__nightshift().events.includes('garden_dark_wave'));await page.screenshot({path:`${output}/lights-restored.png`});

   await goTo(page,l.boxes[1].x,l.boxes[1].y,35);await use();assert.equal((await snapshot(page)).opened[1],true);
   // Cross the added southern area, then enter the east lock room through its door.
   await goTo(page,700,675,12);assert.ok((await snapshot(page)).camera.y>200);
   await page.screenshot({path:`${output}/${name}-south.png`});
   await goTo(page,l.doorUse.x,l.doorUse.y,8);await use();assert.equal((await snapshot(page)).door,true);
   assert.ok((await snapshot(page)).camera.x>500);
   await goTo(page,l.boxes[2].x,l.boxes[2].y,35);await use();assert.equal((await snapshot(page)).opened[2],true);
   const escapeStart=await snapshot(page);await page.screenshot({path:`${output}/${name}-final-box.png`});
   await goTo(page,l.exit.x,l.exit.y,20);await page.waitForFunction(()=>window.__nightshift().exitStartup===0);await use();
   await page.locator('#result-screen').waitFor({state:'visible'});assert.equal(await page.locator('#result-screen').getAttribute('data-outcome'),'won');
   const end=await snapshot(page);assert.ok(end.health>0);assert.deepEqual(errors,[]);
   await page.screenshot({path:`${output}/${name}-escaped.png`});
   reports.push({round,source:l.source,seed:l.generation.seed,attempts:l.generation.attempts,fallback:l.generation.fallback,elapsed:end.elapsed,walkDistance:end.walkDistance,escapeSeconds:end.elapsed-escapeStart.elapsed,escapeWalkDistance:end.walkDistance-escapeStart.walkDistance,weeper:initial.weeper?.home??null,assistance:'Existing sanctuary every 2 seconds; real keyboard navigation and lock chain',errors});
   console.log(reports.at(-1));
  }catch(e){await page.screenshot({path:`${output}/${name}-failure.png`,fullPage:true});throw e;}finally{await page.close();}
 }
 writeFileSync(output+'/browser-report.json',JSON.stringify(reports,null,2)+'\n');
}finally{await browser.close();}
