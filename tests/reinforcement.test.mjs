import test from 'node:test';import assert from 'node:assert/strict';
import {Reinforcement} from '../src/runtime/reinforcement.ts';
const input=(extra={})=>({player:{x:350,y:150},hidden:false,retreat:false,visible:()=>false,solids:[],bounds:{x:0,y:0,width:800,height:500},...extra});
test('reinforcement moves immediately, follows real paths and grants the full flash escape window',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:350,y:150});assert.equal(r.warning,0);r.tick(.2,input());assert.ok(r.position.x>100);assert.equal(r.flash({x:200,y:150},[]),true);const flashed={...r.position};r.tick(1.9,input());assert.deepEqual(r.position,flashed);r.tick(.2,input());assert.notDeepEqual(r.position,flashed);
});
test('closed walls block contact; a decoy redirects and explicit retreat clears a physical patrol',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:500,y:150});r.warning=0;
 for(let i=0;i<80;i++)r.tick(.05,input({player:{x:500,y:150},distraction:{x:100,y:270}}));assert.ok(r.position.y<190);assert.ok(r.position.x>100);
 r.tick(.1,input({retreat:true}));assert.equal(r.position,null);assert.equal(r.used,true);
 const other=new Reinforcement();other.spawn({x:100,y:150},{x:130,y:150});other.warning=0;
 const wall={x:114,y:0,width:10,height:400};for(let i=0;i<60;i++)assert.equal(other.tick(.05,input({player:{x:130,y:150},solids:[wall]})),false);
});

test('interceptor searches locally after reaching the fixed checkpoint',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:300,y:150});
 for(let i=0;i<120;i++)r.tick(.05,input({player:{x:700,y:350},goal:{x:300,y:150},speed:115}));
 assert.ok(r.searchAnchor);assert.ok(Math.hypot(r.searchAnchor.x-300,r.searchAnchor.y-150)<1);assert.ok(Math.hypot(r.position.x-300,r.position.y-150)>10);assert.ok(Math.hypot(r.position.x-300,r.position.y-150)<=100);assert.deepEqual(r.target,{x:300,y:150});
});

import {exitEntries,returnCheckpoints} from '../src/runtime/patrol-density.ts';
import {makeLevel} from '../src/levels.ts';
import {monsterArchitecture,monsterFeetAt,overlaps} from '../src/collision.ts';
import {patrolPath} from '../src/patrol.ts';
test('all maps support spaced exit-side entries and forward return checkpoints',()=>{
 for(let round=1;round<=7;round++){
  const l=makeLevel(round,42),player={x:l.boxes[2].x,y:l.boxes[2].y+24};
  const solids=[...l.walls.map(monsterArchitecture),...l.props];
  const a=exitEntries(l.exit,player,[],solids,l.bounds)[0];assert.ok(a);
  const b=exitEntries(l.exit,player,[a],solids,l.bounds)[0];assert.ok(b);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=64);
  for(const point of [a,b]){assert.ok(Math.hypot(point.x-l.exit.x,point.y-l.exit.y)<=224);assert.ok(!solids.some(s=>overlaps(monsterFeetAt(point.x,point.y),s)));}
  const targets=returnCheckpoints(player,l.exit,solids,l.bounds);assert.equal(targets.length,2);assert.notDeepEqual(targets[0],targets[1]);
  for(const target of targets){const route=patrolPath(a,target,solids,l.bounds,monsterFeetAt);assert.ok(Math.hypot(route.at(-1).x-target.x,route.at(-1).y-target.y)<35);}
 }
});

test('exit guard holds six seconds, freezes on pause and responds to a visible approaching player',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:700,y:150},6);
 const distant=input({player:{x:700,y:150},goal:{x:500,y:150},doorTarget:{x:600,y:150}});
 for(let i=0;i<110;i++)r.tick(.05,distant);
 assert.ok(Math.hypot(r.position.x-100,r.position.y-150)<.01);
 const clock=r.guard;r.tick(0,distant);assert.equal(r.guard,clock);
 for(let i=0;i<20;i++)r.tick(.05,distant);assert.ok(r.position.x>120);
 const early=new Reinforcement();early.spawn({x:100,y:150},{x:500,y:150},6);
 early.tick(.05,input({player:{x:300,y:150},goal:{x:500,y:150}}));assert.equal(early.guard,0);assert.ok(early.position.x>100);
 const hidden=new Reinforcement();hidden.spawn({x:100,y:150},{x:500,y:150},6);
 hidden.tick(.05,input({player:{x:200,y:150},hidden:true}));assert.ok(hidden.guard>5);
});

test('interceptor keeps last clue across a wall instead of learning the hidden route',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:180,y:150});
 r.tick(.05,input({player:{x:180,y:150}}));const clue={...r.target};
 const wall={x:220,y:0,width:20,height:500};
 for(let i=0;i<100;i++)r.tick(.05,input({player:{x:500,y:300},solids:[wall],goal:{x:150,y:250}}));
 assert.deepEqual(r.target,clue);assert.equal(r.clueClock,0);assert.ok(r.position.x<220);
});

test('exit patroller slows while searching after sight is broken',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:350,y:150});
 r.tick(.8,input({hidden:true}));assert.equal(r.sightLock.searching,true);
 const before={...r.position};r.tick(.1,input({hidden:true}));
 assert.ok(Math.abs(Math.hypot(r.position.x-before.x,r.position.y-before.y)-107*.65*.1)<.001);
});


test('unreachable checkpoint becomes a local search instead of a permanent stop',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:500,y:150});const wall={x:250,y:-50,width:20,height:650};
 const options=input({player:{x:700,y:400},goal:{x:500,y:150},solids:[wall]});
 for(let i=0;i<260;i++)r.tick(.05,options);
 assert.ok(r.searchAnchor);assert.ok(r.searchAnchor.x<250);assert.ok(r.searchGoal);assert.ok(r.position.x<250);assert.ok(!overlaps(monsterFeetAt(r.position.x,r.position.y),wall));
 const before={...r.position},idle=r.idle;r.tick(0,options);assert.deepEqual(r.position,before);assert.equal(r.idle,idle);
 // A new, now reachable checkpoint invalidates the old local search.
 r.tick(.05,{...options,goal:{x:600,y:150},solids:[]});assert.equal(r.searchAnchor,null);
});

test('local search yields to a spotted player and flash keeps its full stun',()=>{
 const r=new Reinforcement();r.spawn({x:100,y:150},{x:100,y:150});
 for(let i=0;i<140;i++)r.tick(.05,input({hidden:true}));assert.ok(r.searchAnchor);
 const player={x:r.position.x+30,y:r.position.y};r.tick(.05,input({player}));assert.equal(r.searchAnchor,null);assert.deepEqual(r.target,player);
 assert.equal(r.flash(player,[]),true);const before={...r.position};r.tick(1.9,input({player}));assert.deepEqual(r.position,before);
});

test('landed-hit recovery pauses only its attacker, retains sight, freezes on pause and overlaps flash',()=>{
 const a=new Reinforcement(),b=new Reinforcement();a.spawn({x:100,y:150},{x:180,y:150});b.spawn({x:100,y:150},{x:180,y:150});
 a.attackRecovery.hit();const start={...a.position};const seen=input({player:{x:180,y:150}});
 a.tick(.6,seen);b.tick(.6,seen);assert.deepEqual(a.position,start);assert.ok(b.position.x>100);assert.deepEqual(a.target,seen.player);
 const remaining=a.attackRecovery.remaining;a.tick(0,seen);assert.equal(a.attackRecovery.remaining,remaining);
 assert.ok(a.flash(seen.player,[]));const flashed={...a.position};a.tick(.2,seen);assert.equal(a.attackRecovery.active,false);assert.deepEqual(a.position,flashed);a.tick(1.7,seen);assert.deepEqual(a.position,flashed);a.tick(.2,seen);assert.notDeepEqual(a.position,flashed);
 a.attackRecovery.hit();a.spawn({x:100,y:150},{x:180,y:150});assert.equal(a.attackRecovery.active,false);
});
