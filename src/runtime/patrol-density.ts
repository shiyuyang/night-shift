import {monsterFeetAt,overlaps,type Position,type Box} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
/** Physical entry positions at the exit side, never beside the player. */
export function exitEntries(exit:Position,player:Position,occupied:Position[],solids:Box[],bounds:Box){
 const points:Position[]=[];
 for(let radius=48;radius<=224;radius+=32)for(let angle=0;angle<8;angle++){
  const p={x:Math.round(exit.x+Math.cos(angle*Math.PI/4)*radius),y:Math.round(exit.y+Math.sin(angle*Math.PI/4)*radius)};
  const feet=monsterFeetAt(p.x,p.y);
  if(p.x<bounds.x||p.x>bounds.x+bounds.width||p.y<bounds.y||p.y>bounds.y+bounds.height||solids.some(b=>overlaps(feet,b))||Math.hypot(p.x-player.x,p.y-player.y)<180||occupied.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<64))continue;
  points.push(p);
 }
 return points;
}
/** Two distinct forward checkpoints along the return route; positions update, enemies never warp. */
export function returnCheckpoints(player:Position,exit:Position,solids:Box[],bounds:Box):Position[]{
 const path=patrolPath(player,exit,solids,bounds,monsterFeetAt);
 if(path.length<2)return [{...exit},{...exit}];
 const at=(route:Position[],fraction:number)=>({...route[Math.min(route.length-1,Math.max(1,Math.floor(route.length*fraction)))]});
 const first=at(path,.3),second=at(path,.6);
 // Prefer a separate approach when the map actually offers one. The temporary
 // planning obstacle never becomes a physical wall or changes the real map.
 const alternative=patrolPath(player,exit,[...solids,{x:first.x-48,y:first.y-48,width:96,height:96}],bounds,monsterFeetAt);
 const end=alternative.at(-1),flank=alternative.length>1?at(alternative,.5):second;
 if(end&&Math.hypot(end.x-exit.x,end.y-exit.y)<35&&alternative.length<path.length*1.7&&Math.hypot(first.x-flank.x,first.y-flank.y)>96)return [first,flank];
 return [first,second];
}

export function exitPatrolOrigin(exit:Position,solids:Box[],bounds:Box):Position {return solids.some(b=>overlaps(monsterFeetAt(exit.x,exit.y),b))?exitEntries(exit,{x:-1e6,y:-1e6},[],solids,bounds)[0]??exit:exit;}

/** Exit-side legs are chosen from map geometry, never a hidden player's route. */
export function exitPatrolPoints(exit:Position,anchors:Position[],solids:Box[],bounds:Box):Position[]{
 const origin=exitPatrolOrigin(exit,solids,bounds),offset=Math.hypot(origin.x-exit.x,origin.y-exit.y),candidates:Position[]=[];
 const goals=[...anchors];for(let a=0;a<8;a++)goals.push({x:exit.x+Math.cos(a*Math.PI/4)*330,y:exit.y+Math.sin(a*Math.PI/4)*330});
 for(const goal of goals){
  const path=patrolPath(origin,goal,solids,bounds,monsterFeetAt);let length=offset,previous=origin,next=180;
  for(const step of path){length+=Math.hypot(step.x-previous.x,step.y-previous.y);previous=step;
   if(length>=next&&length<=360){if(!candidates.some(p=>Math.hypot(p.x-step.x,p.y-step.y)<48))candidates.push({...step});next+=100;}
  }
 }
 for(let i=candidates.length-1;i>=0;i--){const p=candidates[i],path=patrolPath(origin,p,solids,bounds,monsterFeetAt);let length=offset,previous=origin;for(const step of path){length+=Math.hypot(step.x-previous.x,step.y-previous.y);previous=step;}if(Math.hypot(previous.x-p.x,previous.y-p.y)>24||length<180||length>360)candidates.splice(i,1);}
 if(!candidates.length)return exitEntries(exit,{x:-1e6,y:-1e6},[],solids,bounds).slice(0,1);
 const first=candidates[0],second=candidates.slice(1).sort((a,b)=>Math.hypot(b.x-first.x,b.y-first.y)-Math.hypot(a.x-first.x,a.y-first.y))[0];
 return second&&Math.hypot(first.x-second.x,first.y-second.y)>=64?[first,second]:[first];
}
