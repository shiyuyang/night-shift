import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const phase of ['idle','warning','mixed','stunned']){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const result=await page.evaluate(async phase=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs'),{Weeper}=await import('/src/runtime/weeper.ts');const s=window.__nightshiftScene;
   const h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:'both',reserve:0,route:'key-first',weeperAware:true,mixed:phase==='mixed'?'urgent':'quiet'});
   s.player.setPosition(420,414);s.weeper=new Weeper({x:470,y:414});s.weeper.phase=phase==='mixed'?'idle':phase;s.weeper.clock=.8;s.weeper.grace=0;s.state.health=phase==='warning'?10:100;
   if(phase==='stunned'){s.player.setPosition(270,414);s.weeper.position={x:350,y:414};s.weeper.home={x:350,y:414};s.weeper.clock=6;s.level.key={x:430,y:414};}
   if(phase==='mixed'){s.ghostTime=20;s.ghostDelay=0;s.ghost.setPosition(380,414);s.memory=5;s.flashes=0;s.decoys=0;}
   const input=h.inputForPolicy(),visible=s.canSee(s.player,s.weeper.position);h.advance(input);
   const after={phase:s.weeper.phase,health:s.state.health,flashlight:s.flashlightOn,flashes:s.flashes,traveled:Math.hypot(s.player.x-420,s.player.y-414)};
   for(let i=0;i<5;i++)h.advance(h.inputForPolicy());
   let farthestX=s.player.x;
   if(phase==='stunned')for(let i=0;i<60;i++){h.advance(h.inputForPolicy());farthestX=Math.max(farthestX,s.player.x);}
   return {input,visible,after,finalFlashes:s.flashes,finalPhase:s.weeper.phase,farthestX,key:s.key,health:s.state.health};
  },phase);
  assert.ok(result.visible);assert.ok(result.input.items.includes('T'));assert.equal(result.after.flashlight,false);
  if(phase==='idle'){assert.equal(result.input.sprint,false);assert.equal(result.input.items.includes('F'),false);assert.equal(result.after.phase,'idle');}
  else if(phase==='warning'){assert.ok(result.input.items.includes('F'));assert.equal(result.input.items.includes('Q'),false);assert.equal(result.after.phase,'stunned');assert.equal(result.after.health,10);assert.equal(result.after.flashes,3);assert.equal(result.finalFlashes,3);}
  else if(phase==='mixed'){assert.equal(result.input.sprint,true);assert.equal(result.input.navigation.weeper,'urgent-escape');assert.ok(result.after.traveled>6);}
  else{assert.notEqual(result.input.navigation.weeper,'quiet-bypass');assert.equal(result.finalPhase,'stunned');assert.ok(result.farthestX>380,JSON.stringify(result));assert.equal(result.key,true);assert.equal(result.health,100);assert.equal(result.finalFlashes,4);}
  assert.deepEqual(errors,[]);console.log('Weeper policy actual-scene fixture passed:',phase);await page.close();
 }
}finally{await browser.close();}
