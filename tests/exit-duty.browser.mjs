import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:55}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await p.locator('#start:enabled').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 for(const night of [8,9,10,11,12,13,14]){
  await p.evaluate(night=>{localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night,seed:42}));window.__nightshiftScene.startRun(night);},night);await p.waitForFunction(night=>window.__nightshiftScene?.level?.round===night&&window.__nightshiftScene.mapSeed===42&&window.__nightshiftScene.active,night);
  const r=await p.evaluate(async()=>{
   const {clearContact,monsterFeetAt,overlaps}=await import('/src/collision.ts');
   const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.state.fuses=3;s.opened=[true,true,true];s.door=false;s.weeper=undefined;s.ghostTime=0;s.ghost.setPosition(s.level.spawn.x,s.level.spawn.y);s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+24);s.protection=999;s.hit=999;s.rogue.hidden='fixture-room';s.rogue.machineTime=0;s.lure=0;
   const samples=[];for(let i=0;i<600;i++){s.updateReinforcement(.05);const r=s.reserves[0];if(i%100===0&&r.position)samples.push({t:i*.05,p:{...r.position},mode:r.exitPatrol.mode});}
   const actor=s.reserves[0],holding=actor.exitPatrol.mode,solids=s.monsterSolids();if(!actor.position)throw Error('missing interceptor');
   const observed=[];for(let a=0;a<8;a++){const q={x:actor.position.x+Math.cos(a*Math.PI/4)*25,y:actor.position.y+Math.sin(a*Math.PI/4)*25};if(!solids.some(b=>overlaps(monsterFeetAt(q.x,q.y),b))&&clearContact(actor.position,q,solids))observed.push(q);}
   if(!observed.length)throw Error('no legal re-encounter point');s.rogue.hidden='';s.player.setPosition(observed[0].x,observed[0].y);s.updateReinforcement(.05);const reacquired=actor.exitPatrol.mode;
   s.rogue.hidden='fixture-room';s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+24);const states=new Set();for(let i=0;i<600;i++){s.updateReinforcement(.05);states.add(actor.exitPatrol.mode);}
   return {night:s.round,theme:s.level.theme,holding,reacquired,states:[...states],end:actor.exitPatrol.mode,points:s.interceptTargets,samples};
  });
  assert.equal(r.holding,'patrol');assert.equal(r.reacquired,'chase');assert.ok(r.states.includes('local-search'));assert.ok(r.states.includes('exit-return'));assert.equal(r.end,'patrol');assert.notDeepEqual(r.samples.at(-1).p,r.samples.at(-2).p);console.log('Exit waiting and second encounter passed:',r.night,'theme',r.theme);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
