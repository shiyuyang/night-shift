import test from 'node:test';import assert from 'node:assert/strict';
import {clearContact} from '../src/collision.ts';
import {makeLevel} from '../src/levels.ts';import {randomizeLevel} from '../src/runtime/random-level.ts';import {validatePlayableLevel,escapeRouteLength} from '../src/runtime/level-validation.ts';
test('tutorial remains authored; seeded searches reproduce while authored rooms remain intact',()=>{assert.deepEqual(makeLevel(1,10),makeLevel(1,20));assert.deepEqual(makeLevel(2,10),makeLevel(2,10));assert.deepEqual(makeLevel(2,10).walls,makeLevel(2).walls);assert.deepEqual(makeLevel(2,20).props,makeLevel(2).props);assert.notDeepEqual(makeLevel(2,10).boxes,makeLevel(2,20).boxes);});
test('1400 generated layouts preserve the entire key chain, locked room and monster access',()=>{let fallback=0;const layouts=new Set();for(let seed=0;seed<200;seed++)for(const round of [2,3,4,5,6,7,8]){const level=makeLevel(round,seed);assert.equal(validatePlayableLevel(level).valid,true,JSON.stringify({round,seed}));assertOpeningSearch(level);fallback+=Number(level.generation.fallback);assert.deepEqual(level.walls,makeLevel(round).walls);assert.deepEqual(level.props,makeLevel(round).props);assert.ok(Math.hypot(level.boxes[2].x-(level.door.x+level.door.width/2),level.boxes[2].y-(level.door.y+level.door.height/2))>=90);layouts.add(JSON.stringify([level.key,level.boxes]));}assert.ok(fallback<6,`too many fallbacks: ${fallback}`);assert.ok(layouts.size>150,`low diversity: ${layouts.size}`);console.log({generated:1400,fallback,uniqueLayouts:layouts.size});});
test('bounded retries return a validated authored fallback',()=>{for(const round of [2,3,4,5,6,7,8]){const base=makeLevel(round),fallback=randomizeLevel(base,1,0);assert.equal(fallback.generation.fallback,true);assertOpeningSearch(fallback);assert.deepEqual(fallback.walls,base.walls);assert.ok(validatePlayableLevel(fallback).valid);}});
test('validator rejects sealed exit, inaccessible keys and locked-room bypass',()=>{const l=makeLevel(2,12);const sealed=structuredClone(l);sealed.walls.push({x:l.key.x-48,y:l.key.y-48,width:96,height:96});assert.equal(validatePlayableLevel(sealed).valid,false);const bypass=structuredClone(l);bypass.boxes[2]={...l.spawn};assert.equal(validatePlayableLevel(bypass).valid,false);const exit=structuredClone(l);exit.exit={x:-300,y:-300};assert.equal(validatePlayableLevel(exit).valid,false);});

test('final-box escape crosses the map and rejects a nearby exit',()=>{for(let round=1;round<=7;round++){const l=makeLevel(round);assert.ok(escapeRouteLength(l)>=600);const shortcut=structuredClone(l);shortcut.exit={x:l.boxes[2].x,y:l.boxes[2].y+28};assert.ok(validatePlayableLevel(shortcut).errors.some(e=>e.includes('escape route')));}});

test('ward random searches stay in functional rooms on both sides of the old boundary',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 const layouts=new Set();
 for(let seed=0;seed<12;seed++){
  const l=makeLevel(8,seed),z=l.zones;
  assert.ok(inside(l.key,z.NurseZone));
  assert.ok([z.WardOneZone,z.WardTwoZone].some(b=>inside(l.boxes[0],b)));
  assert.ok([z.TreatmentZone,z.LinenZone].some(b=>inside(l.boxes[1],b)));
  assert.ok(inside(l.boxes[2],z.IsolationZone));
  assert.ok(l.features.filter(f=>f.kind!=='empty-task').every(f=>[z.NurseZone,z.WardOneZone,z.WardTwoZone,z.TreatmentZone,z.LinenZone].some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b))));
  layouts.add(JSON.stringify([l.key,l.boxes]));
 }
 assert.ok(layouts.size>1);
});

test('industrial searches preserve room purpose and cabinets stay off transit aisles',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 for(const [round,rooms]of [[3,[['ReceivingZone'],['RackWestZone','RackCenterZone','RackSouthZone'],['DispatchZone'],['StockroomZone']]],[7,[['ControlZone'],['ToolZone'],['ServiceEastZone','ServiceSouthZone'],['PanelZone']]]]){
  for(let seed=0;seed<12;seed++){
   const l=makeLevel(round,seed),points=[l.key,...l.boxes];
   points.forEach((p,i)=>assert.ok(rooms[i].some(id=>inside(p,l.zones[id])),JSON.stringify({round,seed,i,p})));
   assert.ok(l.features.filter(f=>f.kind==='cache').length>=4);assert.equal(l.features.filter(f=>f.kind==='locker').length,1);
   const optional=Object.entries(l.zones).filter(([id])=>id.startsWith('Optional')||(l.theme===1&&['ReceivingZone','DispatchZone','ColdStoreZone'].includes(id))||(l.theme===2&&['ControlZone','ToolZone','PanelZone','PumpZone','ServiceEastZone','ServiceSouthZone'].includes(id))).map(([,b])=>b);
   for(const f of l.features.filter(f=>f.kind!=='empty-task'))assert.ok(optional.some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b)));
  }
 }
});

test('clinical searches stay within their assigned functional rooms',()=>{
 const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
 for(const [round,rooms]of [[2,['RegistrationZone','ConsultationZone','ExaminationZone','TreatmentZone']],[5,['PreparationZone','ScrubZone','OperatingZone','SterileZone']]])for(let seed=0;seed<12;seed++){
  const l=makeLevel(round,seed);[l.key,...l.boxes].forEach((p,i)=>assert.ok(inside(p,l.zones[rooms[i]]),`${round} ${seed} ${i}`));
  const optional=Object.entries(l.zones).filter(([id])=>id.startsWith('Optional')||(l.theme===1&&['ReceivingZone','DispatchZone','ColdStoreZone'].includes(id))||(l.theme===2&&['ControlZone','ToolZone','PanelZone','PumpZone','ServiceEastZone','ServiceSouthZone'].includes(id))).map(([,b])=>b);
  for(const f of l.features.filter(f=>f.kind!=='empty-task'))assert.ok(optional.some(b=>inside({x:f.x+f.width/2,y:f.y+f.height/2},b)));
 }
});

function assertOpeningSearch(level){
 if(level.round<=2){assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=180);return;}
 const solids=[...level.walls,...level.props,level.door];
 assert.equal(clearContact(level.spawn,level.key,solids),false,'Opening key must require searching past cover');
 assert.equal(clearContact(level.spawn,level.boxes[0],solids),false,'First box must not face spawn');
 assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=300);
 assert.equal(clearContact(level.key,level.boxes[0],solids),false,'Key and box must require turning through the map');
}
