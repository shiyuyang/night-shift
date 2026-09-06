import {feetAt,monsterFeetAt,overlaps,moveWithCollision,type Footprint,type Box,type Position} from './collision.ts';
/** Cardinal grid navigation for the physical patrol enemy; closed doors participate. */
export function patrolPath(from:Position,to:Position,solids:Box[],bounds:Box={x:48,y:108,width:864,height:384},footprint:Footprint=feetAt):Position[]{
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
