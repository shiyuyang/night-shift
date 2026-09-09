import test from 'node:test';import assert from 'node:assert/strict';
import {choosePursuitEntry,PursuitSearch,routeLength} from '../src/runtime/pursuit.ts';
import {makeLevel} from '../src/levels.ts';import {monsterArchitecture,monsterFeetAt,overlaps} from '../src/collision.ts';
import {Weeper} from '../src/runtime/weeper.ts';
const bounds={x:0,y:0,width:800,height:600};
test('entry selection rejects visible and sealed entries and ranks the actual walking route',()=>{
 const wall={x:400,y:0,width:24,height:490},player={x:340,y:240},entries=[{x:600,y:240},{x:80,y:240},{x:100,y:520}];
 const chosen=choosePursuitEntry(entries,player,[wall],bounds,90,p=>p.y===520);assert.deepEqual(chosen.position,entries[1]);assert.ok(chosen.seconds<4);
 assert.equal(choosePursuitEntry(entries,player,[wall],bounds,90,()=>true),undefined);
 const seal=[{x:40,y:-30,width:16,height:660}];assert.equal(choosePursuitEntry([{x:20,y:240}],player,seal,bounds,90,()=>false),undefined);
});
test('all seven maps have multiple reachable entries within useful approach distance',()=>{
 for(let round=1;round<=7;round++){
  const l=makeLevel(round),solids=[...l.walls.map(monsterArchitecture),...l.props,monsterArchitecture(l.door)];assert.ok(l.monsterEntries.length>=8);
  for(const player of [l.spawn,l.key,l.boxes[0]]){const c=choosePursuitEntry([...l.monsterSpawns,...l.monsterEntries],player,solids,l.bounds,95,p=>Math.hypot(p.x-player.x,p.y-player.y)<250);assert.ok(c,JSON.stringify({round,player}));assert.ok(c.seconds<12,JSON.stringify({round,seconds:c.seconds}));assert.ok(!solids.some(b=>overlaps(monsterFeetAt(c.position.x,c.position.y),b)));}
 }
});
test('search follows remembered position, checks branches, expires and freezes on pause',()=>{
 const s=new PursuitSearch(),last={x:300,y:300},from={x:100,y:300};s.tick(.1,from,last,[],bounds);assert.equal(s.remaining,12);assert.deepEqual(s.points[0],last);assert.ok(s.points.length>=3);const next=s.tick(1,last,last,[],bounds);assert.notDeepEqual(next,last);assert.equal(s.remaining,11);s.tick(0,next,last,[],bounds);assert.equal(s.remaining,11);s.tick(12,next,last,[],bounds);assert.equal(s.remaining,0);s.reset();assert.equal(s.points.length,0);
});
test('closed doors lead to a reachable search position instead of endless pursuit into a wall',()=>{
 const s=new PursuitSearch(),wall={x:400,y:-30,width:20,height:660},last={x:500,y:300};s.tick(.1,{x:250,y:300},last,[wall],bounds);assert.ok(s.points[0].x<400);const at={...s.points[0]};s.tick(13,at,last,[wall],bounds);assert.equal(s.remaining,0);
});
const input=(extra={})=>({player:{x:320,y:200},hidden:false,angle:Math.PI,light:true,lightRange:250,sprinting:false,noise:false,solids:[],architecture:[],bounds,immune:false,...extra});
test('far beam startles and sustained light wakes her; walls, darkness and battery range prevent it',()=>{
 const w=new Weeper({x:100,y:200});w.grace=0;w.tick(.15,input());assert.ok(w.noticed&&w.anger>0);assert.equal(w.phase,'alert');for(let i=0;i<65&&w.phase!=='warning';i++)w.tick(.05,input());assert.equal(w.phase,'warning');
 for(const overrides of [{light:false},{lightRange:190},{angle:0},{solids:[{x:200,y:0,width:10,height:600}]}]){const q=new Weeper({x:100,y:200});q.grace=0;for(let i=0;i<70;i++)q.tick(.05,input(overrides));assert.equal(q.anger,0);}
});
test('one roaming patient walks around walls, stops to cry, and never crosses a closed barrier',()=>{
 const w=new Weeper({x:100,y:200},[{x:330,y:200}]),wall={x:190,y:100,width:20,height:240};const state=input({player:{x:700,y:500},light:false,solids:[wall],architecture:[wall]});let moved=false,arrived=false;
 for(let i=0;i<550;i++){w.tick(.05,state);moved ||=w.roaming;arrived ||=Math.hypot(w.position.x-330,w.position.y-200)<8;assert.equal(overlaps(monsterFeetAt(w.position.x,w.position.y),wall),false);assert.equal(w.dangerous,false);}
 assert.ok(moved&&arrived);const at={...w.position};w.tick(0,state);assert.deepEqual(w.position,at);
});

 test('finale entry may approach a breachable door while ordinary pursuit still requires an open route',()=>{
  const l=makeLevel(1),door=monsterArchitecture(l.door),target={x:l.boxes[2].x,y:l.boxes[2].y+24};
  const solids=[...l.walls.map(monsterArchitecture),...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),door];
  const entries=[...l.monsterSpawns,...l.monsterEntries];
  assert.equal(choosePursuitEntry(entries,target,solids,l.bounds,111,()=>false),undefined);
  const entry=choosePursuitEntry(entries,target,solids,l.bounds,111,()=>false,door);
  assert.ok(entry);assert.ok(!solids.some(b=>overlaps(monsterFeetAt(entry.position.x,entry.position.y),b)));
  assert.ok(Math.hypot(entry.route.at(-1).x-target.x,entry.route.at(-1).y-target.y)<35);
  assert.equal(choosePursuitEntry(entries,target,solids,l.bounds,111,()=>true,door),undefined);
 });
