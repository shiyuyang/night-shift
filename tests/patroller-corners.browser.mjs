// Isolated real third-night rack encounters. No other actors; normal health/stamina, no items.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';import {writeFileSync} from 'node:fs';
const out='output/balance/patroller-corners';mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:3,seed:3}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
for(const gap of [40,80])for(const sprintSeconds of [0,2.8]){
 await p.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await p.locator('#start:enabled').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 const r=await p.evaluate(async({gap,sprintSeconds})=>{
 const {createHarness}=await import('/scripts/balance/browser-harness.mjs'),{patrolPath}=await import('/src/patrol.ts'),{feetAt,monsterFeetAt,overlaps,moveWithCollision}=await import('/src/collision.ts');
 const s=window.__nightshiftScene;if(s.round!==3||s.mapSeed!==3)throw Error('wrong night');const h=createHarness(s,{scenario:'campaign',night:3,seed:3,policy:'ordinary',items:'none',reserve:0,route:'key-first',weeperAware:true});
 s.weeper=undefined;s.weeperIntroUsed=true;s.weeperIntroRemaining=0;s.state.fuses=2;s.door=true;s.player.setPosition(700,590);s.ghost.setPosition(700,590+gap);s.ghostTime=30;s.ghostDelay=0;s.memory=2.5;s.lastKnown={x:700,y:590};s.state.health=100;s.protection=0;s.hit=0;s.route=[];s.routeTimer=0;s.sightLock.reset();
 if(s.solids().some(b=>overlaps(feetAt(s.player.x,s.player.y),b))||s.monsterSolids().some(b=>overlaps(monsterFeetAt(s.ghost.x,s.ghost.y),b)))throw Error(JSON.stringify({player:s.solids().filter(b=>overlaps(feetAt(s.player.x,s.player.y),b)),ghost:s.monsterSolids().filter(b=>overlaps(monsterFeetAt(s.ghost.x,s.ghost.y),b)),props:s.level.props}));
 const goals=[{x:700,y:474},{x:580,y:474},{x:580,y:650},{x:750,y:650}],trace=[];let goalIndex=0,route=[];
 for(let i=0;i<200&&!h.done;i++){
  const goal=goals[goalIndex];if(Math.hypot(s.player.x-goal.x,s.player.y-goal.y)<7){goalIndex=(goalIndex+1)%goals.length;route=[];}
  if(!route.length)route=patrolPath(s.player,goals[goalIndex],s.solids(),s.level.bounds,feetAt);
  while(route.length&&Math.hypot(route[0].x-s.player.x,route[0].y-s.player.y)<4)route.shift();const next=route[0]??goals[goalIndex],sprint=i*.05<sprintSeconds,speed=sprint&&s.stamina.canSprint?125:83;let best=Infinity,keys=[];
  for(const [dx,dy,held]of [[1,0,['D']],[-1,0,['A']],[0,1,['S']],[0,-1,['W']],[.707,.707,['D','S']],[.707,-.707,['D','W']],[-.707,.707,['A','S']],[-.707,-.707,['A','W']]]){const q=moveWithCollision(s.player,dx*speed*.05,dy*speed*.05,s.solids()),score=Math.hypot(q.x-next.x,q.y-next.y);if(score<best){best=score;keys=held;}}
  h.advance({keys,sprint,items:[]});trace.push({t:s.state.elapsed,health:s.state.health,stamina:s.stamina.value,memory:s.memory,mode:s.balanceDecision.mode,seen:s.primarySeen,unseen:s.sightLock.unseen,searching:s.sightLock.searching,gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),player:{x:s.player.x,y:s.player.y},ghost:{x:s.ghost.x,y:s.ghost.y}});
 }
 return {gap,sprintSeconds,health:s.state.health,maxUnseen:Math.max(...trace.map(t=>t.unseen)),searchTime:trace.filter(t=>t.searching).length*.05,trace};
 },{gap,sprintSeconds});reports.push(r);
 if(sprintSeconds){assert.ok(r.searchTime>=2,'sprinting around the rack must open a search window');assert.ok(r.trace.some(t=>t.t>3&&t.gap>180),'the window must create real separation');assert.ok(r.trace.some(t=>t.t>6&&t.seen),'looping back into sight must allow reacquisition');assert.ok(r.health<100,'returning into reach must remain dangerous');}
 else {assert.equal(r.searchTime,0);assert.ok(r.health<=60,'walking in close sight remains dangerous');}
 console.log('Patroller rack counter passed:',JSON.stringify({...r,trace:undefined}));
}
assert.deepEqual(errors,[]);writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));
}finally{await b.close();}
