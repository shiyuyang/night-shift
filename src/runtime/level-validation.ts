import {feetAt,monsterFeetAt,monsterArchitecture,clearContact,overlaps,type Footprint,type Position} from '../collision.ts';
import type {Level} from '../levels.ts';
interface ReachableGrid {x0:number;y0:number;cols:number;rows:number;cells:Uint8Array;queue:Int32Array;count:number;}
function gridPositions(grid:ReachableGrid):Position[]{
 const points:Position[]=[];
 for(let i=0;i<grid.count;i++){const at=grid.queue[i];points.push({x:grid.x0+(at%grid.cols)*8,y:grid.y0+Math.floor(at/grid.cols)*8});}
 return points;
}
/** Grid spacing is smaller than all physical obstacles; cells test the actual actor footprint. */
export function reachablePositions(level:Level,open:boolean,footprint:Footprint=feetAt):Position[]{
 return gridPositions(reachableGrid(level,open,footprint));
}
function reachableGrid(level:Level,open:boolean,footprint:Footprint=feetAt):ReachableGrid{
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
 const seen=new Uint8Array(cols*rows),queue=new Int32Array(cols*rows);
 if(!valid(sx,sy))return {x0,y0,cols,rows,cells:seen,queue,count:0};
 let tail=1;queue[0]=sy*cols+sx;seen[queue[0]]=2;
 const visit=(cx:number,cy:number)=>{
  if(cx<0||cy<0||cx>=cols||cy>=rows)return;
  const n=cy*cols+cx;if(seen[n])return;seen[n]=1;
  if(valid(cx,cy)){seen[n]=2;queue[tail++]=n;}
 };
 for(let i=0;i<tail;i++){
  const at=queue[i],cx=at%cols,cy=Math.floor(at/cols);
  // Preserve traversal order because seeded placement selects from this array.
  visit(cx+1,cy);visit(cx-1,cy);visit(cx,cy+1);visit(cx,cy-1);
 }
 return {x0,y0,cols,rows,cells:seen,queue,count:tail};
}
/** Shortest walking distance between valid final-box and exit interaction positions. */
export function escapeRouteLength(level:Level,points=reachablePositions(level,true)){
 if(!points.length)return Infinity;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){
  // Arbitrary caller-provided point sets retain the original exact-coordinate semantics.
  if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y))return escapeRouteLengthSparse(level,points);
  minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);
 }
 const cols=(maxX-minX)/8+1,rows=(maxY-minY)/8+1,size=cols*rows;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||size>1_000_000)return escapeRouteLengthSparse(level,points);
 for(const p of points)if((p.x-minX)%8||(p.y-minY)%8)return escapeRouteLengthSparse(level,points);
 // 0 = absent, 1 = available, 2 = queued. No coordinate strings or per-step objects.
 const cells=new Uint8Array(size),queue=new Int32Array(size),distance=new Int32Array(size);
 let tail=0;
 for(const p of points)cells[((p.y-minY)/8)*cols+(p.x-minX)/8]=1;
 for(const p of points)if(Math.hypot(p.x-level.exit.x,p.y-level.exit.y)<37){
  const at=((p.y-minY)/8)*cols+(p.x-minX)/8;
  if(cells[at]===1){cells[at]=2;queue[tail++]=at;}
 }
 const visit=(at:number,d:number)=>{if(cells[at]===1){cells[at]=2;distance[at]=d;queue[tail++]=at;}};
 for(let i=0;i<tail;i++){
  const at=queue[i],cx=at%cols,cy=Math.floor(at/cols);
  if(Math.hypot(minX+cx*8-level.boxes[2].x,minY+cy*8-level.boxes[2].y)<44)return distance[at];
  const d=distance[at]+8;
  if(cx+1<cols)visit(at+1,d);if(cx>0)visit(at-1,d);
  if(cy+1<rows)visit(at+cols,d);if(cy>0)visit(at-cols,d);
 }
 return Infinity;
}
function escapeRouteLengthSparse(level:Level,points:Position[]){
 const key=(x:number,y:number)=>`${x},${y}`,available=new Set(points.map(p=>key(p.x,p.y))),seen=new Set<string>(),queue:{x:number;y:number;distance:number}[]=[];
 for(const p of points)if(Math.hypot(p.x-level.exit.x,p.y-level.exit.y)<37){queue.push({...p,distance:0});seen.add(key(p.x,p.y));}
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-level.boxes[2].x,p.y-level.boxes[2].y)<44)return p.distance;
  for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(available.has(k)&&!seen.has(k)){seen.add(k);queue.push({x,y,distance:p.distance+8});}}
 }
 return Infinity;
}
export function validatePlayableLevel(level:Level,checkDrawer=true):{valid:boolean;errors:string[]}{
 const {valid,errors}=analyzePlayableLevel(level,checkDrawer);
 return {valid,errors};
}
/** Per-candidate snapshot; reuse queries only while that candidate's geometry is unchanged. */
export function analyzePlayableLevel(level:Level,checkDrawer=true){
 const closed=reachableGrid(level,false),open=reachableGrid(level,true),closedNear=gridQuery(closed),openNear=gridQuery(open);
 const errors:string[]=[];
 const openOccluders=[...level.walls,...level.props],closedOccluders=[...openOccluders,level.door];
 // Explicit dependency chain: free box -> ward key -> door; brass -> box 1 -> seal -> box 2.
 for(const [name,p,r] of [['brass',level.key,30],['free-box',level.boxes[0],38],['brass-box',level.boxes[1],38],['door',level.doorUse,38]] as const)if(!closedNear(p,r,q=>clearContact(q,p,closedOccluders)))errors.push(name+' inaccessible before unlock');
 if(closedNear(level.boxes[2],44))errors.push('locked room bypass');
 for(const [i,p]of level.boxes.entries())if(!openNear(p,38,q=>clearContact(q,p,openOccluders)))errors.push('box '+i+' inaccessible after unlock');
 if(!openNear(level.exit,30))errors.push('exit inaccessible');
 const escape=escapeGridLength(level,open);if(!Number.isFinite(escape)||escape<600)errors.push('escape route must be reachable and at least 600 units');
 // Runtime patrols use an origin-aligned grid and keep head/shoulders clear of
 // architecture. Player connectivity alone can admit furniture that seals a
 // monster's return route, especially after the morgue drawer extends.
 const monsterLevel={...level,walls:level.walls.map(monsterArchitecture),spawn:{x:Math.round(level.spawn.x/8)*8,y:Math.round(level.spawn.y/8)*8}};
 const monsters=reachableGrid(monsterLevel,true,monsterFeetAt),monsterNear=gridQuery(monsters);
 for(const p of level.monsterSpawns)if(!monsterNear(p,12))errors.push('monster spawn disconnected');
 for(const [i,p] of level.boxes.entries())if(!monsterNear(p,44))errors.push('monster cannot approach box '+i);
 const drawer=level.zones.MorgueDrawerZone;if(checkDrawer&&drawer){const blocked={...level,props:[...level.props,{...drawer,kind:'machine' as const}]};errors.push(...validatePlayableLevel(blocked,false).errors.map(e=>'extended drawer: '+e));}
 return {valid:errors.length===0,errors,closedNear,openNear};
}

/** The reachable marker is already a spatial index; only visit cells inside the query radius. */
function gridQuery(grid:ReachableGrid){
 const {x0,y0,cols,rows,cells}=grid;
 return (p:Position,radius:number,accept?:(q:Position)=>boolean)=>{
  const left=Math.max(0,Math.floor((p.x-radius-x0)/8)),right=Math.min(cols-1,Math.ceil((p.x+radius-x0)/8));
  const top=Math.max(0,Math.floor((p.y-radius-y0)/8)),bottom=Math.min(rows-1,Math.ceil((p.y+radius-y0)/8));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(cells[y*cols+x]===2&&Math.hypot(x0+x*8-p.x,y0+y*8-p.y)<radius&&(!accept||accept({x:x0+x*8,y:y0+y*8})))return true;
  return false;
 };
}
function escapeGridLength(level:Level,grid:ReachableGrid){
 // Preserve the public algorithm's exact string-coordinate behavior on fractional grids.
 if(!Number.isSafeInteger(grid.x0)||!Number.isSafeInteger(grid.y0))return escapeRouteLength(level,gridPositions(grid));
 const {x0,y0,cols,rows}=grid,cells=grid.cells.slice(),queue=new Int32Array(cells.length),distance=new Int32Array(cells.length);
 let tail=0;
 for(let i=0;i<grid.count;i++){
  const at=grid.queue[i];
  if(Math.hypot(x0+(at%cols)*8-level.exit.x,y0+Math.floor(at/cols)*8-level.exit.y)<37){cells[at]=3;queue[tail++]=at;}
 }
 const visit=(at:number,d:number)=>{if(cells[at]===2){cells[at]=3;distance[at]=d;queue[tail++]=at;}};
 for(let i=0;i<tail;i++){
  const at=queue[i],cx=at%cols,cy=Math.floor(at/cols);
  if(Math.hypot(x0+cx*8-level.boxes[2].x,y0+cy*8-level.boxes[2].y)<44)return distance[at];
  const d=distance[at]+8;
  if(cx+1<cols)visit(at+1,d);if(cx>0)visit(at-1,d);
  if(cy+1<rows)visit(at+cols,d);if(cy>0)visit(at-cols,d);
 }
 return Infinity;
}
