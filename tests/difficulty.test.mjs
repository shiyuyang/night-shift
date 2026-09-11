import test from 'node:test';import assert from 'node:assert/strict';
import {difficultyForNight as d} from '../src/runtime/difficulty.ts';import {makeLevel} from '../src/levels.ts';import {chooseWeeper,weeperRoamPoints} from '../src/runtime/weeper-placement.ts';import {Blackouts} from '../src/runtime/blackouts.ts';import {DoorBreach} from '../src/runtime/door-breach.ts';import {encounterProfile,tuning} from '../src/runtime/pacing.ts';
import {roundRules} from '../src/run-rules.ts';import {loadLevel} from '../src/runtime/map-loader.ts';
test('onboarding gates, breaching and bounded pursuit form the agreed staircase',()=>{
 assert.equal(d(3).speedCap,d(2).speedCap);assert.equal(d(3).finaleSpeed,d(2).finaleSpeed);assert.ok(d(4).finaleSpeed>d(3).finaleSpeed);
 for(let n=1;n<=20;n++){const p=d(n);assert.equal(p.interceptor,n>=4);assert.equal(p.boxBlink,n>=5);assert.equal(p.weeper,n<3?'none':n<5?'fixed':'roaming');
  const door=new DoorBreach(p.breachSeconds);door.tick(p.breachSeconds-.01,true);assert.equal(door.broken,false);door.tick(.02,true);assert.ok(door.broken);
  for(let f=0;f<=3;f++){const speed=encounterProfile(n,f,5).speed;assert.ok(speed>tuning.walkSpeed&&speed<tuning.sprintSpeed);}
  const b=new Blackouts(()=>0);b.tick(3,1,n,false,false);b.tick(1.2,1,n,false,false);assert.equal(b.remaining>0,n>=5);
 }
});
test('nights 3 and 4 remain fixed; night 5 has both absent and roaming seeded outcomes',()=>{
 for(const n of [1,2,3,4]){const l=makeLevel(n,42),w=chooseWeeper(l,42);if(n<3)assert.equal(w,undefined);else{assert.ok(w);assert.deepEqual(weeperRoamPoints(l,w),[]);}}
 const l=makeLevel(5,42);let absent=0,roaming=0;
 for(let seed=0;seed<32;seed++){const w=chooseWeeper(l,seed);if(!w)absent++;else{roaming++;assert.ok(weeperRoamPoints(l,w).length>0);}}
 assert.ok(absent>0&&roaming>0,{absent,roaming});
});
test('initial supplies support opening lessons before settling at the endless budget',()=>{for(let n=1;n<=12;n++){assert.equal(d(n).startingFlashes,n<=2?4:2);assert.equal(d(n).startingDecoys,n<=2?4:2);}});
test('endless combinations repeat with bounded rules across the complete 252-night cycle',()=>{
 const combinations=new Set(),mapMonsterPairs=new Set();
 for(let n=8;n<260;n++){
  assert.deepEqual(d(n),d(n+252));const a=roundRules(n),b=roundRules(n+252),l=loadLevel(n),next=loadLevel(n+252);
  assert.equal(a.threat,b.threat);assert.equal(a.event,b.event);assert.equal(l.theme,next.theme);assert.deepEqual(l.boxes,next.boxes);
  combinations.add(l.theme+'/'+a.threat+'/'+a.event+'/'+d(n).endlessRest);
  mapMonsterPairs.add(l.theme+'/'+a.threat);
  for(const f of [0,1,2,3])for(const remaining of [30,9,0]){const e=encounterProfile(n,f,remaining);assert.ok(e.speed>tuning.walkSpeed&&e.speed<tuning.sprintSpeed);assert.ok(e.rest>=8&&e.rest<=29);}
 }
 assert.equal(combinations.size,126);assert.equal(mapMonsterPairs.size,21);
 for(const n of [9999,1000000]){assert.deepEqual(d(n),d(n-252));assert.ok(Number.isFinite(encounterProfile(n,3,0).speed));}
});
