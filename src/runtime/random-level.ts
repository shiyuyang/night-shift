import {difficultyForNight} from './difficulty.ts';
import searchSpots from '../../game/search-spots.json' with {type:'json'};
import {weeperExclusion} from './weeper-placement.ts';
import {populateRogueContent,hasDistributedContainers} from './rogue-content.ts';
import type {Level} from '../levels.ts';
import {overlaps,clearContact} from '../collision.ts';
import {validatePlayableLevel} from './level-validation.ts';
import {containerRooms,insideRoom} from './container-placement.ts';
import type {Box,Position} from '../collision.ts';
export function seededRandom(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function openingSearchPairs(base:Level){
 const spots=searchSpots[String(base.theme) as keyof typeof searchSpots];
 const solids=[...base.walls,...base.props,base.door];
 // Authoring pools retain storage areas. Require a turn around real geometry,
 // rather than making small objects darker or extending a straight walk.
 const d=difficultyForNight(base.round);
 const hidden=(p:{x:number;y:number})=>!d.hiddenOpening||!clearContact(base.spawn,p,solids);
 return spots.key.filter(hidden).flatMap(key=>spots.task.filter(box=>hidden(box)
  &&Math.hypot(key.x-box.x,key.y-box.y)>=d.openingSeparation&&(!d.hiddenOpening||!clearContact(key,box,solids))).map(box=>({key,box})));
}
const roomAt=(point:Position,rooms:Box[])=>rooms.findIndex(b=>insideRoom(point,b,-1));
function pickRoom<T>(items:T[],position:(item:T)=>Position,rooms:Box[],rng:()=>number):T[]{
 const groups=new Map<number,T[]>();
 for(const item of items){const id=roomAt(position(item),rooms),group=groups.get(id)??[];group.push(item);groups.set(id,group);}
 return [...groups.values()][Math.floor(rng()*groups.size)];
}
function brassCandidates(base:Level,pair:{key:Position;box:Position},rooms:Box[]){
 const spots=searchSpots[String(base.theme) as keyof typeof searchSpots];
 return spots.task.filter(p=>roomAt(p,rooms)!==roomAt(pair.box,rooms)
  &&Math.hypot(p.x-pair.box.x,p.y-pair.box.y)>=180&&Math.hypot(p.x-pair.key.x,p.y-pair.key.y)>=80);
}
function candidate(base:Level,seed:number):Level|null{
 const level=structuredClone(base),rng=seededRandom(seed);
 const spots=searchSpots[String(base.theme) as keyof typeof searchSpots];
 const pick=(points:{x:number;y:number}[])=>({...points[Math.floor(rng()*points.length)]});
 // The first two roles share unlocked storage rooms; the last box keeps its
 // separate locked-room pool. Validate the complete key chain below.
 const pairs=openingSearchPairs(base);
 if(!pairs.length)throw Error(`No opening search route for theme ${base.theme}`);
 // Pick a room before a pair: rooms with more compatible box coordinates must
 // not dominate key placement, and the spawn-side room has no special weight.
 const rooms=containerRooms(base),keyGroup=pickRoom(pairs,p=>p.key,rooms,rng);
 const boxGroup=pickRoom(keyGroup,p=>p.box,rooms,rng),pair=boxGroup[Math.floor(rng()*boxGroup.length)];
 const brass=brassCandidates(base,pair,rooms);if(!brass.length)return null;
 level.key={...pair.key};
 level.boxes=[{...pair.box},pick(pickRoom(brass,p=>p,rooms,rng)),pick(spots.sealed)];
 level.generation={seed,attempts:1,fallback:false,modules:[]};return level;
}
export function randomizeLevel(base:Level,seed:number,maxAttempts=12):Level{
 for(let i=0;i<maxAttempts;i++){
  const level=candidate(base,(seed+i*0x9e3779b9)>>>0);
  if(!level)continue;
  const doorCenter={x:level.door.x+level.door.width/2,y:level.door.y+level.door.height/2};
  level.boxes=level.boxes.map((b,i)=>Math.hypot(b.x-doorCenter.x,b.y-doorCenter.y)<90?{...base.boxes[i]}:b);
  const bodies=[{x:level.key.x-6,y:level.key.y-6,width:12,height:12},...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  // Reachability alone would allow an item embedded in the edge of furniture.
  if(bodies.some((b,n)=>[...level.walls,...level.props,level.door,...bodies.slice(n+1)].some(s=>overlaps(b,s))))continue;
  const fixed=(level.theme===1&&level.round<=7)&&level.weeperFixed;
  if(fixed&&!validatePlayableLevel({...level,props:[...level.props,{...weeperExclusion(fixed),kind:'crate'}]}).valid)continue;
  if(validatePlayableLevel(level).valid){
   level.generation={...level.generation!,seed:seed>>>0,attempts:i+1};
   populateRogueContent(level,seededRandom((seed^0x1234abcd)+i*0x9e3779b9));
   if(hasDistributedContainers(level))return level;
  }
 }
 // Deterministic fallback retains both the opening search and distinct storage
 // areas. The authored final box still preserves the locked-room route.
 const rooms=containerRooms(base);
 for(const pair of openingSearchPairs(base))for(const brass of brassCandidates(base,pair,rooms)){
  const fallback={...structuredClone(base),key:{...pair.key},boxes:[{...pair.box},{...brass},{...base.boxes[2]}]};
  const bodies=[{x:pair.key.x-6,y:pair.key.y-6,width:12,height:12},...fallback.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  if(bodies.some((b,n)=>[...fallback.walls,...fallback.props,fallback.door,...bodies.slice(n+1)].some(s=>overlaps(b,s))))continue;
  const fixed=(fallback.theme===1&&fallback.round<=7)&&fallback.weeperFixed;
  if(fixed&&!validatePlayableLevel({...fallback,props:[...fallback.props,{...weeperExclusion(fixed),kind:'crate'}]}).valid)continue;
  if(validatePlayableLevel(fallback).valid){
   const level=populateRogueContent({...fallback,generation:{seed:seed>>>0,attempts:maxAttempts,fallback:true,modules:[]}},seededRandom(seed));
   if(hasDistributedContainers(level))return level;
  }
 }
 throw Error('Fallback map failed opening search validation');
}
