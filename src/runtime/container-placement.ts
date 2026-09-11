import type {Box,Position} from '../collision.ts';
import type {Level} from '../levels.ts';

/** Functional storage areas only; event triggers and passage rectangles are not rooms. */
export function containerRooms(level:Level):Box[]{
 const rooms=Object.entries(level.zones).filter(([id,b])=>id.endsWith('Zone')
  &&! /^(Optional|Dress|Pipe|Return|Morgue)/.test(id)&&!/(Path|Glass)Zone$/.test(id)
  &&b.width>=80&&b.height>=80).map(([,b])=>b);
 // Outdoor supplies belong beside a bench, not in arbitrary path/event zones.
 if(level.theme===6)rooms.push(...level.props.filter(p=>p.kind==='gardenbench').map(p=>({x:p.x-100,y:p.y-80,width:p.width+200,height:p.height+160})));
 return rooms;
}
export const insideRoom=(p:Position,b:Box,margin=0)=>p.x>b.x+margin&&p.x<b.x+b.width-margin&&p.y>b.y+margin&&p.y<b.y+b.height-margin;

/** Lower scores favor a wall/furnishing edge, with a second edge favoring a corner. */
export function containerEdgeScore(p:Position,solids:Box[]):number{
 let horizontal=Infinity,vertical=Infinity;
 for(const b of solids){
  if(p.y>=b.y-10&&p.y<=b.y+b.height+10)horizontal=Math.min(horizontal,Math.max(b.x-p.x-13,p.x-13-b.x-b.width,0));
  if(p.x>=b.x-13&&p.x<=b.x+b.width+13)vertical=Math.min(vertical,Math.max(b.y-p.y-10,p.y-10-b.y-b.height,0));
 }
 return Math.min(horizontal,vertical,160)*2+Math.min(Math.max(horizontal,vertical),120)*.3;
}

// A long consultation ward or trolley bay contains several storage sections.
// Assign each point once; overlapping authoring zones cannot inflate room counts.
function areaAt(p:Position,rooms:Box[]):string{
 const index=rooms.findIndex(b=>insideRoom(p,b));if(index<0)return 'outside';
 const b=rooms[index],cols=Math.ceil(b.width/320),rows=Math.ceil(b.height/280);
 return `${index}:${Math.min(cols-1,Math.floor((p.x-b.x)*cols/b.width))}:${Math.min(rows-1,Math.floor((p.y-b.y)*rows/b.height))}`;
}
export function containerCandidates(points:Position[],rooms:Box[],solids:Box[]){
 return points.filter(p=>rooms.some(b=>insideRoom(p,b,24))&&solids.some(b=>Math.hypot(Math.max(b.x-p.x-13,p.x-13-b.x-b.width,0),Math.max(b.y-p.y-10,p.y-10-b.y-b.height,0))<=80))
  .map(p=>({point:p,area:areaAt(p,rooms),edge:containerEdgeScore(p,solids)}));
}
/** Fill unused areas first, avoid clustering within them, then prefer their edges. */
export function spreadContainerCandidates(candidates:ReturnType<typeof containerCandidates>,placed:Position[],rooms:Box[],distributed=placed):Position[]{
 const used=new Map<string,number>();for(const p of distributed){const area=areaAt(p,rooms);used.set(area,(used.get(area)??0)+1);}
 const midX=(Math.min(...rooms.map(b=>b.x))+Math.max(...rooms.map(b=>b.x+b.width)))/2,midY=(Math.min(...rooms.map(b=>b.y))+Math.max(...rooms.map(b=>b.y+b.height)))/2;
 const quadrant=(p:Position)=>Number(p.x>=midX)+2*Number(p.y>=midY),quadrants=[0,0,0,0];for(const p of distributed)quadrants[quadrant(p)]++;
 return candidates.map(c=>{
  let separation=360;for(const p of placed)separation=Math.min(separation,Math.hypot(p.x-c.point.x,p.y-c.point.y));
  return {...c,coverage:quadrants[quadrant(c.point)],used:used.get(c.area)??0,shortfall:Math.max(0,160-separation),separation};
 }).sort((a,b)=>a.coverage-b.coverage||a.used-b.used||a.shortfall-b.shortfall||Math.floor(a.edge/16)-Math.floor(b.edge/16)||b.separation-a.separation||a.edge-b.edge).map(c=>c.point);
}
