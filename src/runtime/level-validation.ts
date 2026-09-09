import {feetAt,monsterFeetAt,overlaps,type Footprint,type Position} from '../collision.ts';
import type {Level} from '../levels.ts';
/** Grid spacing is smaller than all physical obstacles; cells test the actual actor footprint. */
export function reachablePositions(level:Level,open:boolean,footprint:Footprint=feetAt):Position[]{
 const solids=[...level.walls,...level.props,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(open?[]:[level.door])];
 const {bounds,spawn}=level,step=8,cols=Math.ceil(bounds.width/step)+2,rows=Math.ceil(bounds.height/step)+2;
 const x0=spawn.x-Math.floor((spawn.x-bounds.x)/step)*step,y0=spawn.y-Math.floor((spawn.y-bounds.y)/step)*step;
 // Rasterize built-in footprints once instead of scanning every obstacle at every BFS cell.
 // Keep exact overlap checks at the edges: touching an obstacle remains passable.
 const blocked=new Uint8Array(cols*rows);
 if(footprint===feetAt||footprint===monsterFeetAt){
  const f=footprint(0,0);
  for(const solid of solids){
   const left=Math.max(0,Math.floor((solid.x-f.x-f.width-x0)/step));
   const right=Math.min(cols-1,Math.ceil((solid.x+solid.width-f.x-x0)/step));
   const top=Math.max(0,Math.floor((solid.y-f.y-f.height-y0)/step));
   const bottom=Math.min(rows-1,Math.ceil((solid.y+solid.height-f.y-y0)/step));
   for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
    const n=cy*cols+cx;
    if(!blocked[n]&&overlaps(footprint(x0+cx*step,y0+cy*step),solid))blocked[n]=1;
   }
  }
 }else{
  // Custom footprints can depend on position; retain their original semantics.
  for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
   const f=footprint(x0+cx*step,y0+cy*step);
   if(solids.some(s=>overlaps(f,s)))blocked[cy*cols+cx]=1;
  }
 }
 const valid=(cx:number,cy:number)=>{
  const x=x0+cx*step,y=y0+cy*step;
  return x>=bounds.x&&x<=bounds.x+bounds.width&&y>=bounds.y&&y<=bounds.y+bounds.height&&!blocked[cy*cols+cx];
 };
 const sx=Math.round((spawn.x-x0)/step),sy=Math.round((spawn.y-y0)/step);
 if(!valid(sx,sy))return [];
 const seen=new Uint8Array(cols*rows),queue=new Int32Array(cols*rows),points:Position[]=[];
 let tail=1;queue[0]=sy*cols+sx;seen[queue[0]]=1;
 const visit=(cx:number,cy:number)=>{
  if(cx<0||cy<0||cx>=cols||cy>=rows)return;
  const n=cy*cols+cx;if(seen[n])return;seen[n]=1;
  if(valid(cx,cy))queue[tail++]=n;
 };
 for(let i=0;i<tail;i++){
  const at=queue[i],cx=at%cols,cy=Math.floor(at/cols);
  points.push({x:x0+cx*step,y:y0+cy*step});
  // Preserve traversal order because seeded placement selects from this array.
  visit(cx+1,cy);visit(cx-1,cy);visit(cx,cy+1);visit(cx,cy-1);
 }
 return points;
}
/** Shortest walking distance between valid final-box and exit interaction positions. */
export function escapeRouteLength(level:Level,points=reachablePositions(level,true)){
 const key=(x:number,y:number)=>`${x},${y}`,available=new Set(points.map(p=>key(p.x,p.y))),seen=new Set<string>(),queue:{x:number;y:number;distance:number}[]=[];
 for(const p of points)if(Math.hypot(p.x-level.exit.x,p.y-level.exit.y)<37){queue.push({...p,distance:0});seen.add(key(p.x,p.y));}
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-level.boxes[2].x,p.y-level.boxes[2].y)<44)return p.distance;
  for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(available.has(k)&&!seen.has(k)){seen.add(k);queue.push({x,y,distance:p.distance+8});}}
 }
 return Infinity;
}
export function validatePlayableLevel(level:Level,checkDrawer=true):{valid:boolean;errors:string[]}{
 const closed=reachablePositions(level,false),open=reachablePositions(level,true),near=(points:Position[],p:Position,r:number)=>points.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<r);
 const errors:string[]=[];
 // Explicit dependency chain: free box -> ward key -> door; brass -> box 1 -> seal -> box 2.
 for(const [name,p,r] of [['brass',level.key,30],['free-box',level.boxes[0],38],['brass-box',level.boxes[1],38],['door',level.doorUse,38]] as const)if(!near(closed,p,r))errors.push(name+' inaccessible before unlock');
 if(near(closed,level.boxes[2],44))errors.push('locked room bypass');
 for(const [i,p]of level.boxes.entries())if(!near(open,p,38))errors.push('box '+i+' inaccessible after unlock');
 if(!near(open,level.exit,30))errors.push('exit inaccessible');
 const escape=escapeRouteLength(level,open);if(!Number.isFinite(escape)||escape<600)errors.push('escape route must be reachable and at least 600 units');
 const monsters=reachablePositions(level,true,monsterFeetAt);
 for(const p of level.monsterSpawns)if(!near(monsters,p,12))errors.push('monster spawn disconnected');
 const drawer=level.zones.MorgueDrawerZone;if(checkDrawer&&drawer){const blocked={...level,props:[...level.props,{...drawer,kind:'machine' as const}]};errors.push(...validatePlayableLevel(blocked,false).errors.map(e=>'extended drawer: '+e));}
 return {valid:errors.length===0,errors};
}
