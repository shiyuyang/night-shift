import test from 'node:test';import assert from 'node:assert/strict';
import {assertOpeningSearch,assertContainerPlacement} from './helpers/layout-assertions.mjs';
import {makeLevel} from '../src/levels.ts';import {randomizeLevel} from '../src/runtime/random-level.ts';import {validatePlayableLevel,escapeRouteLength} from '../src/runtime/level-validation.ts';
import searchSpots from '../game/search-spots.json' with {type:'json'};
test('tutorial remains authored; seeded searches reproduce while authored rooms remain intact',()=>{assert.deepEqual(makeLevel(1,10),makeLevel(1,20));assert.deepEqual(makeLevel(2,10),makeLevel(2,10));assert.deepEqual(makeLevel(2,10).walls,makeLevel(2).walls);assert.deepEqual(makeLevel(2,20).props,makeLevel(2).props);assert.notDeepEqual(makeLevel(2,10).boxes,makeLevel(2,20).boxes);});
test('tutorial containers use room edges and spread supplies without randomizing the lesson',()=>assertContainerPlacement(makeLevel(1)));
test('later keys and both task-box roles vary between unlocked areas',()=>{
 for(let night=2;night<=8;night++){
  const areas=new Set(),taskAreas=[new Set(),new Set()];let far=0;
  for(let seed=0;seed<30;seed++){
   const l=makeLevel(night,seed),p=l.key;
   // Independent coarse map regions check actual spatial variety, not the
   // production room-grouping helper or a particular seeded coordinate.
   areas.add(`${Math.floor(p.x/320)}:${Math.floor(p.y/280)}`);
   l.boxes.slice(0,2).forEach((box,index)=>{
    taskAreas[index].add(`${Math.floor(box.x/320)}:${Math.floor(box.y/280)}`);
    assert.ok(searchSpots[l.theme].task.some(p=>p.x===box.x&&p.y===box.y));
   });
   if(Math.hypot(p.x-l.spawn.x,p.y-l.spawn.y)>450)far++;
   assertOpeningSearch(l);assert.ok(validatePlayableLevel(l).valid);
  }
  assert.ok(areas.size>=3,`night ${night}: keys should use several areas`);
  assert.ok(far>0,`night ${night}: keys should sometimes be away from spawn`);
  taskAreas.forEach((areas,index)=>assert.ok(areas.size>=3,`night ${night}: box ${index} should use several areas`));
 }
});
test('bounded retries return a validated fallback with separated task boxes',()=>{for(const round of [2,3,4,5,6,7,8]){const base=makeLevel(round),fallback=randomizeLevel(base,1,0);assert.equal(fallback.generation.fallback,true);assertOpeningSearch(fallback);assertContainerPlacement(fallback);assert.deepEqual(fallback.walls,base.walls);assert.deepEqual(fallback.boxes[2],base.boxes[2]);assert.ok(validatePlayableLevel(fallback).valid);}});
test('validator rejects sealed exit, inaccessible keys and locked-room bypass',()=>{const l=makeLevel(2,12);const sealed=structuredClone(l);sealed.walls.push({x:l.key.x-48,y:l.key.y-48,width:96,height:96});assert.equal(validatePlayableLevel(sealed).valid,false);const bypass=structuredClone(l);bypass.boxes[2]={...l.spawn};assert.equal(validatePlayableLevel(bypass).valid,false);const exit=structuredClone(l);exit.exit={x:-300,y:-300};assert.equal(validatePlayableLevel(exit).valid,false);});

test('final-box escape crosses the map and rejects a nearby exit',()=>{for(let round=1;round<=7;round++){const l=makeLevel(round);assert.ok(escapeRouteLength(l)>=600);const shortcut=structuredClone(l);shortcut.exit={x:l.boxes[2].x,y:l.boxes[2].y+28};assert.ok(validatePlayableLevel(shortcut).errors.some(e=>e.includes('escape route')));}});

test('ward random searches stay in functional rooms on both sides of the old boundary',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 const layouts=new Set();
 for(let seed=0;seed<12;seed++){
  const l=makeLevel(8,seed),z=l.zones;
  assert.ok(searchSpots[l.theme].key.some(p=>p.x===l.key.x&&p.y===l.key.y));
  for(const p of l.boxes.slice(0,2))assert.ok([z.NurseZone,z.WardOneZone,z.WardTwoZone,z.TreatmentZone,z.LinenZone].some(b=>inside(p,b)));
  assert.ok(inside(l.boxes[2],z.IsolationZone));
  assert.ok(l.features.filter(f=>f.kind!=='empty-task').every(f=>[z.NurseZone,z.WardOneZone,z.WardTwoZone,z.TreatmentZone,z.LinenZone].some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b))));
  layouts.add(JSON.stringify([l.key,l.boxes]));
 }
 assert.ok(layouts.size>1);
});

test('industrial searches preserve room purpose and cabinets stay off transit aisles',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 for(const [round,rooms,final]of [[3,['ReceivingZone','DispatchZone','ColdStoreZone','RackWestZone','RackCenterZone','RackSouthZone'],'StockroomZone'],[7,['ControlZone','ToolZone','PumpZone','ServiceEastZone','ServiceSouthZone'],'PanelZone']]){
  for(let seed=0;seed<12;seed++){
   const l=makeLevel(round,seed);
   assert.ok(searchSpots[l.theme].key.some(p=>p.x===l.key.x&&p.y===l.key.y));
   for(const p of l.boxes.slice(0,2))assert.ok(rooms.some(id=>inside(p,l.zones[id])),JSON.stringify({round,seed,p}));
   assert.ok(inside(l.boxes[2],l.zones[final]));
   assert.ok(l.features.filter(f=>f.kind==='cache').length>=4);assert.equal(l.features.filter(f=>f.kind==='locker').length,1);
   const optional=Object.entries(l.zones).filter(([id])=>id.startsWith('Optional')||(l.theme===1&&['ReceivingZone','DispatchZone','ColdStoreZone','RackWestZone','RackCenterZone','RackSouthZone'].includes(id))||(l.theme===2&&['ControlZone','ToolZone','PanelZone','PumpZone','ServiceEastZone','ServiceSouthZone'].includes(id))).map(([,b])=>b);
   for(const f of l.features.filter(f=>f.kind!=='empty-task'))assert.ok(optional.some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b)));
  }
 }
});

test('clinical task roles share storage rooms while the final box stays locked away',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 for(const [round,rooms,final]of [[2,['RegistrationZone','ConsultationZone','ExaminationZone','StaffZone'],'TreatmentZone'],[5,['PreparationZone','ScrubZone','OperatingZone','RecoveryZone'],'SterileZone']])for(let seed=0;seed<12;seed++){
  const l=makeLevel(round,seed);for(const p of l.boxes.slice(0,2))assert.ok(rooms.some(id=>inside(p,l.zones[id])),`${round} ${seed}`);
  assert.ok(inside(l.boxes[2],l.zones[final]));
  assert.ok(searchSpots[l.theme].key.some(p=>p.x===l.key.x&&p.y===l.key.y));
  const optional=Object.entries(l.zones).filter(([id])=>id.startsWith('Optional')||(l.theme===4&&id==='OperatingZone')).map(([,b])=>b);
  for(const f of l.features.filter(f=>f.kind!=='empty-task'))assert.ok(optional.some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b)));
 }
});
