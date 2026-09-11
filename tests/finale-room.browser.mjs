// Real third-night runs: collect every fuse, close the door with E, then wait without items.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='output/balance/finale-room';mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});
try {
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const seed of [0,1,2,3]) {
 await p.addInitScript(seed=>{localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:3,seed}));localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));},seed);
 await p.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await p.locator('#start:enabled').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 const r=await p.evaluate(async seed=>{
  const {createHarness}=await import('/scripts/balance/browser-harness.mjs');
  const {patrolPath}=await import('/src/patrol.ts');const {feetAt,moveWithCollision}=await import('/src/collision.ts');
  const s=window.__nightshiftScene;if(s.level.round!==3||s.mapSeed!==seed)throw Error('wrong run');const h=createHarness(s,{scenario:'campaign',night:3,seed,policy:'ordinary',items:'both',reserve:1,route:'key-first',weeperAware:true,searches:'nearby',counters:true},{render:seed===2});
  let last=null;for(let i=0;i<4000&&!h.done&&s.state.fuses<3;i++){last=h.inputForPolicy();h.advance(last);}
  const point=p=>p?{x:p.x,y:p.y}:null;
  const capture=()=>({t:s.state.elapsed,left:s.exitStartup,health:s.state.health,player:point(s.player),ghost:point(s.ghost),seen:s.primarySeen,memory:s.memory,last:point(s.lastKnown),door:s.door,doorTarget:s.doorTarget,attacker:s.doorAttacker,breach:s.doorBreach.progress,mode:s.balanceDecision,finale:s.finaleTarget,route:s.route.slice(0,2),weeper:s.weeper?{phase:s.weeper.phase,p:point(s.weeper.position)}:null});
  const start=capture(),trace=[start];let image=null;let closedAt=null,breachedAt=null;const t=s.state.elapsed;
  // Stay on the room side of the door. Move physically and use E, never relocate the player.
  const d=s.level.door,box=s.level.boxes[2],center={x:d.x+d.width/2,y:d.y+d.height/2};
  const goal=d.width>d.height?{x:center.x,y:box.y<center.y?d.y-22:d.y+d.height+24}:{x:box.x<center.x?d.x-23:d.x+d.width+23,y:center.y-8};
  let route=patrolPath(s.player,goal,s.solids(),s.level.bounds,feetAt);
  for(let i=0;i<700&&!h.done;i++){
    let input={keys:[],items:[]};
    if(!closedAt&&s.door){
      while(route.length&&Math.hypot(route[0].x-s.player.x,route[0].y-s.player.y)<4)route.shift();
      const next=route[0]??goal;let best=Infinity;
      for(const [dx,dy,keys]of [[1,0,['D']],[-1,0,['A']],[0,1,['S']],[0,-1,['W']],[.707,.707,['D','S']],[.707,-.707,['D','W']],[-.707,.707,['A','S']],[-.707,-.707,['A','W']]]){const q=moveWithCollision(s.player,dx*83*.05,dy*83*.05,s.solids());const score=Math.hypot(q.x-next.x,q.y-next.y);if(score<best){best=score;input.keys=keys;}}
      if(Math.hypot(s.player.x-goal.x,s.player.y-goal.y)<6)input={keys:[],items:['E']};
    }
    h.advance(input);
    if(!s.door&&closedAt===null)closedAt=s.state.elapsed-t;
    if(closedAt!==null&&s.door&&breachedAt===null)breachedAt=s.state.elapsed-t;
    if(i%10===0)trace.push(capture());
    if(seed===2&&!image&&s.doorBreach.progress>.5)image=s.game.canvas.toDataURL('image/png');
  }
  return {seed,night:s.level.round,theme:s.level.theme,geometry:{door:d,use:s.level.doorUse,boxes:s.level.boxes,goal},finalReached:start.left>0,start,closedAt,breachedAt,end:capture(),trace,image};
 },seed);
 if(r.image)writeFileSync(out+'/door-battering.png',Buffer.from(r.image.split(',')[1],'base64'));delete r.image;
 writeFileSync(out+`/seed-${seed}.json`,JSON.stringify(r,null,2));
 assert.ok(r.finalReached,'the real campaign must collect all three fuses');assert.ok(r.closedAt!==null,'the player must close the door using E');
 if(seed===0){assert.ok(r.end.health<r.start.health,'an enemy already inside must remain dangerous');}
 else {assert.ok(r.breachedAt>3&&r.breachedAt<20,'investigate the alarm and breach before the final 10 seconds');assert.ok(r.trace.some(t=>t.doorTarget&&t.attacker==='ghost'));assert.ok(r.trace.some(t=>t.health<r.start.health&&t.left>0),'the primary must enter the room during startup');}
 console.log('Third-night room pressure passed:',JSON.stringify({seed,closedAt:r.closedAt,breachedAt:r.breachedAt}));
 }
 assert.deepEqual(errors,[]);
}finally{await b.close();}
