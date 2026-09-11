import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const kind of ['listener','light-shy','patroller']){
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=clue-arrival&balance=1');
  await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const result=await page.evaluate(async kind=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs');
   const s=window.__nightshiftScene,h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:'none',reserve:0,route:'key-first'});
   // A sealed partition leaves a reachable approach but no route to the old cue.
   // Use real pursuit and movement with normal health; no player teleport in the measured interval.
   s.round=6;s.rules={...s.rules,threat:kind};s.weeper=undefined;s.rogue.features=[];s.updateReinforcement=()=>{};
   s.monsterSolids=()=>[{x:500,y:100,width:20,height:700}];
   s.player.setPosition(800,414);s.ghost.setPosition(480,414);s.ghostTime=30;s.ghostDelay=0;s.memory=14;
   s.lastKnown={x:650,y:414};s.route=[];s.routeTimer=0;s.state.fuses=1;s.state.health=100;
   const samples=[];
   for(let i=0;i<60;i++){h.advance({keys:[],items:[],sprint:false});if(i%10===0)samples.push({memory:s.memory,mode:s.balanceDecision.mode,search:s.pursuitSearch.remaining,position:{x:s.ghost.x,y:s.ghost.y}});}
   const moved=Math.max(...samples.map(sample=>Math.hypot(sample.position.x-480,sample.position.y-414)));
   // A subsequent real nearby sound/visual observation must replace the completed clue.
   s.player.setPosition(s.ghost.x-50,s.ghost.y);s.hear(3);const fresh={memory:s.memory,target:{...s.lastKnown}};
   h.advance({keys:[],items:[],sprint:false});
   return {samples,moved,fresh,memory:s.memory,health:s.state.health};
  },kind);
  assert.equal(result.samples[1].memory,0,kind);assert.ok(result.samples.some(s=>s.mode==='search'&&s.search>0),kind);
  assert.ok(result.moved>40,JSON.stringify({kind,result}));assert.ok(result.fresh.memory>0&&result.memory>0,kind);assert.equal(result.health,100);
  console.log('Unreachable clue becomes local search; fresh cue reacquired:',kind);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
