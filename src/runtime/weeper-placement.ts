import type {Level} from '../levels.ts';
import {monsterFeetAt,monsterArchitecture,overlaps,clearContact,feetAt,type Box,type Position} from '../collision.ts';
import {validatePlayableLevel} from './level-validation.ts';
import {patrolPath} from '../patrol.ts';
import {weeperRules} from './weeper.ts';
export function weeperExclusion(p:Position):Box{return {x:p.x-weeperRules.alertRadius,y:p.y-weeperRules.alertRadius,width:weeperRules.alertRadius*2,height:weeperRules.alertRadius*2};}
/** Authored LDtk sockets, then a conservative proof with the entire alert square blocked. */
export function chooseWeeper(level:Level,seed:number):Position|undefined{
 if(level.round<weeperRules.firstRound)return;
 const hash=(Math.imul(seed^level.round,1664525)+1013904223)>>>0;
 if(level.round!==weeperRules.firstRound&&hash/4294967296>weeperRules.chance)return;
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
  if([level.spawn,level.exit,level.doorUse,...level.monsterSpawns].some(v=>Math.hypot(v.x-p.x,v.y-p.y)<weeperRules.alertRadius+45))continue;
  if(searches.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<weeperRules.alertRadius+15))continue;
  const solids=[...level.walls.map(monsterArchitecture),monsterArchitecture(level.door),...level.props,...features,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  if(solids.some(b=>overlaps(monsterFeetAt(p.x,p.y),b)))continue;
  const test={...level,props:[...level.props,...features,{...zone,kind:'crate' as const}]};
  if(validatePlayableLevel(test).valid)return {...p};
 }
}
