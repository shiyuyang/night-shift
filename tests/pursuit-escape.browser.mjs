import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
mkdirSync('output/monster-death',{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=monster-death');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="1"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);

 const result=await p.evaluate(()=>{
  const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.weeper=undefined;s.round=4;s.rules={...s.rules,threat:'listener'};s.state.fuses=3;s.opened=[true,true,true];s.door=true;s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.cooldown=999;s.interceptTargets=[];
  const clue={x:s.level.boxes[2].x,y:s.level.boxes[2].y};s.ghost.setPosition(clue.x,clue.y);s.player.setPosition(s.level.exit.x,s.level.exit.y);s.lastKnown={...clue};s.memory=0;
  s.hear(5,true);const quiet={...s.lastKnown};
  s.updateReinforcement(.016);const checkpoints=JSON.stringify(s.interceptTargets);
  s.player.setPosition(s.level.spawn.x,s.level.spawn.y);s.interceptClock=0;s.updateReinforcement(.016);
  const unchanged=checkpoints===JSON.stringify(s.interceptTargets);
  // Run real frames while stationary and far from the remembered box.
  s.reserves.forEach(r=>{r.position=null;r.used=true;});s.boxBlink.used=true;s.exitStartup=30;s.protection=100;
  s.setPaused(false);for(let i=0;i<320;i++)s.update(i*16,16);s.setPaused(true);
  return {clue,quiet,unchanged,lastKnown:s.lastKnown,memory:s.memory,active:s.active};
 });
 assert.deepEqual(result.quiet,result.clue);assert.equal(result.unchanged,true);assert.deepEqual(result.lastKnown,result.clue);assert.equal(result.memory,0);assert.equal(result.active,true);


 const corner=await p.evaluate(async()=>{
  const s=window.__nightshiftScene;
  const {monsterFeetAt,overlaps}=await import('/src/collision.ts');
  const {patrolPath}=await import('/src/patrol.ts');
  const solids=s.monsterSolids(),b=s.level.bounds;let pair;
  const free=p=>p.x>b.x+20&&p.x<b.x+b.width-20&&p.y>b.y+20&&p.y<b.y+b.height-20&&!solids.some(w=>overlaps(monsterFeetAt(p.x,p.y),w));
  for(const wall of solids){
   const candidates=wall.height>wall.width?
    Array.from({length:Math.ceil(wall.height/30)},(_,i)=>[{x:wall.x-30,y:wall.y+i*30},{x:wall.x+wall.width+30,y:wall.y+i*30}]):
    Array.from({length:Math.ceil(wall.width/30)},(_,i)=>[{x:wall.x+i*30,y:wall.y-40},{x:wall.x+i*30,y:wall.y+wall.height+25}]);
   for(const [a,c] of candidates){if(!free(a)||!free(c)||Math.hypot(a.x-c.x,a.y-c.y)>100||s.canSee(a,c))continue;
    const route=patrolPath(a,c,solids,b,monsterFeetAt),end=route.at(-1);if(!end||Math.hypot(end.x-c.x,end.y-c.y)>30)continue;
    let d=0,prev=a;for(const n of route){d+=Math.hypot(n.x-prev.x,n.y-prev.y);prev=n;}
    if(d>300){pair={a,c};break;}
   }if(pair)break;
  }
  if(!pair)throw Error('No reachable corner fixture');
  s.round=3;s.rules={...s.rules,threat:'patroller'};s.state.fuses=1;s.opened=[true,false,false];s.ghost.setPosition(pair.a.x,pair.a.y);s.player.setPosition(pair.c.x,pair.c.y);s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.memory=2.5;s.lastKnown={...pair.a};s.route=[];s.routeTimer=0;s.sightLock.reset();s.flashlightOn=false;s.patrolRetreat=false;
  s.hear(3,false,true);const afterRunning={...s.lastKnown};s.hear();const afterLoud={...s.lastKnown};
  // Real scene frames behind a real wall: no direct lock/position updates from the test.
  s.setPaused(false);for(let i=0;i<18;i++)s.update(i*50,50);s.setPaused(true);
  return {pair,afterRunning,afterLoud,lastKnown:s.lastKnown,searching:s.sightLock.searching};
 });
 assert.deepEqual(corner.afterRunning,corner.pair.a);assert.deepEqual(corner.afterLoud,corner.pair.a);assert.deepEqual(corner.lastKnown,corner.pair.a);assert.equal(corner.searching,true);
 console.log('Real-wall patroller escape checks passed');
 assert.deepEqual(errors,[]);console.log('Browser escape checks passed:',result);
}finally{await browser.close();}
