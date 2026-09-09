import {monsterFeetAt,overlaps,type Box,type Position} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
/** Plan through the open doorway, then stop at its last physically reachable point. */
export function doorApproach(from:Position,target:Position,door:Box,solids:Box[],bounds:Box):Position|undefined {
 const open=solids.filter(b=>!(b.x===door.x&&b.y===door.y&&b.width===door.width&&b.height===door.height));
 const route=patrolPath(from,target,open,bounds,monsterFeetAt),end=route.at(-1);
 if(!end||Math.hypot(end.x-target.x,end.y-target.y)>24)return;
 let previous=from;
 for(const next of route){
  const steps=Math.max(1,Math.ceil(Math.hypot(next.x-previous.x,next.y-previous.y)/2)),start=previous;
  for(let i=1;i<=steps;i++){
   const p={x:start.x+(next.x-start.x)*i/steps,y:start.y+(next.y-start.y)*i/steps};
   if(overlaps(monsterFeetAt(p.x,p.y),door))return previous;
   previous=p;
  }
 }
}
