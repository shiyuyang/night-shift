import assert from 'node:assert/strict';
import {clearContact} from '../../src/collision.ts';
export function assertOpeningSearch(level){
 if(level.round<=2){assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=180);return;}
 const solids=[...level.walls,...level.props,level.door];
 assert.equal(clearContact(level.spawn,level.key,solids),false,'Opening key must require searching past cover');
 assert.equal(clearContact(level.spawn,level.boxes[0],solids),false,'First box must not face spawn');
 assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=300);
 assert.equal(clearContact(level.key,level.boxes[0],solids),false,'Key and box must require turning through the map');
}

export function assertContainerPlacement(level){
 if(level.round>1){
  const [free,brass]=level.boxes;
  assert.ok(Math.hypot(free.x-brass.x,free.y-brass.y)>=180,'The first two task boxes must be separated');
  // Check actual authored room boundaries independently of the production
  // room picker. Outdoor bench pockets are covered by the distance rule.
  for(const [id,b] of Object.entries(level.zones).filter(([id])=>id.endsWith('Zone')&&!/^(Optional|Dress|Pipe|Return|Morgue)/.test(id)&&!/(Path|Glass)Zone$/.test(id))){
   const inside=p=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
   assert.ok(!(inside(free)&&inside(brass)),`Task roles must not occupy the same ${id}`);
  }
 }
 const cabinets=level.features.filter(f=>f.kind==='cache'||f.kind==='locker');
 const supplies=cabinets.filter(f=>f.kind==='cache').map(f=>({x:f.x+f.width/2,y:f.y+f.height/2}));
 for(let i=0;i<cabinets.length;i++)for(let j=i+1;j<cabinets.length;j++){
  const a=cabinets[i],b=cabinets[j];
  assert.ok(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>=96,'Cabinets must not form a tight cluster');
 }
 assert.ok(Math.max(...supplies.map(p=>p.x))-Math.min(...supplies.map(p=>p.x))>=400,'Supplies must cover both sides of the map');
 assert.ok(Math.max(...supplies.map(p=>p.y))-Math.min(...supplies.map(p=>p.y))>=200,'Supplies must cover more than one horizontal strip');
 const gap=p=>Math.min(...[...level.walls,...level.props].map(b=>Math.hypot(Math.max(b.x-p.x-13,p.x-13-b.x-b.width,0),Math.max(b.y-p.y-10,p.y-10-b.y-b.height,0))));
 for(const p of level.boxes)assert.ok(gap(p)<=64,'Task boxes belong beside architecture or furniture');
 for(const f of level.features)assert.ok(gap({x:f.x+f.width/2,y:f.y+f.height/2})<=80,'Optional containers belong beside architecture or furniture');
}
