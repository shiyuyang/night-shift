import test from 'node:test';import assert from 'node:assert/strict';
import {ExitPatrol} from '../src/runtime/exit-patrol.ts';
import {DailyPatrol} from '../src/runtime/daily-patrol.ts';
import {exitPatrolPoints,exitPatrolOrigin} from '../src/runtime/patrol-density.ts';
import {makeLevel} from '../src/levels.ts';
import {monsterFeetAt,monsterArchitecture,overlaps} from '../src/collision.ts';
import {patrolPath} from '../src/patrol.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const points=[{x:200,y:100},{x:400,y:100},{x:700,y:400}],bounds={x:0,y:0,width:1200,height:800};
test('exit duty cannot time out fresh sight and returns only after bounded clue search',()=>{
 const d=new ExitPatrol(),p={x:900,y:100},base={position:p,points,seen:true,clue:{x:1000,y:100}};
 for(let i=0;i<800;i++)d.tick(.05,base);assert.equal(d.mode,'chase');
 d.tick(0,{...base,seen:false});assert.equal(d.mode,'chase');
 for(let i=0;i<79;i++)d.tick(.05,{...base,seen:false});assert.equal(d.mode,'clue-search');
 d.tick(.1,{...base,seen:false});assert.equal(d.mode,'local-search');
 for(let i=0;i<61;i++)d.tick(.05,{...base,seen:false});assert.equal(d.mode,'exit-return');assert.ok(points.some(p=>distance(p,d.target)<1));
 d.tick(.05,{...base,seen:true});assert.equal(d.mode,'chase');assert.deepEqual(d.target,base.clue);
});
test('exit patrol advances waypoints on arrival or unreachable routes without acquiring a player',()=>{
 const d=new ExitPatrol();d.tick(.1,{position:points[0],points,seen:false});assert.deepEqual(d.target,points[1]);
 d.tick(.1,{position:points[0],points,seen:false,blocked:true});assert.deepEqual(d.target,points[2]);
});
test('all seven maps provide legal exit patrol points 180–360 walking units from the exit',()=>{
 for(let night=1;night<=7;night++)for(const seed of [0,42]){
  const l=makeLevel(night,seed),solids=[...l.walls.map(monsterArchitecture),...l.props,monsterArchitecture(l.door)];
  const goals=exitPatrolPoints(l.exit,[...l.monsterEntries??[],...l.monsterSpawns,...l.boxes.map(p=>({x:p.x,y:p.y+28}))],solids,l.bounds);
  assert.ok(goals.length>=1&&goals.length<=2,`${night}/${seed}`);
  for(const goal of goals){assert.ok(!solids.some(b=>overlaps(monsterFeetAt(goal.x,goal.y),b)));const origin=exitPatrolOrigin(l.exit,solids,l.bounds);let length=distance(origin,l.exit),prev=origin;const path=patrolPath(prev,goal,solids,l.bounds,monsterFeetAt);for(const p of path){length+=distance(prev,p);prev=p;}assert.ok(distance(prev,goal)<24);assert.ok(length>=175&&length<=361,`${night}/${seed}: ${length}`);}
 }
});
test('daily no-contact and escape clocks run concurrently; busy actors retain their assignment',()=>{
 const d=new DailyPatrol(),base={position:{x:100,y:100},points,solids:[],bounds,contact:false,engaged:false,busy:true,rest:false};
 // A five-second encounter ends, then fifteen seconds without contact.
 d.tick(.05,{...base,contact:true,engaged:true});d.tick(.05,base);assert.equal(d.respite,10);
 for(let i=0;i<200;i++)d.tick(.05,base);assert.ok(d.respite<.01);assert.ok(d.noContact<15);assert.equal(d.target,undefined);
 for(let i=0;i<100;i++)d.tick(.05,base);d.tick(.05,{...base,busy:false});assert.equal(d.reason,'no-contact-coverage');assert.ok(d.noContact<16);assert.ok(d.target);
 const target={...d.target},clock=d.noContact;d.tick(0,base);assert.deepEqual(d.target,target);assert.equal(d.noContact,clock);
 d.tick(20,base);assert.deepEqual(d.target,target);
});
test('rest night waits twenty seconds; region selection stays legal and never needs player coordinates',()=>{
 const d=new DailyPatrol(),base={position:{x:100,y:100},points,solids:[],bounds,contact:false,engaged:false,busy:true,rest:true};
 for(let i=0;i<380;i++)d.tick(.05,base);d.tick(.05,{...base,busy:false});assert.equal(d.reason,'initial-coverage');
 for(let i=0;i<21;i++)d.tick(.05,{...base,busy:false});assert.equal(d.reason,'no-contact-coverage');
 const first=d.target;d.tick(.05,{...base,position:first,busy:false});assert.notDeepEqual(d.target,first);
 const wall={x:450,y:0,width:30,height:800},e=new DailyPatrol();e.tick(.05,{...base,busy:false,solids:[wall]});assert.ok(e.target.x<450);
});
