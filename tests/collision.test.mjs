import test from 'node:test';
import assert from 'node:assert/strict';
import {feetAt,overlaps,moveWithCollision,gaitFrame} from '../src/collision.ts';
import {monsterFeetAt,monsterArchitecture,clearContact} from '../src/collision.ts';
import {makeLevel} from '../src/levels.ts';
import {patrolPath} from '../src/patrol.ts';
test('monster head cannot enter a wall from below, even during knockback',()=>{
 const wall={x:100,y:100,width:160,height:16};
 const end=moveWithCollision({x:180,y:190},0,-200,[monsterArchitecture(wall)],monsterFeetAt);
 assert.ok(end.y-40>=wall.y+wall.height);
});
test('contact cannot damage through thin walls or slide around their corners',()=>{
 assert.equal(clearContact({x:90,y:110},{x:112,y:110},[{x:100,y:100,width:3,height:30}]),false);
 assert.equal(clearContact({x:90,y:110},{x:112,y:110},[]),true);
});
test('architecture clearance preserves patrol routes across all map themes',()=>{
 for(let n=1;n<=7;n++)for(const seed of [1,42,999]){
  const l=makeLevel(n,seed),solids=[...l.walls.map(monsterArchitecture),...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),monsterArchitecture(l.door),...(l.features??[]).filter(f=>['cache','locker'].includes(f.kind)).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8}))];
  for(const spawn of l.monsterSpawns)assert.ok(!solids.some(b=>overlaps(monsterFeetAt(spawn.x,spawn.y),b)),`spawn ${n}/${seed}`);
  const route=patrolPath(l.monsterSpawns[0],l.monsterSpawns[1],solids,l.bounds,monsterFeetAt);
  assert.ok(route.length>0,`route ${n}/${seed}`);
  let at=l.monsterSpawns[0];for(const next of route.slice(1)){at=moveWithCollision(at,next.x-at.x,next.y-at.y,solids,monsterFeetAt);assert.ok(!solids.some(b=>overlaps(monsterFeetAt(at.x,at.y),b)));}
 }
});
test('feet stop at every side of a bed, including a very large displacement',()=>{
 const bed={x:100,y:100,width:42,height:84};
 for(const [position,dx,dy] of [[{x:120,y:210},0,-150],[{x:120,y:60},0,160],[{x:60,y:140},160,0],[{x:180,y:140},-160,0]]){
  const result=moveWithCollision(position,dx,dy,[bed]);assert.equal(overlaps(feetAt(result.x,result.y),bed),false);
  assert.ok(Math.hypot(result.x-position.x,result.y-position.y)<Math.hypot(dx,dy));
 }
});
test('movement slides beside furniture and can go around it',()=>{
 const bed={x:100,y:100,width:42,height:84};
 const blocked=moveWithCollision({x:90,y:110},20,30,[bed]);assert.ok(blocked.x<94);assert.equal(blocked.y,140);
 const around=moveWithCollision({x:90,y:210},80,0,[bed]);assert.ok(Math.abs(around.x-170)<1e-6);
});
test('animation advances by ground distance and always returns to passing pose at rest',()=>{
 assert.deepEqual([0,10,20,30,40].map(d=>gaitFrame(d,true)),[0,1,2,3,0]);
 assert.equal(gaitFrame(25,false),1);
});

test('sprint release, lost keyup recovery and blur reset do not latch the modifier',async()=>{const {SprintInput}=await import('../src/runtime/sprint-input.ts');const s=new SprintInput();s.down({key:'Shift',code:'ShiftLeft',shiftKey:true});assert.equal(s.active,true);s.up({key:'Shift',code:'ShiftLeft',shiftKey:false});assert.equal(s.active,false);s.down({key:'Shift',code:'ShiftLeft',shiftKey:true});s.down({key:'d',code:'KeyD',shiftKey:false});assert.equal(s.active,false);s.down({key:'Shift',code:'ShiftLeft',shiftKey:true});s.clear();s.down({key:'Shift',code:'ShiftLeft',shiftKey:true,repeat:true});assert.equal(s.active,false);s.down({key:'Shift',code:'ShiftLeft',shiftKey:true},false);assert.equal(s.active,false);});
test('physical monster motion and knockback cannot cross a thin wall',()=>{const wall={x:100,y:60,width:8,height:140};for(const distance of [4,65,300]){const end=moveWithCollision({x:80,y:100},distance,0,[wall]);assert.ok(end.x<=93);assert.equal(overlaps(feetAt(end.x,end.y),wall),false);}});

test('wide monster footprint stops shoulders at walls through diagonal motion and knockback',async()=>{const {monsterFeetAt}=await import('../src/collision.ts');const wall={x:100,y:60,width:8,height:140};for(const dy of [-30,0,30]){const end=moveWithCollision({x:70,y:100},65,dy,[wall],monsterFeetAt);assert.ok(end.x<=86);assert.equal(overlaps(monsterFeetAt(end.x,end.y),wall),false);}});

test('patrol approaches the nearest reachable point when a locker makes the target unreachable',()=>{const wall={x:140,y:20,width:20,height:220},from={x:80,y:100},target={x:150,y:100};const path=patrolPath(from,target,[wall],{x:20,y:20,width:260,height:220},monsterFeetAt);assert.ok(path.length>1);assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<Math.hypot(from.x-target.x,from.y-target.y));assert.ok(path.every(p=>!overlaps(monsterFeetAt(p.x,p.y),wall)));});

test('patrol follows exact tight corners without cutting into furniture',async()=>{
 const {followPatrolPath}=await import('../src/patrol.ts');const solids=[{x:100,y:110,width:40,height:60}],route=[{x:80,y:94},{x:180,y:94}];let at={x:80,y:160};
 for(let i=0;i<100&&route.length;i++){const moved=followPatrolPath(at,route,117*.05,solids);assert.equal(moved.blocked,false);at=moved.position;assert.ok(!solids.some(b=>overlaps(monsterFeetAt(at.x,at.y),b)));}
 assert.ok(Math.hypot(at.x-180,at.y-94)<.01);
});
test('repeated replanning at final-chase speed actually traverses authored corridors',async()=>{
 const {followPatrolPath}=await import('../src/patrol.ts');for(const round of [2,3,4])for(const seed of [1,42]){
  const l=makeLevel(round,seed),solids=[...l.walls.map(monsterArchitecture),...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(l.features??[]).filter(f=>['cache','locker'].includes(f.kind)).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8}))];
  let at={...l.monsterSpawns[0]},target=l.monsterSpawns[1],route=[],clock=0;
  for(let i=0;i<800&&Math.hypot(at.x-target.x,at.y-target.y)>2;i++){const dt=[.016,.033,.05][i%3];clock-=dt;if(clock<=0){route=patrolPath(at,target,solids,l.bounds,monsterFeetAt);clock=.6;}const moved=followPatrolPath(at,route,117*dt,solids);at=moved.position;if(moved.blocked)clock=0;assert.ok(!solids.some(b=>overlaps(monsterFeetAt(at.x,at.y),b)));}
  assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<2,JSON.stringify({round,seed,at,target}));
 }
});

test('being close to a target across a thin obstacle does not end the search early',async()=>{
 const {followPatrolPath}=await import('../src/patrol.ts'),solids=[{x:100,y:110,width:100,height:2}],target={x:150,y:109};let at={x:150,y:85};const route=patrolPath(at,target,solids,{x:40,y:40,width:240,height:180},monsterFeetAt);
 for(let i=0;i<200&&route.length;i++)at=followPatrolPath(at,route,5.85,solids).position;
 assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<.01);
});
