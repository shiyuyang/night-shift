import {difficultyForNight} from './difficulty.ts';
import type {Level} from '../levels.ts';
import {monsterFeetAt,monsterArchitecture,overlaps,clearContact,feetAt,type Box,type Position} from '../collision.ts';
import {reachablePositions,validatePlayableLevel} from './level-validation.ts';
import {patrolPath} from '../patrol.ts';
import {weeperRules} from './weeper.ts';
export function weeperExclusion(p:Position):Box{return {x:p.x-weeperRules.alertRadius,y:p.y-weeperRules.alertRadius,width:weeperRules.alertRadius*2,height:weeperRules.alertRadius*2};}
/** Authored LDtk sockets, then a conservative proof with the entire alert square blocked. */
export function chooseWeeper(level:Level,seed:number):Position|undefined{
 const difficulty=difficultyForNight(level.round);if(difficulty.weeper==='none')return;
 if(level.round===3)return level.weeperFixed?{...level.weeperFixed}:undefined;
 let hash=(seed^Math.imul(level.round,0x9e3779b9))>>>0;hash=Math.imul(hash^(hash>>>16),0x21f0aaad);hash=Math.imul(hash^(hash>>>15),0x735a2d97);hash=(hash^(hash>>>15))>>>0;
 if(hash/4294967296>difficulty.weeperChance)return;
 const features=(level.features??[]).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8,kind:'crate' as const}));
 const candidates=[...(level.weeperSpawns??[])];if(!candidates.length)return;
 const offset=hash%candidates.length;candidates.push(...candidates.splice(0,offset));const searches=[level.key,...level.boxes];
 // Rank authored sockets beside actual search routes, not just nearby through a wall.
 // Doors are omitted only for ranking the route after unlocking; validation below remains strict.
 const routeSolids=[...level.walls,...level.props,...features];
 const stops=[level.spawn,...searches,level.exit];
 const routes=stops.slice(1).flatMap((target,i)=>patrolPath(stops[i],target,routeSolids,level.bounds,feetAt));
 const score=(p:Position)=>{
  const visible=routes.filter(v=>clearContact({x:p.x,y:p.y+10},{x:v.x,y:v.y+10},routeSolids));
  const routeDistance=Math.min(999,...visible.map(v=>Math.hypot(v.x-p.x,v.y-p.y)));
  return routeDistance+Math.min(...searches.map(v=>Math.hypot(v.x-p.x,v.y-p.y)))*.2;
 };
 const scores=new Map(candidates.map(p=>[p,score(p)]));candidates.sort((a,b)=>scores.get(a)!-scores.get(b)!);
 for(let i=0;i<candidates.length;i++){
  const p=candidates[i],zone=weeperExclusion(p);
  if(difficulty.weeper==='fixed'&&!validatePlayableLevel({...level,props:[...level.props,...features,{...zone,kind:'crate'}]}).valid)continue;
  if([level.spawn,level.exit,level.doorUse,...level.monsterSpawns].some(v=>Math.hypot(v.x-p.x,v.y-p.y)<weeperRules.alertRadius+45))continue;
  if(searches.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<weeperRules.alertRadius+15))continue;
  const solids=[...level.walls.map(monsterArchitecture),monsterArchitecture(level.door),...level.props,...features,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  if(solids.some(b=>overlaps(monsterFeetAt(p.x,p.y),b)))continue;
  const route=patrolPath(level.spawn,p,solids,level.bounds,monsterFeetAt),end=route.at(-1);
  if(end&&Math.hypot(end.x-p.x,end.y-p.y)<12&&(difficulty.weeper==='fixed'||weeperRoamPoints(level,p).length))return {...p};
 }
}

/** Local endpoints let a patient leave a chokepoint; its alert radius is not a permanent wall. */
export function weeperRoamPoints(level:Level,home:Position):Position[]{
 if(difficultyForNight(level.round).weeper!=='roaming')return [];
 const features=(level.features??[]).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8}));
 const solids=[...level.walls.map(monsterArchitecture),monsterArchitecture(level.door),...level.props,...features,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
 const points=reachablePositions(level,false,monsterFeetAt).filter(p=>Math.hypot(p.x-home.x,p.y-home.y)>=140&&Math.hypot(p.x-home.x,p.y-home.y)<=250&&!solids.some(b=>overlaps(monsterFeetAt(p.x,p.y),b)));
 const result:Position[]=[];
 for(const p of points){if(result.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<100))continue;const route=patrolPath(home,p,solids,level.bounds,monsterFeetAt);if(route.length>42||!route.length||Math.hypot(route.at(-1)!.x-p.x,route.at(-1)!.y-p.y)>12)continue;result.push(p);if(result.length===4)break;}
 return result;
}
