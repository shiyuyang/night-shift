import test from 'node:test';import assert from 'node:assert/strict';import {roundRules,lightSlows} from '../src/run-rules.ts';import {patrolPath} from '../src/patrol.ts';import {makeLevel} from '../src/levels.ts';import {feetAt,overlaps,moveWithCollision} from '../src/collision.ts';
test('rule combinations vary and light counterplay requires facing, range, and battery',()=>{assert.equal(new Set(Array.from({length:12},(_,i)=>roundRules(i+1).threat)).size,3);assert.equal(new Set(Array.from({length:12},(_,i)=>roundRules(i+1).event)).size,3);assert.notEqual(roundRules(1).threat,roundRules(4).threat);assert.notEqual(roundRules(1).event,roundRules(4).event);assert.equal(lightSlows(0,100,0,20),true);assert.equal(lightSlows(Math.PI,100,0,20),false);assert.equal(lightSlows(0,300,0,20),false);assert.equal(lightSlows(0,100,0,0),false);});
test('patroller routes through open doors but cannot enter the sealed room',()=>{for(let n=1;n<=3;n++){const l=makeLevel(n),s=[...l.walls,...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))],target={x:810,y:210};const closed=patrolPath(l.spawn,target,[...s,l.door]);assert.ok(Math.hypot(closed.at(-1).x-target.x,closed.at(-1).y-target.y)>=20);let at=l.spawn;for(const next of closed.slice(1)){at=moveWithCollision(at,next.x-at.x,next.y-at.y,[...s,l.door]);assert.ok(![...s,l.door].some(b=>overlaps(feetAt(at.x,at.y),b)));}const open=patrolPath(l.spawn,target,s);assert.ok(Math.hypot(open.at(-1).x-target.x,open.at(-1).y-target.y)<20);}});

test('pursuit escalates with collection but sprint remains faster at every stage',async()=>{const {encounterProfile,tuning}=await import('../src/runtime/pacing.ts');for(const round of [1,2,1000]){const early=encounterProfile(round,0),late=encounterProfile(round,3);assert.ok(early.speed>tuning.walkSpeed);assert.ok(late.speed>early.speed);assert.ok(late.speed<tuning.sprintSpeed);assert.ok(late.duration>early.duration);assert.ok(late.rest<early.rest);}});
test('sprint is bounded, cannot stutter through exhaustion, and pause preserves recovery',async()=>{const {Stamina}=await import('../src/runtime/pacing.ts');const s=new Stamina();s.tick(4,true);assert.equal(s.value,0);assert.equal(s.canSprint,false);s.tick(0,false);assert.equal(s.value,0);s.tick(1.2,false);assert.equal(s.value,0);s.tick(1,false);assert.equal(s.canSprint,false);s.tick(.5,false);assert.equal(s.canSprint,true);s.reset();assert.equal(s.value,100);});

test('healing reports actual restored health and feedback freezes and resets',async()=>{const {Feedback}=await import('../src/runtime/feedback.ts');const f=new Feedback();f.healed(80,100);assert.equal(f.healAmount,20);assert.ok(f.heal>0);f.tick(0);assert.equal(f.heal,1.4);f.hurt('right');assert.equal(f.hitSide,'right');f.tick(.6);assert.equal(f.damage,0);assert.ok(f.heal>0);f.reset();assert.equal(f.heal,0);assert.equal(f.used.Q,0);f.healed(100,100);assert.equal(f.heal,0);});


test('blackout warning, recovery, finale and pause share one clock',async()=>{
 const {Blackouts}=await import('../src/runtime/blackouts.ts');const b=new Blackouts(()=>0);
 b.tick(50,0,2,false,false);assert.equal(b.remaining,0);
 assert.equal(b.tick(3,1,2,false,false),'warning');assert.equal(b.remaining,0);
 b.tick(0,1,2,false,false);assert.equal(b.warning,1.2);
 assert.equal(b.tick(1.2,1,2,false,false),'outage');assert.equal(b.remaining,5);
 assert.equal(b.start(),false);b.tick(5,1,2,false,false);assert.equal(b.remaining,0);assert.equal(b.start(),false);
 b.tick(14,1,2,false,false);assert.equal(b.start(),false);b.tick(1,1,2,false,false);assert.equal(b.start(),true);
 assert.equal(b.start(6,true),true);assert.equal(b.remaining,6);b.tick(6,3,2,false,false);assert.equal(b.warning,0);b.tick(100,3,2,false,false);assert.equal(b.remaining,0);
 b.reset();assert.equal(b.armed,false);assert.equal(b.tick(3,1,2,false,true),undefined);assert.equal(b.warning,0);
});
test('final fuse raises speed sharply but preserves sprint escape and short recovery',async()=>{
 const {encounterProfile}=await import('../src/runtime/pacing.ts');for(const round of [2,3,20]){assert.ok(encounterProfile(round,3).speed-encounterProfile(round,2).speed>=10);assert.equal(encounterProfile(round,3).rest,8);}
});
