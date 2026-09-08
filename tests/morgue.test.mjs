import test from 'node:test';import assert from 'node:assert/strict';
import {MorgueDrawer} from '../src/runtime/morgue-drawer.ts';import {makeLevel} from '../src/levels.ts';import {validatePlayableLevel} from '../src/runtime/level-validation.ts';import {patrolPath} from '../src/patrol.ts';import {feetAt,monsterFeetAt,monsterArchitecture} from '../src/collision.ts';
test('drawer warns for three seconds, waits for clear sweep, reserves collision, then extends once',()=>{
 const area={x:100,y:100,width:50,height:100},d=new MorgueDrawer(area);
 assert.equal(d.tick(1,1,true,[]),undefined);assert.equal(d.phase,'idle');assert.equal(d.tick(.1,2,true,[]),'warning');assert.deepEqual(d.solids,[]);
 d.tick(2.9,2,true,[]);assert.equal(d.phase,'warning');d.tick(10,2,true,[feetAt(120,150)]);assert.equal(d.phase,'warning');
 assert.equal(d.tick(.1,2,true,[]),'slide');assert.deepEqual(d.solids,[area]);d.tick(.75,2,true,[]);assert.equal(d.progress,.5);d.tick(0,2,true,[]);assert.equal(d.progress,.5);
 d.tick(.75,2,true,[]);assert.equal(d.phase,'open');d.tick(50,3,true,[]);assert.equal(d.phase,'open');assert.deepEqual(d.solids,[area]);assert.equal(new MorgueDrawer(area).phase,'idle');
});
test('final fuse cancels a pending warning; wide bodies also postpone the drawer',()=>{
 const area={x:100,y:100,width:50,height:100},d=new MorgueDrawer(area);d.tick(.1,2,true,[]);d.tick(8,2,true,[monsterFeetAt(90,160)]);assert.equal(d.phase,'warning');d.tick(.1,3,true,[]);assert.equal(d.phase,'cancelled');d.tick(50,3,true,[]);assert.deepEqual(d.solids,[]);
});
test('morgue remains solvable before and after the drawer for 60 random searches',()=>{
 for(let seed=0;seed<60;seed++){
  const l=makeLevel(6,seed);assert.ok(validatePlayableLevel(l).valid,`before ${seed}`);l.props.push({...l.zones.MorgueDrawerZone,kind:'machine'});assert.ok(validatePlayableLevel(l).valid,`after ${seed}`);
 }
});
test('morgue north passage closes, while the transport spine remains traversable for both actors',()=>{
 const l=makeLevel(6),drawer=l.zones.MorgueDrawerZone;
 for(const footprint of [feetAt,monsterFeetAt]){
  const base=[...l.walls.map(w=>footprint===monsterFeetAt?monsterArchitecture(w):w),...l.props,l.door];
  const from={x:580,y:205},to={x:800,y:205};
  const before=patrolPath(from,to,base,l.bounds,footprint),after=patrolPath(from,to,[...base,drawer],l.bounds,footprint);
  assert.ok(before.length&&after.length);assert.ok(before.every(p=>p.y<264));assert.ok(after.some(p=>p.y>432));assert.ok(Math.hypot(after.at(-1).x-to.x,after.at(-1).y-to.y)<1);
  const south=patrolPath({x:100,y:490},{x:1190,y:490},[...base,drawer],l.bounds,footprint);assert.ok(south.every(p=>p.y>=448&&p.y<550));assert.ok(south.at(-1).x>1180);
 }
});
