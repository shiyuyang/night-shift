import {feetAt,monsterFeetAt,overlaps,moveWithCollision,type Footprint,type Box,type Position} from './collision.ts';
import {patrolGrid} from './runtime/patrol-grid.ts';
/** Cardinal grid navigation for the physical patrol enemy; closed doors participate. */
export function patrolPath(from:Position,to:Position,solids:Box[],bounds:Box={x:48,y:108,width:864,height:384},footprint:Footprint=feetAt):Position[]{
 const grid=patrolGrid(solids,bounds,footprint),sx=Math.round(from.x/8),sy=Math.round(from.y/8);
 if(!grid||sx<grid.x0||sy<grid.y0||sx>=grid.x0+grid.cols||sy>=grid.y0+grid.rows)return sparsePatrolPath(from,to,solids,bounds,footprint);
 const {cols,rows,x0,y0,flags,seen,parents,queue}=grid;
 let epoch=(grid.epoch+1)>>>0;if(!epoch){seen.fill(0);epoch=1;}grid.epoch=epoch;
 const root=(sy-y0)*cols+sx-x0;queue[0]=root;seen[root]=epoch;parents[root]=-1;
 let tail=1,end=-1,nearest=root,best=Math.hypot(from.x-to.x,from.y-to.y);
 const aligned=from.x===sx*8&&from.y===sy*8;
 for(let head=0;head<tail;head++){
  const at=queue[head],x=at%cols,y=Math.floor(at/cols),px=(x+x0)*8,py=(y+y0)*8;
  const distance=Math.hypot(px-to.x,py-to.y);
  if(distance<best){best=distance;nearest=at;}
  if(distance<20&&straightPassage(head===0?from:{x:px,y:py},to,solids,footprint)){end=at;break;}
  const visit=(next:number,blocked:boolean)=>{
   if(seen[next]===epoch||(flags[next]&1))return;
   if(head===0&&!aligned){
    // The torso is usually between grid cells. Preserve the original swept
    // first step instead of snapping it across an obstacle or a tight corner.
    const target={x:(next%cols+x0)*8,y:(Math.floor(next/cols)+y0)*8};
    const moved=moveWithCollision(from,target.x-from.x,target.y-from.y,solids,footprint);
    if(Math.hypot(moved.x-target.x,moved.y-target.y)>.1||!straightPassage(from,target,solids,footprint))return;
   }else if(blocked)return;
   seen[next]=epoch;parents[next]=at;queue[tail++]=next;
  };
  // Preserve BFS tie-breaking and nearest-reachable fallback, including order.
  if(x+1<cols)visit(at+1,!!(flags[at]&2));if(x>0)visit(at-1,!!(flags[at]&4));
  if(y+1<rows)visit(at+cols,!!(flags[at]&8));if(y>0)visit(at-cols,!!(flags[at]&16));
 }
 const path:Position[]=[];
 for(let at=end<0?nearest:end;at>=0;at=parents[at])path.push({x:(at%cols+x0)*8,y:(Math.floor(at/cols)+y0)*8});
 path.reverse();path[0]={x:from.x,y:from.y};
 if(straightPassage(path[path.length-1],to,solids,footprint))path.push({...to});
 return path;
}
/** Retain arbitrary position-dependent footprints and out-of-grid starts. */
function sparsePatrolPath(from:Position,to:Position,solids:Box[],bounds:Box,footprint:Footprint):Position[]{
 const step=8,key=(x:number,y:number)=>`${x},${y}`,sx=Math.round(from.x/step),sy=Math.round(from.y/step);const queue=[[sx,sy]],parents=new Map<string,[number,number]|null>([[key(sx,sy),null]]);let end:number[]|undefined,nearest=[sx,sy],best=Math.hypot(from.x-to.x,from.y-to.y);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],distance=Math.hypot(x*step-to.x,y*step-to.y);if(distance<best){best=distance;nearest=[x,y];}if(distance<20&&straightPassage(i===0?from:{x:x*step,y:y*step},to,solids,footprint)){end=[x,y];break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx*step<bounds.x||nx*step>bounds.x+bounds.width||ny*step<bounds.y||ny*step>bounds.y+bounds.height||parents.has(k)||solids.some(b=>overlaps(footprint(nx*step,ny*step),b)))continue;const start=i===0?from:{x:x*step,y:y*step},end=moveWithCollision(start,nx*step-start.x,ny*step-start.y,solids,footprint);if(Math.hypot(end.x-nx*step,end.y-ny*step)>.1||!straightPassage(start,{x:nx*step,y:ny*step},solids,footprint))continue;parents.set(k,[x,y]);queue.push([nx,ny]);}}
 // An unreachable target (inside a locker or too close to a wall) still has a reachable approach.
 end??=nearest;const path:Position[]=[];for(let at:number[]|null=end;at;at=parents.get(key(at[0],at[1]))??null)path.unshift({x:at[0]*step,y:at[1]*step});if(path.length)path[0]={x:from.x,y:from.y};if(path.length&&straightPassage(path[path.length-1],to,solids,footprint))path.push({...to});return path;
}

/** Unlike axis-sliding collision, a shortcut must clear the whole straight segment. */
function straightPassage(from:Position,to:Position,solids:Box[],footprint:Footprint){
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/2));
 for(let i=0;i<=steps;i++){const t=i/steps;if(solids.some(b=>overlaps(footprint(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t),b)))return false;}return true;
}
/** Consume travel through exact corners; proximity alone cannot skip a turn. */
export function followPatrolPath(from:Position,route:Position[],distance:number,solids:Box[],footprint:Footprint=monsterFeetAt){
 let position={...from},blocked=false;
 while(route.length&&distance>0){
  const target=route[0],length=Math.hypot(target.x-position.x,target.y-position.y);
  if(length<.001){route.shift();continue;}
  const travel=Math.min(distance,length),next=moveWithCollision(position,(target.x-position.x)/length*travel,(target.y-position.y)/length*travel,solids,footprint),actual=Math.hypot(next.x-position.x,next.y-position.y);
  position=next;distance-=travel;
  if(actual<travel-.01){blocked=true;break;}
  if(travel===length)route.shift();
 }
 return {position,blocked};
}
