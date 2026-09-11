import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.addInitScript(()=>localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper'])));
 await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance-search&balance=1');
 await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 const result=await page.evaluate(async()=>{
  const {createHarness}=await import('/scripts/balance/browser-harness.mjs');const s=window.__nightshiftScene;
  const h=createHarness(s,{scenario:'navigation',night:1,seed:0,policy:'ordinary',items:'both',reserve:0,route:'key-first',searches:'all'});
  const f=s.rogue.features.find(f=>f.kind==='cache'&&f.hasLoot);f.reward='flash';s.flashes=2;
  s.player.setPosition(f.x+f.width/2,f.y+f.height/2+28);
  h.advance({keys:[],sprint:false,items:['F','E']});
  return {inventory:s.flashes,frame:h.trace.frames.at(-1),search:h.trace.groups.daily.searches,spent:h.trace.groups.daily.items};
 });
 assert.equal(result.inventory,2);assert.deepEqual(result.frame.used,['F']);assert.equal(result.frame.gained.F,1);assert.equal(result.search.cabinets,1);assert.equal(result.search.loot.F,1);assert.equal(result.spent.F,1);
 console.log('Actual same-frame flash consumption and cabinet pickup remain separate.');
 await page.reload();await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 const waiting=await page.evaluate(async()=>{
  const {createHarness}=await import('/scripts/balance/browser-harness.mjs'),s=window.__nightshiftScene;
  const h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:'none',reserve:0,route:'key-first'});
  s.round=3;s.rules={...s.rules,threat:'patroller'};s.weeper=undefined;s.updateReinforcement=()=>{};s.rogue.features=[];
  s.key=true;s.opened=[true,true,true];s.door=true;s.state.fuses=3;s.exitStartup=20;s.level.exit={x:420,y:414};s.player.setPosition(420,414);
  s.ghost.setPosition(475,414);s.ghostTime=30;s.ghostDelay=0;s.memory=3;s.lastKnown={x:420,y:414};s.route=[];s.routeTimer=0;s.flashes=s.decoys=0;
  const actions=[];for(let i=0;i<30;i++){const input=h.inputForPolicy();actions.push(input);h.advance(input);}
  return {distance:Math.hypot(s.player.x-420,s.player.y-414),actions,health:s.state.health};
 });
 assert.ok(waiting.actions.some(i=>i.navigation.goal==='evade-exit'&&i.keys.length));assert.ok(waiting.distance>60,`only moved ${waiting.distance}`);assert.ok(waiting.health>0);
 console.log('Waiting at an unpowered exit produces actual evasive movement.');
}finally{await browser.close();}
