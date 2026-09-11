import {positionQuery} from './position-query.ts';
import {difficultyForNight} from './difficulty.ts';
import type {Box,Position} from '../collision.ts';
import {feetAt,overlaps} from '../collision.ts';
import type {Level} from '../levels.ts';
import {reachablePositions,analyzePlayableLevel} from './level-validation.ts';
import {containerRooms,containerCandidates,spreadContainerCandidates} from './container-placement.ts';
export type FeatureKind='empty-task'|'cache'|'generator'|'glass'|'water'|'steam'|'machine'|'locker'|'blocker';
export interface Feature extends Box {id:string;kind:FeatureKind;roll:number;reward:'flash'|'decoy'|'bandage';hasLoot?:boolean;gate?:Box;}
export const center=(f:Box):Position=>({x:f.x+f.width/2,y:f.y+f.height/2});
export const featureSafetyBox=(f:Feature):Box=>({x:f.x-12,y:f.y-24,width:f.width+24,height:f.height+36});
/** Retry a cramped item layout rather than silently dropping content or clustering it. */
export function hasDistributedContainers(level:Level){
 const features=level.features??[],caches=features.filter(f=>f.kind==='cache'),points=caches.map(center);
 return caches.length>=4&&caches.length<=6&&features.filter(f=>f.kind==='locker').length===1
  &&features.filter(f=>f.kind==='empty-task').length>=difficultyForNight(level.round).emptyTaskMin
  &&Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>=400
  &&Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))>=200;
}
/** Place optional content away from main interactions, proving a route with every danger avoided. */
export function populateRogueContent(level:Level,rng:()=>number){
 const rooms=containerRooms(level);
 const points=reachablePositions(level,false);
 for(let i=points.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
 // Score fixed geometry once, then re-rank only occupancy and spacing per item.
 const placements=containerCandidates(points,rooms,[...level.walls,...level.props]);
 level.features=[];
 const essential=[level.spawn,level.key,...level.boxes,level.doorUse,level.exit,...level.monsterSpawns];
 const blocked:Box[]=[];
 // Spread cabinets across optional rooms; decide the two rewards after placement.
 const cacheRoll=rng(),cacheCount=level.round===1?4:4+Math.floor(cacheRoll*3);
 const kinds:FeatureKind[]=[...Array(4).fill('cache'),'locker',...Array(cacheCount-4).fill('cache')];
 for(const [index,kind] of kinds.entries()){
  // Secure a spread of supplies before empty boxes or a locker consume the only
  // usable corner of a small room. Reserve empty-box space before bonus caches.
  if(index===4){populateEmptyTaskBoxes(level,rng);blocked.splice(0,blocked.length,...level.features.map(featureSafetyBox));}
  const candidates=spreadContainerCandidates(placements,[...level.boxes,...level.features.map(center)],rooms,level.features.filter(f=>f.kind==='cache').map(center));
  for(const p of candidates){if(essential.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<78)||level.features.some(f=>Math.hypot(center(f).x-p.x,center(f).y-p.y)<96))continue;
   const width=kind==='water'||kind==='steam'?36:kind==='glass'?32:24,height=kind==='water'||kind==='steam'?24:20;
   const f:Feature={id:kind+'-'+level.features.length,kind,x:p.x-width/2,y:p.y-height/2,width,height,roll:rng(),reward:(['flash','decoy','bandage'] as const)[Math.floor(rng()*3)]};
   const safe=featureSafetyBox(f);if((level.theme===1&&level.round<=7)&&level.weeperFixed&&Math.hypot(center(f).x-level.weeperFixed.x,center(f).y-level.weeperFixed.y)<180)continue;if([...level.walls,...level.props].some(b=>overlaps(safe,b)))continue;
   const test={...level,props:[...level.props,...blocked.map(b=>({...b,kind:'crate' as const})),{...safe,kind:'crate' as const}]};
   const validation=analyzePlayableLevel(test);if(!validation.valid)continue;
   // The visible front of each cabinet must be approachable, including after
   // all optional furniture has been placed.
   if([...level.features,f].some(v=>!(v.kind==='empty-task'?validation.openNear:validation.closedNear)({x:center(v).x,y:center(v).y+28},8)))continue;
   level.features.push(f);blocked.push(safe);break;
  }
 }
 const caches=level.features.filter(f=>f.kind==='cache');
 for(let i=caches.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[caches[i],caches[j]]=[caches[j],caches[i]];}
 if(level.round<=4)caches.sort((a,b)=>Math.hypot(center(a).x-level.spawn.x,center(a).y-level.spawn.y)-Math.hypot(center(b).x-level.spawn.x,center(b).y-level.spawn.y));
 caches.forEach((f,i)=>f.hasLoot=i<2);
 return level;
}


// Extra task-shaped containers never enter the three-box progression chain.
function populateEmptyTaskBoxes(level:Level,rng:()=>number){
 const features=level.features!,closed=reachablePositions(level,false),open=reachablePositions(level,true);
 const rooms=containerRooms(level);
 const closedNear=level.round===1?positionQuery(closed):null;
 const points=open.filter(p=>rooms.some(b=>p.x>b.x+24&&p.x<b.x+b.width-24&&p.y>b.y+24&&p.y<b.y+b.height-24)
  &&(!closedNear||!closedNear(p,16)));
 for(let i=points.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
 const placements=containerCandidates(points,rooms,[...level.walls,...level.props]);
 const d=difficultyForNight(level.round),count=d.emptyTaskMin+Math.floor(rng()*(d.emptyTaskMax-d.emptyTaskMin+1));
 for(let i=0;i<count;i++){
  for(const p of spreadContainerCandidates(placements,[...level.boxes,...features.map(center)],rooms)){
   if([level.spawn,level.key,level.doorUse,level.exit,...level.monsterSpawns].some(v=>Math.hypot(v.x-p.x,v.y-p.y)<90)||level.boxes.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<120)||features.some(f=>Math.hypot(center(f).x-p.x,center(f).y-p.y)<80))continue;
   if(level.theme===1&&level.round<=7&&level.weeperFixed&&Math.hypot(p.x-level.weeperFixed.x,p.y-level.weeperFixed.y)<180)continue;
   const f:Feature={id:'empty-task-'+i,kind:'empty-task',x:p.x-13,y:p.y-10,width:26,height:20,roll:0,reward:'flash',hasLoot:false};
   const safe=featureSafetyBox(f);
   if([...level.walls,...level.props,...features.map(featureSafetyBox)].some(b=>overlaps(safe,b)))continue;
   const test={...level,props:[...level.props,...[...features,f].map(v=>({...featureSafetyBox(v),kind:'crate' as const}))]};
   const validation=analyzePlayableLevel(test);if(!validation.valid)continue;
   const afterClosed=validation.closedNear,afterOpen=validation.openNear;
   if([...features,f].some(v=>!(v.kind==='empty-task'?afterOpen:afterClosed)({x:center(v).x,y:center(v).y+28},8)))continue;
   features.push(f);break;
  }
 }
}
