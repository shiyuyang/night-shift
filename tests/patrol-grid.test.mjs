import test from 'node:test';
import assert from 'node:assert/strict';
import {patrolPath} from '../src/patrol.ts';
import {referencePatrolPath} from './helpers/patrol-reference.ts';
import {makeLevel} from '../src/levels.ts';
import {feetAt,monsterFeetAt,monsterArchitecture} from '../src/collision.ts';
const same=(from,to,solids,bounds,footprint=monsterFeetAt)=>assert.deepEqual(patrolPath(from,to,solids,bounds,footprint),referencePatrolPath(from,to,solids,bounds,footprint));

test('cached patrol routes preserve every waypoint across maps, doors, footprints and fractional starts',()=>{
 for(let night=1;night<=7;night++)for(const seed of [0,42]){
  const l=makeLevel(night,seed);
  for(const open of [false,true])for(const footprint of [feetAt,monsterFeetAt]){
   const walls=footprint===monsterFeetAt?l.walls.map(monsterArchitecture):l.walls;
   const solids=[...walls,...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(l.features??[]).filter(f=>['cache','locker'].includes(f.kind)).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8})),...(open?[]:[footprint===monsterFeetAt?monsterArchitecture(l.door):l.door])];
   const from={x:l.monsterSpawns[0].x+.3,y:l.monsterSpawns[0].y-.6};
   same(from,l.monsterSpawns[1],solids,l.bounds,footprint);same(from,l.boxes[2],solids,l.bounds,footprint);
  }
 }
});

test('patrol cache invalidates on in-place doors, drawer movement and replacement geometry',()=>{
 const bounds={x:16,y:16,width:600,height:400},from={x:64.3,y:280.1},target={x:540,y:120};
 const solids=[{x:16,y:200,width:280,height:16},{x:360,y:200,width:256,height:16}],door={x:296,y:200,width:64,height:16};
 same(from,target,solids,bounds);solids.push(door);same(from,target,solids,bounds);solids.pop();same(from,target,solids,bounds);
 const drawer={x:240,y:310,width:120,height:18};solids.push(drawer);same(from,target,solids,bounds);drawer.y=266;drawer.height=50;same(from,target,solids,bounds);solids.splice(0,1);same(from,target,solids,bounds);
 // Revisit a world after enough distinct worlds to exceed the bounded cache.
 for(let i=0;i<12;i++)same(from,target,[...solids,{x:100+i*9,y:80,width:6,height:30}],bounds);
 same(from,target,solids.map(b=>({...b})),bounds);
});

test('thin obstacles, exact touching, blocked targets and unusual bounds retain the old path contract',()=>{
 let state=42;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
 for(let i=0;i<100;i++){
  const bounds={x:-32.5,y:-16,width:288.5,height:208},solids=Array.from({length:5},()=>({x:Math.floor(rng()*28)*8,y:Math.floor(rng()*18)*8,width:[0,.1,8,16,32][Math.floor(rng()*5)],height:[0,.1,8,16,40][Math.floor(rng()*5)]}));
  const from={x:Math.round(rng()*20)*8+(i%3===0?.25:0),y:Math.round(rng()*16)*8+(i%3===0?-.3:0)},target=i%3===0?{x:solids[0].x+1,y:solids[0].y+1}:{x:Math.round(rng()*28)*8,y:Math.round(rng()*18)*8};
  for(const footprint of [feetAt,monsterFeetAt])same(from,target,solids,bounds,footprint);
 }
});

test('arbitrary position-dependent footprints and out-of-grid starts keep their semantics',()=>{
 const bounds={x:20,y:20,width:220,height:180},solids=[{x:110,y:20,width:12,height:100}];
 const changing=(x,y)=>({x:x-6,y:y+4,width:x>80?18:12,height:8});
 for(const footprint of [feetAt,monsterFeetAt,changing])for(const from of [{x:18,y:24},{x:64.1,y:160.2},{x:22,y:18}])same(from,{x:216,y:32},solids,bounds,footprint);
});
