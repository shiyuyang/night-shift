import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:3}));});
 const url=(process.env.BASE_URL||'http://localhost:5174')+'/?playtest=encounters';
 async function start(){await page.goto(url);await page.locator('#start:enabled').waitFor();await page.locator('[data-night="3"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);}
 async function fixture(kind,blocked=false){await page.evaluate(async({kind,blocked})=>{
  const s=window.__nightshiftScene;s.tutorial.start(3);s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=999;s.ghostTime=0;s.ghost.setVisible(false);s.player.setPosition(458,414);s.state.health=100;s.state.battery=100;s.flashlightOn=true;s.protection=0;
  // A wall fixture proves proximity alone does not open a monster tutorial.
  s.level.walls=s.level.walls.filter(w=>w.testWall!==true);if(blocked)s.level.walls.push({x:495,y:376,width:8,height:80,testWall:true});
  if(kind==='weeper'){const {Weeper}=await import('/src/runtime/weeper.ts');s.weeper=new Weeper({x:540,y:414});s.weeper.grace=0;s.weeperSprite.setVisible(true).setPosition(540,414);}
  else{s.rules={...s.rules,threat:kind};s.ghost.setPosition(540,414).setVisible(true);s.ghostTime=20;s.ghostDelay=0;s.stun=0;s.memory=0;s.patrolRetreat=false;s.patrolUnseen=0;s.lastKnown={x:540,y:414};s.route=[];s.routeTimer=0;}
 },{kind,blocked});}
 await start();await fixture('weeper',true);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__nightshiftScene.tutorial.prompt),null);
 for(const kind of ['listener','light-shy','patroller','weeper']){
  await fixture(kind);await page.waitForFunction(id=>window.__nightshiftScene.tutorial.prompt===id,'monster-'+kind);
  assert.equal(await page.locator('#tutorial-card').isVisible(),true);assert.equal(await page.locator('#tutorial-skip').isVisible(),false);
  const frozen=await page.evaluate(()=>{const s=window.__nightshiftScene;return [s.state.elapsed,s.state.battery,s.state.health,s.ghost.x,s.ghost.y,s.weeper?.anger??0];});
  await page.keyboard.press('d',{delay:200});assert.deepEqual(await page.evaluate(()=>{const s=window.__nightshiftScene;return [s.state.elapsed,s.state.battery,s.state.health,s.ghost.x,s.ghost.y,s.weeper?.anger??0];}),frozen);
  await page.locator('#tutorial-continue').click();assert.ok(await page.evaluate(()=>window.__nightshiftScene.protection>1));
  assert.ok(await page.evaluate(id=>JSON.parse(localStorage.getItem('night-shift-monster-lessons-v1')).includes(id),'monster-'+kind));
 }
 await start();for(const kind of ['listener','light-shy','patroller','weeper']){await fixture(kind);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__nightshiftScene.tutorial.prompt),null);}
 assert.deepEqual(errors,[]);console.log('Monster tutorials passed: four visible encounters, wall occlusion, frozen simulation/input, confirmation protection and persistence after reload.');
}finally{await browser.close();}
