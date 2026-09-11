import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const first of [7,251,9999]){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(n=>{
   localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:n}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:n,seed:42}));
   Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(42);return a;}});
  },first);
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=endless-continuity&balance=1');
  await page.locator(`[data-night="${first}"]`).click();await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const assertFresh=async night=>{
   const state=await page.evaluate(()=>{const s=window.__nightshiftScene;return {night:s.round,elapsed:s.state.elapsed,health:s.state.health,items:[s.flashes,s.decoys,s.bandages],expected:[s.difficulty.startingFlashes+(s.rules.event==='supply'?1:0),s.difficulty.startingDecoys,2],opened:s.opened,searches:s.rogue.opened.size,door:s.door,memory:s.memory,stun:s.stun,lure:s.lure,alarm:s.exitStartup,ghost:s.ghostTime,reserves:s.reserves.filter(r=>r.position).length,blink:s.boxBlink.used,drawer:s.morgueDrawer.phase,blackout:s.blackouts.remaining,stamina:s.stamina.value};});
   assert.equal(state.night,night);assert.equal(state.elapsed,0);assert.equal(state.health,100);assert.deepEqual(state.items,state.expected);assert.deepEqual(state.opened,[false,false,false]);
   for(const k of ['searches','memory','stun','lure','alarm','ghost','reserves','blackout'])assert.equal(state[k],0,k);
   assert.equal(state.door,false);assert.equal(state.blink,false);assert.equal(state.drawer,'idle');assert.equal(state.stamina,100);
  };
  await assertFresh(first);
  for(let n=first;n<first+2;n++){
   await page.evaluate(()=>{
    const s=window.__nightshiftScene;s.tutorial.skip();s.setPaused(false);
    // Deliberately dirty a completed run; this fixture measures the real UI/state
    // transition, not campaign difficulty or a human playthrough.
    s.opened=[true,true,true];s.state.fuses=3;s.exitStartup=0;s.door=true;s.key=true;s.state.health=20;s.flashes=s.decoys=s.bandages=1000;s.stamina.value=0;
    s.rogue.opened.add('old-run');s.memory=14;s.lure=8;s.stun=2;s.ghostTime=24;s.boxBlink.used=true;s.morgueDrawer.phase='open';s.blackouts.start(6,true);
    s.player.setPosition(s.level.exit.x,s.level.exit.y);s.interact();
   });
   await page.locator('#next-night').click();await page.waitForFunction(n=>window.__nightshiftScene?.round===n&&window.__nightshiftScene.active,n+1);await assertFresh(n+1);
   console.log('Controlled completion resets actual next-night state:',n,'->',n+1);
  }
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.skip();s.state.health=0;s.finish(false,'patroller');});
  await page.locator('#result-retry').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);await assertFresh(first+2);
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
