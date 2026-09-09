import {t as msg} from '../i18n.ts';
import type {Position,Box} from '../collision.ts';
import {center,type Feature} from './rogue-content.ts';
export type RogueEvent={type:'box-search'}|{type:'noise'}|{type:'message';text:string}|{type:'sound';id:string}|{type:'loot';item:'flash'|'decoy'|'bandage';at:Position;full?:boolean}|{type:'alarm';at:Position}|{type:'damage';amount:number}|{type:'shortcut';gate:Box};
export function cacheOutcome(roll:number){return {loot:roll<.9,alarm:roll>=.6};}
export function waterPhase(time:number,offset=0){const t=(time+offset)%10;return t<2?'warning':t<5?'live':'safe';}
export class PressureDirector{
 recovery=0;tokens=2;refill=0;phase=msg("rogue.explore");
 tick(dt:number,ghost:number,warning:number){this.recovery=Math.max(0,this.recovery-dt);this.refill+=dt;if(this.refill>=10){this.tokens=Math.min(2,this.tokens+Math.floor(this.refill/10));this.refill%=10;}this.phase=this.recovery>0?msg("rogue.recover"):warning>0?msg("rogue.warning"):ghost>0?msg("rogue.pursuit"):msg("rogue.explore");}
 admit(){if(this.recovery>0||this.tokens===0)return false;this.tokens--;return true;}
 hurt(){this.recovery=Math.max(this.recovery,7);}
}
export class RogueRun{
 time=0;opened=new Set<string>();armed='';armUntil=0;generatorCharge=0;generatorId='';runningMachine='';machineTime=0;hidden='';hideTime=0;noiseCooldown=0;hurtCooldown=0;blockerPhase:'idle'|'warning'|'active'='idle';blockerClock=0;blockerStun=0;viewerCooldown=0;
 director=new PressureDirector();stats={cachesOpened:0,alarms:0,shortcuts:0,hazardsHit:0,hides:0,viewerAccepted:0,viewerRejected:0};
 features:Feature[];
 constructor(features:Feature[]=[]){this.features=features;}
 near(p:Position){return this.features.filter(f=>!['glass','water','steam','blocker'].includes(f.kind)&&Math.hypot(center(f).x-p.x,center(f).y-p.y)<(f.kind==='empty-task'?44:38)).sort((a,b)=>Math.hypot(center(a).x-p.x,center(a).y-p.y)-Math.hypot(center(b).x-p.x,center(b).y-p.y))[0];}
 hint(p:Position){if(this.hidden)return msg("rogue.hiding-e-to-leave-breathing-exposes-you");const f=this.near(p);if(!f)return '';if(f.kind==='empty-task')return this.opened.has(f.id)?msg('gameplay.task-box-empty'):msg('gameplay.e-search-unlocked-box');if(f.kind==='cache')return this.opened.has(f.id)?msg("rogue.supply-cabinet-empty"):msg("rogue.search-supply-cabinet");if(f.kind==='generator')return this.opened.has(f.id)?msg("rogue.shortcut-opened"):msg("rogue.hold-e-to-crank-generator-noise-attracts", {percent:Math.floor(this.generatorCharge/2.5*100)});if(f.kind==='machine')return msg("rogue.e-to-start-noisy-machinery-distracts-pursuers");return msg("rogue.e-to-hide-maximum-seconds-cannot-hide");}
 interact(p:Position,watched:boolean,inventory?:Record<'flash'|'decoy'|'bandage',number>):RogueEvent[]{
 if(this.hidden){this.hidden='';return [{type:'message',text:msg("rogue.left-the-locker")}];}
 const f=this.near(p);if(!f)return [];
 if(f.kind==='empty-task'&&!this.opened.has(f.id)){this.opened.add(f.id);return [{type:'sound',id:'pickup'},{type:'box-search'},{type:'message',text:msg('gameplay.task-box-empty')}];}
 if(f.kind==='cache'&&!this.opened.has(f.id)){
  if(f.hasLoot===false){this.opened.add(f.id);this.stats.cachesOpened++;return [{type:'sound',id:'metal'},{type:'noise'},{type:'message',text:msg("rogue.supply-cabinet-empty")}];}
  if(inventory&&inventory[f.reward]>=3)return [{type:'loot',item:f.reward,at:center(f),full:true}];
  this.opened.add(f.id);this.stats.cachesOpened++;
  return [{type:'sound',id:'metal'},{type:'noise'},{type:'loot',item:f.reward,at:center(f)}];
 }
 if(f.kind==='machine'){this.runningMachine=f.id;this.machineTime=10;return [{type:'sound',id:'metal'},{type:'message',text:msg("rogue.the-machine-starts-it-attracts-pursuers-for")}];}
 if(f.kind==='locker'){if(watched)return [{type:'message',text:msg("rogue.it-saw-you-gain-distance-before-hiding")}];this.hidden=f.id;this.hideTime=0;this.stats.hides++;return [{type:'sound',id:'metal'},{type:'message',text:msg("rogue.hold-your-breath-leave-within-seconds-press")}];}return [];
 }
 tick(dt:number,p:Position,moving:boolean,sprinting:boolean,holding:boolean,danger:boolean):RogueEvent[]{
 this.time+=dt;this.noiseCooldown=Math.max(0,this.noiseCooldown-dt);this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);this.blockerStun=Math.max(0,this.blockerStun-dt);this.viewerCooldown=Math.max(0,this.viewerCooldown-dt);this.machineTime=Math.max(0,this.machineTime-dt);const events:RogueEvent[]=[];
 const f=this.near(p);if(this.armed&&(this.time>this.armUntil||f?.id!==this.armed))this.armed='';
 if(this.hidden){this.hideTime+=dt;if(moving||this.hideTime>=8){this.hidden='';events.push({type:'alarm',at:p},{type:'sound',id:'breath'},{type:'message',text:msg("rogue.you-left-the-locker-your-breathing-exposed")});}}
 if(f?.kind==='generator'&&!this.opened.has(f.id)&&holding&&!moving){this.generatorCharge+=dt;this.generatorId=f.id;if(this.noiseCooldown===0){events.push({type:'alarm',at:center(f)},{type:'sound',id:'relay'});this.noiseCooldown=1;}if(this.generatorCharge>=2.5){this.opened.add(f.id);this.stats.shortcuts++;events.push({type:'shortcut',gate:f.gate!},{type:'message',text:msg("rogue.the-shutter-rises-shortcut-opened")});this.generatorCharge=0;}}
 else{this.generatorCharge=0;this.generatorId='';}
 for(const feature of this.features){const c=center(feature),on=Math.abs(p.x-c.x)<feature.width/2&&Math.abs(p.y+12-c.y)<feature.height/2;
  if(feature.kind==='glass'&&on&&moving&&this.noiseCooldown===0){events.push({type:'alarm',at:p},{type:'sound',id:'metal'});this.noiseCooldown=sprinting?.6:2;}
  if(feature.kind==='water'&&on&&waterPhase(this.time,feature.roll*10)==='live'&&this.hurtCooldown===0){events.push({type:'damage',amount:12},{type:'sound',id:'impact'});this.hurtCooldown=2;}
 }
 const blocker=this.features.find(f=>f.kind==='blocker');const near=blocker&&Math.hypot(center(blocker).x-p.x,center(blocker).y-p.y)<90;
 this.blockerClock=Math.max(0,this.blockerClock-dt);
 if(this.blockerStun>0||!danger||this.hidden){this.blockerPhase='idle';this.blockerClock=Math.max(this.blockerClock,2);}
 else if(this.blockerClock===0){if(this.blockerPhase==='idle'&&near){this.blockerPhase='warning';this.blockerClock=2;events.push({type:'sound',id:'ghost'},{type:'message',text:msg("rogue.the-gatekeeper-is-looking-up-avoid-the")});}else if(this.blockerPhase==='warning'){this.blockerPhase='active';this.blockerClock=3;}else if(this.blockerPhase==='active'){this.blockerPhase='idle';this.blockerClock=7;}}
 if(blocker&&this.blockerPhase==='active'&&near&&Math.hypot(center(blocker).x-p.x,center(blocker).y-p.y)<38&&this.hurtCooldown===0){events.push({type:'damage',amount:18});this.hurtCooldown=2;}
 return events;
 }
 get distraction(){const f=this.features.find(f=>f.id===this.runningMachine);return this.machineTime>0&&f?center(f):undefined;}
 steamAt(p:Position){return this.features.some(f=>f.kind==='steam'&&(this.time+f.roll*10)%10<5&&Math.abs(p.x-center(f).x)<f.width&&Math.abs(p.y-center(f).y)<f.height);}
}
