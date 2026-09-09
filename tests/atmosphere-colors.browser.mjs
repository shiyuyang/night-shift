import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=process.env.OUTPUT_DIR||'/tmp/night-shift-atmosphere';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://localhost:5193/')+'?playtest=atmosphere');
 await page.locator('#start:enabled').waitFor();await page.locator('[data-night="2"]').click();await page.locator('#start').click();
 await page.waitForFunction(()=>window.__nightshiftScene?.active&&window.__nightshift().night===2);
 // Isolated rendering fixture; no claim of difficulty validation.
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=9999;s.ghostTime=0;s.ghost.setVisible(false);s.protection=9999;s.angle=0;s.state.battery=100;s.setPaused(true);s.light();});
 const normal=await page.evaluate(()=>window.__nightshiftScene.canvas.canvas.toDataURL());
 await page.locator('#game canvas').screenshot({path:`${out}/normal.png`});
 for(let i=0;i<2;i++){
  const result=await page.evaluate(async i=>{
   const {AtmosphereColors,atmospherePalettes}=await import('/src/runtime/atmosphere-colors.ts'),s=window.__nightshiftScene;
   const values=[0,0,i/atmospherePalettes.length];s.atmosphereColors=new AtmosphereColors(()=>values.shift()??0);
   for(let t=0;t<1280;t++)s.atmosphereColors.tick(.05,true);
   s.light();return {state:s.atmosphereColors.snapshot,pixels:s.canvas.canvas.toDataURL()};
  },i);
  assert.equal(result.state.amount,1);assert.notEqual(result.pixels,normal);
  await page.waitForTimeout(100);
  await page.locator('#game canvas').screenshot({path:`${out}/${result.state.palette}.png`});
  const before=await page.evaluate(()=>window.__nightshift().atmosphereColors);
  await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>window.__nightshift().atmosphereColors),before);
 }
 // Exercise the actual update path, including natural trigger and blackout suppression.
 await page.evaluate(async()=>{const s=window.__nightshiftScene,{AtmosphereColors}=await import('/src/runtime/atmosphere-colors.ts');s.atmosphereColors=new AtmosphereColors(()=>0);s.setPaused(false);for(let i=0;i<1280;i++)s.update(0,50);s.setPaused(true);});
 assert.equal(await page.evaluate(()=>window.__nightshift().atmosphereColors.amount),1);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.state.fuses=3;s.setPaused(false);for(let i=0;i<90;i++)s.update(0,50);s.setPaused(true);});
 assert.equal(await page.evaluate(()=>window.__nightshift().atmosphereColors.amount),0);
 await page.evaluate(()=>window.__nightshiftScene.startRun(2));
 await page.waitForFunction(()=>window.__nightshiftScene.active&&!window.__nightshiftScene.paused&&window.__nightshift().elapsed<2);
 assert.equal(await page.evaluate(()=>window.__nightshift().atmosphereColors.amount),0);
 assert.deepEqual(errors,[]);console.log('Both palettes visibly change the rendered light layer; pause, natural trigger, finale suppression and restart passed. Screenshots: '+out);
}finally{await browser.close();}
