import test from 'node:test';import assert from 'node:assert/strict';
import {difficultyForNight as d} from '../src/runtime/difficulty.ts';import {makeLevel} from '../src/levels.ts';import {chooseWeeper,weeperRoamPoints} from '../src/runtime/weeper-placement.ts';import {Blackouts} from '../src/runtime/blackouts.ts';import {DoorBreach} from '../src/runtime/door-breach.ts';import {encounterProfile,tuning} from '../src/runtime/pacing.ts';
test('onboarding gates, breaching and bounded pursuit form the agreed staircase',()=>{
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
