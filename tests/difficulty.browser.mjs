import {chromium} from '@playwright/test';import {existsSync} from 'node:fs';import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});
try{for(const night of (process.env.STAIR_NIGHTS?.split(',').map(Number)??[1,2,3,4,5,6,7])){
 const p=await b.newPage({viewport:{width:1280,height:720}});await p.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(42);return a;}});});
 await p.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=difficulty');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="'+night+'"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 const result=await p.evaluate(async()=>{
 const s=window.__nightshiftScene;s.tutorial.skip();s.command('ghost','world');const firstSafe=s.ghostTime===0;s.setPaused(true);
 const d=s.difficulty,empty=s.rogue.features.filter(f=>f.kind==='empty-task').length,items=[s.flashes,s.decoys],breach=s.doorBreach.seconds;
 const w=s.weeper,home=w?{...w.position}:null;let moved=false;
 if(w){for(let i=0;i<400;i++){w.tick(.05,{player:{x:-999,y:-999},hidden:true,angle:0,light:false,sprinting:false,noise:false,solids:s.solids(),architecture:s.monsterSolids(),bounds:s.level.bounds,immune:true});moved ||=Math.hypot(w.position.x-home.x,w.position.y-home.y)>2;}}
 let intro=0;if(s.round===3){const {reachablePositions}=await import('/src/runtime/level-validation.ts');const near=reachablePositions(s.level,false).find(p=>Math.hypot(p.x-w.position.x,p.y-w.position.y)<230&&s.canSee(p,w.position));if(!near)throw Error('No patient approach');s.player.setPosition(near.x,near.y);s.updateWeeper(.05,false);intro=s.weeperIntroRemaining;s.setPaused(false);s.command('ghost','world');s.setPaused(true);if(s.ghostTime!==0)throw Error('Primary overlaps first patient lesson');}
 // Controlled final-box fixture through the real scene methods.
  s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+28);s.opened=[true,true,true];s.state.fuses=3;s.ghostTime=24;s.ghostDelay=0;s.escalateSearch();
 if(s.weeperIntroRemaining!==0)throw Error('Final alarm must end patient introduction protection');
 if(s.round===3){s.player.setPosition(w.position.x,w.position.y);s.weeperIntroUsed=false;s.updateWeeper(.05,false);if(s.weeperIntroRemaining!==0||s.ghostTime<=0)throw Error('Late patient approach must preserve the final pursuit');}
 for(let i=0;i<20;i++)s.updateReinforcement(.05);
 return {intro,d,firstSafe,empty,items,breach,weeper:!!w,moved,interceptors:s.reserves.filter(r=>r.position).length,blinkUsed:s.boxBlink.used,blackout:s.blackouts.remaining};
 });
 assert.equal(result.interceptors,night>=4?1:0,JSON.stringify({night,result}));assert.equal(result.blinkUsed,night>=5);assert.equal(result.blackout>0,night>=5);assert.equal(result.breach,night===1?4:night<=3?3:2);
 if(night===1)assert.ok(result.firstSafe);if(night<=2){assert.deepEqual(result.items,[4,4]);assert.equal(result.weeper,false);assert.equal(result.empty,1);}
 if(night===3){assert.ok(result.intro>0);assert.deepEqual(result.items,[2,2]);}if(night===3||night===4){assert.ok(result.weeper);assert.equal(result.moved,false);}
 if(night===5){assert.ok(result.weeper);assert.ok(result.moved);}
 console.log(night,JSON.stringify(result));await p.close();
}}finally{await b.close();}
