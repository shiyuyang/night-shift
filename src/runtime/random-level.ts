import searchSpots from '../../game/search-spots.json' with {type:'json'};
import {weeperExclusion} from './weeper-placement.ts';
import {populateRogueContent} from './rogue-content.ts';
import type {Level} from '../levels.ts';
import {overlaps,clearContact} from '../collision.ts';
import {validatePlayableLevel} from './level-validation.ts';
export function seededRandom(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function openingSearchPairs(base:Level){
 const spots=searchSpots[String(base.theme) as keyof typeof searchSpots];
 const solids=[...base.walls,...base.props,base.door];
 // Authoring pools retain room purpose. Require a turn around real geometry,
 // rather than making small objects darker or extending a straight walk.
 const hidden=(p:{x:number;y:number})=>!clearContact(base.spawn,p,solids);
 return spots.key.filter(hidden).flatMap(key=>spots.free.filter(box=>hidden(box)
  &&Math.hypot(key.x-box.x,key.y-box.y)>=300&&!clearContact(key,box,solids)).map(box=>({key,box})));
}
function candidate(base:Level,seed:number):Level{
 const level=structuredClone(base),rng=seededRandom(seed);
 const spots=searchSpots[String(base.theme) as keyof typeof searchSpots];
 const pick=(points:{x:number;y:number}[])=>({...points[Math.floor(rng()*points.length)]});
 // Every theme declares independent functional pools; the lock chain is validated below.
 const pairs=openingSearchPairs(base);
 if(!pairs.length)throw Error(`No opening search route for theme ${base.theme}`);
 const pair=pairs[Math.floor(rng()*pairs.length)];
 level.key={...pair.key};
 level.boxes=[{...pair.box},pick(spots.brass),pick(spots.sealed)];
 level.generation={seed,attempts:1,fallback:false,modules:[]};return level;
}
export function randomizeLevel(base:Level,seed:number,maxAttempts=12):Level{
 for(let i=0;i<maxAttempts;i++){
  const level=candidate(base,(seed+i*0x9e3779b9)>>>0);
  const doorCenter={x:level.door.x+level.door.width/2,y:level.door.y+level.door.height/2};
  level.boxes=level.boxes.map((b,i)=>Math.hypot(b.x-doorCenter.x,b.y-doorCenter.y)<90?{...base.boxes[i]}:b);
  const bodies=[{x:level.key.x-6,y:level.key.y-6,width:12,height:12},...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  // Reachability alone would allow an item embedded in the edge of furniture.
  if(bodies.some((b,n)=>[...level.walls,...level.props,level.door,...bodies.slice(n+1)].some(s=>overlaps(b,s))))continue;
  const fixed=(level.theme===1&&level.round<=7)&&level.weeperFixed;
  if(fixed&&!validatePlayableLevel({...level,props:[...level.props,{...weeperExclusion(fixed),kind:'crate'}]}).valid)continue;
  if(validatePlayableLevel(level).valid){level.generation={...level.generation!,seed:seed>>>0,attempts:i+1};return populateRogueContent(level,seededRandom(seed^0x1234abcd));}
 }
 // Keep the opening-search contract even when a later randomized lock fails.
 for(const pair of openingSearchPairs(base)){
  const fallback={...structuredClone(base),key:{...pair.key},boxes:[{...pair.box},...base.boxes.slice(1)]};
  const bodies=[{x:pair.key.x-6,y:pair.key.y-6,width:12,height:12},...fallback.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21}))];
  if(bodies.some((b,n)=>[...fallback.walls,...fallback.props,fallback.door,...bodies.slice(n+1)].some(s=>overlaps(b,s))))continue;
  const fixed=(fallback.theme===1&&fallback.round<=7)&&fallback.weeperFixed;
  if(fixed&&!validatePlayableLevel({...fallback,props:[...fallback.props,{...weeperExclusion(fixed),kind:'crate'}]}).valid)continue;
  if(validatePlayableLevel(fallback).valid)return populateRogueContent({...fallback,generation:{seed:seed>>>0,attempts:maxAttempts,fallback:true,modules:[]}},seededRandom(seed));
 }
 throw Error('Fallback map failed opening search validation');
}
