import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture=async(kind,mode,counters=true)=>{
  await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  return page.evaluate(async({kind,mode,counters})=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs');const s=window.__nightshiftScene;
   const policyMode=mode==='policy'||mode==='close-light';
   const h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:mode==='close-light'?'both':'none',reserve:0,route:'key-first',weeperAware:true,counters});
   // Authored corridor and production actor logic; fixtures are not campaign difficulty samples.
   s.round=2;s.rules={...s.rules,threat:kind};s.weeper=undefined;s.rogue.features=[];s.updateReinforcement=()=>{};s.cooldown=999;s.state.fuses=1;s.state.health=100;s.flashlightOn=false;s.level.key={x:800,y:414};
   s.player.setPosition(500,414);s.ghost.setPosition(mode==='policy'?380:mode==='close-light'?420:460,414);s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.lure=0;s.protection=0;s.hit=0;s.memory=mode==='policy'&&kind==='listener'?0:3;s.lastKnown={x:mode==='policy'&&kind==='listener'?380:500,y:414};s.route=[];s.routeTimer=0;
   const inputs=[];let first;
   for(let i=0;i<(policyMode?30:40);i++){
    const input=policyMode?h.inputForPolicy():{keys:['D'],sprint:false,items:i===0&&mode!=='none'?[mode]:[]};inputs.push(input);h.advance(input);
    if(i===0)first={stun:s.stun,hesitation:s.distractionResponse.hesitation,gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y)};
   }
   return {kind,mode,counters,health:s.state.health,memory:s.memory,gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),lightRecovery:s.lightFear.recovery,flashlight:s.flashlightOn,first,inputs,events:h.trace.events,inventory:{F:s.flashes,R:s.decoys}};
  },{kind,mode,counters});
 };
 for(const kind of ['listener','light-shy']){
  const basic=await fixture(kind,'policy',false),aware=await fixture(kind,'policy',true);results.push(basic,aware);
  if(kind==='listener'){
   assert.ok(basic.events.some(e=>e.type==='cue'&&e.source==='sprint'&&e.accepted));
   assert.equal(aware.events.some(e=>e.type==='cue'&&e.source==='sprint'&&e.accepted),false);assert.equal(aware.memory,0);assert.equal(aware.health,100);
  }else{
   assert.ok(aware.inputs.some(i=>i.navigation.counter==='light-face'));assert.ok(aware.inputs.some(i=>i.navigation.counter==='light-escape'));
   assert.equal(aware.flashlight,true);assert.ok(aware.lightRecovery>1);assert.ok(aware.gap>basic.gap+90);assert.equal(aware.health,100);assert.equal(basic.lightRecovery,0);
  }
  console.log('Counter fixture passed:',kind,JSON.stringify({basic:{health:basic.health,gap:basic.gap,memory:basic.memory},aware:{health:aware.health,gap:aware.gap,memory:aware.memory}}));
 }
 for(const kind of ['listener','light-shy','patroller']){
  const bare=await fixture(kind,'none'),flash=await fixture(kind,'F'),decoy=await fixture(kind,'R');results.push(bare,flash,decoy);
  assert.ok(flash.first.stun>0);assert.ok(flash.first.gap>bare.first.gap+50);assert.ok(flash.health>=bare.health);assert.ok(flash.gap>bare.gap+40);
  if(kind!=='listener')assert.equal(decoy.first.hesitation,.65);
  assert.ok(decoy.health>=bare.health);assert.ok(decoy.gap>bare.gap+20);
  console.log('Item fixture passed:',kind,JSON.stringify({bare:{health:bare.health,gap:bare.gap},flash:{health:flash.health,gap:flash.gap,stun:flash.first.stun},decoy:{health:decoy.health,gap:decoy.gap,hesitation:decoy.first.hesitation}}));
 }
 const close=await fixture('light-shy','close-light');results.push(close);assert.equal(close.health,100);assert.deepEqual(close.inventory,{F:4,R:4});console.log('Close light counter waits for the visible response without spending flash or decoy.');
 assert.deepEqual(errors,[]);mkdirSync('output/balance',{recursive:true});writeFileSync('output/balance/v5-mechanics-fixtures.json',JSON.stringify({fixture:true,description:'Controlled positions, normal health, actual scene update. Not campaign difficulty measurements.',results},null,2));
}finally{await browser.close();}
