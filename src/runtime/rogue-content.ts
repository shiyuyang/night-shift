import type {Box,Position} from '../collision.ts';
import {feetAt,overlaps} from '../collision.ts';
import type {Level} from '../levels.ts';
import {reachablePositions,validatePlayableLevel} from './level-validation.ts';
export type FeatureKind='cache'|'generator'|'glass'|'water'|'steam'|'machine'|'locker'|'blocker';
export interface Feature extends Box {id:string;kind:FeatureKind;roll:number;reward:'flash'|'decoy'|'bandage';gate?:Box;}
export const center=(f:Box):Position=>({x:f.x+f.width/2,y:f.y+f.height/2});
export const featureSafetyBox=(f:Feature):Box=>({x:f.x-12,y:f.y-24,width:f.width+24,height:f.height+36});
/** Place optional content away from main interactions, proving a route with every danger avoided. */
export function populateRogueContent(level:Level,rng:()=>number){
 const rooms=Object.entries(level.zones).filter(([id])=>id.startsWith('Optional')&&id.endsWith('Zone')).map(([,bounds])=>bounds);
 const points=reachablePositions(level,false).filter(p=>rooms.some(b=>p.x>b.x+24&&p.x<b.x+b.width-24&&p.y>b.y+24&&p.y<b.y+b.height-24));
 for(let i=points.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
 // Prefer the back of a room, beside a wall or furnishing, over the aisle.
 const distance=(p:Position,b:Box)=>Math.hypot(Math.max(b.x-p.x,0,p.x-b.x-b.width),Math.max(b.y-p.y,0,p.y-b.y-b.height));
 points.sort((a,b)=>Math.min(...[...level.walls,...level.props].map(w=>distance(a,w)))-Math.min(...[...level.walls,...level.props].map(w=>distance(b,w))));
 level.features=[];const essential=[level.spawn,level.key,...level.boxes,level.doorUse,level.exit,...level.monsterSpawns];
 const blocked:Box[]=[];
 // One supply cabinet and one hiding locker; no ambient hazards in the core loop.
 for(const kind of ['cache','locker'] as FeatureKind[]){
  for(const p of points){if(essential.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<78)||level.features.some(f=>Math.hypot(center(f).x-p.x,center(f).y-p.y)<80))continue;
   const width=kind==='water'||kind==='steam'?36:kind==='glass'?32:24,height=kind==='water'||kind==='steam'?24:20;
   const f:Feature={id:kind+'-'+level.features.length,kind,x:p.x-width/2,y:p.y-height/2,width,height,roll:rng(),reward:(['flash','decoy','bandage'] as const)[Math.floor(rng()*3)]};
   const safe=featureSafetyBox(f);if([...level.walls,...level.props].some(b=>overlaps(safe,b)))continue;
   const test={...level,props:[...level.props,...blocked.map(b=>({...b,kind:'crate' as const})),{...safe,kind:'crate' as const}]};
   if(!validatePlayableLevel(test).valid)continue;
   // The visible front of each cabinet must be approachable, including after
   // all optional furniture has been placed.
   const reach=reachablePositions(test,false);
   if([...level.features,f].some(v=>!reach.some(p=>Math.hypot(p.x-center(v).x,p.y-(center(v).y+28))<8)))continue;
   level.features.push(f);blocked.push(safe);break;
  }
 }
 return level;
}
