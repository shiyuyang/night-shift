import test from 'node:test';import assert from 'node:assert/strict';import {makeLevel,commands} from '../src/levels.ts';import {feetAt,overlaps} from '../src/collision.ts';
test('opening nights follow the authored itinerary while endless rotation stays unchanged',()=>{
 assert.deepEqual(Array.from({length:7},(_,i)=>makeLevel(i+1).theme),[0,3,1,6,4,5,2]);
 for(let night=8;night<=35;night++)assert.equal(makeLevel(night).theme,(night-1)%7);
 assert.deepEqual(makeLevel(1,1),makeLevel(1,999));
 assert.notDeepEqual(makeLevel(8,1).boxes,makeLevel(8,999).boxes);
});
function reachable(level,open){const solids=[...level.walls,...level.props,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(open?[]:[level.door])];const nodes=[],queue=[[level.spawn.x,level.spawn.y]],seen=new Set([`${level.spawn.x},${level.spawn.y}`]);for(let n=0;n<queue.length;n++){const [x,y]=queue[n];nodes.push({x,y});for(const [dx,dy]of [[6,0],[-6,0],[0,6],[0,-6]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx<level.bounds.x||nx>level.bounds.x+level.bounds.width||ny<level.bounds.y||ny>level.bounds.y+level.bounds.height||seen.has(k)||solids.some(b=>overlaps(feetAt(nx,ny),b)))continue;seen.add(k);queue.push([nx,ny]);}}return v=>nodes.some(n=>Math.hypot(n.x-v.x,n.y-v.y)<32);}
test('all fourteen placement variants remain solvable; locked room cannot bypass the door',()=>{for(let i=1;i<=14;i++){const l=makeLevel(i),closed=reachable(l,false),open=reachable(l,true);assert.ok(closed(l.key),`key ${i}`);assert.ok(closed(l.boxes[0]),`free box ${i}`);assert.ok(closed(l.doorUse),`door ${i}`);assert.equal(closed(l.boxes[2]),false,`locked room ${i}`);for(const b of l.boxes)assert.ok(open(b),`box ${i}`);assert.ok(open(l.exit),`exit ${i}`);}});
test('seven geometries, repeatable rounds, no finite final round',()=>{assert.equal(new Set([1,2,3,4,5,6,7].map(n=>JSON.stringify(makeLevel(n).walls))).size,7);assert.notDeepEqual(makeLevel(1).boxes,makeLevel(8).boxes);assert.deepEqual(makeLevel(1000),makeLevel(1000));assert.equal(makeLevel(1000).round,1000);assert.equal(commands.length,8);});

test('all levels load authored geometry, lights, bounds and distinct events',()=>{for(let n=1;n<=7;n++){const l=makeLevel(n);assert.match(l.source,/\.ldtk$/);assert.ok(l.events.length);assert.ok(l.lamps.length>=4);assert.equal(l.width,1280);assert.equal(l.height,768);}assert.equal(new Set([1,2,3,4,5,6,7].map(n=>makeLevel(n).events[0].id)).size,7);});
test('patrol accepts larger map bounds instead of clipping to the original map',async()=>{const {patrolPath}=await import('../src/patrol.ts');const path=patrolPath({x:1008,y:120},{x:1152,y:120},[],{x:990,y:90,width:240,height:200});assert.ok(path.length>0);assert.ok(path.at(-1).x>1100);});

test('expanded ward has a traversable workroom loop for both actor footprints',async()=>{
 const {patrolPath}=await import('../src/patrol.ts');const {monsterFeetAt,monsterArchitecture}=await import('../src/collision.ts');
 const level=makeLevel(1),stops=[{x:636,y:414},{x:636,y:625},{x:1010,y:625},{x:1116,y:414},{x:636,y:414}];
 for(const footprint of [feetAt,monsterFeetAt]){
  const solids=[...level.walls.map(w=>footprint===monsterFeetAt?monsterArchitecture(w):w),...level.props,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),level.door];
  for(let i=1;i<stops.length;i++){const path=patrolPath(stops[i-1],stops[i],solids,level.bounds,footprint);assert.ok(Math.hypot(path.at(-1).x-stops[i].x,path.at(-1).y-stops[i].y)<1,`loop segment ${i}`);}
 }
 assert.ok(level.props.some(p=>p.kind==='desk'));assert.ok(level.props.filter(p=>p.kind==='bed').every(p=>p.width===38&&p.height===76));
});

test('warehouse cross aisles and plant service ring admit player and wide pursuer',async()=>{
 const {patrolPath,followPatrolPath}=await import('../src/patrol.ts');const {monsterFeetAt,monsterArchitecture}=await import('../src/collision.ts');
 const tours=[{round:3,points:[[350,414],[540,150],[940,150],[940,672],[350,672],[350,414]]},{round:7,points:[[344,414],[344,190],[940,190],[940,660],[344,660],[344,414]]}];
 for(const tour of tours){
  const level=makeLevel(tour.round);
  for(const footprint of [feetAt,monsterFeetAt]){
   const solids=[...level.walls.map(w=>footprint===monsterFeetAt?monsterArchitecture(w):w),...level.props,level.door,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
   for(let i=1;i<tour.points.length;i++){
    let at={x:tour.points[i-1][0],y:tour.points[i-1][1]};const target={x:tour.points[i][0],y:tour.points[i][1]},path=patrolPath(at,target,solids,level.bounds,footprint);
    assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<1,`${tour.round} segment ${i}`);
    for(let n=0;n<500&&path.length;n++){const moved=followPatrolPath(at,path,8,solids,footprint);assert.equal(moved.blocked,false);at=moved.position;}
    assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<1);
   }
  }
 }
 const racks=makeLevel(3).props.filter(p=>p.kind==='rack');assert.equal(racks.length,6);assert.equal(new Set(racks.map(p=>p.x)).size,3);assert.equal(new Set(racks.map(p=>p.y)).size,2);
 assert.equal(makeLevel(7).props.filter(p=>p.kind==='engine').length,4);
});

test('clinic rear passage and operating-suite ring fit both actor footprints',async()=>{
 const {patrolPath,followPatrolPath}=await import('../src/patrol.ts');const {monsterFeetAt,monsterArchitecture}=await import('../src/collision.ts');
 for(const [round,points]of [[2,[[200,414],[200,150],[832,150],[832,370],[950,470],[200,470],[200,414]]],[5,[[330,414],[330,200],[950,200],[950,620],[330,620],[330,414]]]]){
  const l=makeLevel(round);
  for(const footprint of [feetAt,monsterFeetAt]){
   const solids=[...l.walls.map(w=>footprint===monsterFeetAt?monsterArchitecture(w):w),...l.props,l.door,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
   for(let i=1;i<points.length;i++){
    let at={x:points[i-1][0],y:points[i-1][1]};const target={x:points[i][0],y:points[i][1]},path=patrolPath(at,target,solids,l.bounds,footprint);
    assert.ok(path.length&&Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<1,`${round} segment ${i}`);
    for(let n=0;n<800&&path.length;n++){const moved=followPatrolPath(at,path,8,solids,footprint);assert.equal(moved.blocked,false);at=moved.position;}
    assert.ok(Math.hypot(at.x-target.x,at.y-target.y)<1);
   }
  }
 }
 assert.equal(makeLevel(2).props.filter(p=>p.kind==='seating').length,3);assert.equal(makeLevel(5).props.filter(p=>p.kind==='operatingtable').length,2);
});
