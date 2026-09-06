import type {Position,Box} from '../collision.ts';
import {center,type Feature} from './rogue-content.ts';
export type RogueEvent={type:'message';text:string}|{type:'sound';id:string}|{type:'loot';item:'flash'|'decoy'|'bandage';at:Position;full?:boolean}|{type:'alarm';at:Position}|{type:'damage';amount:number}|{type:'shortcut';gate:Box};
export function cacheOutcome(roll:number){return {loot:roll<.9,alarm:roll>=.6};}
export function waterPhase(time:number,offset=0){const t=(time+offset)%10;return t<2?'warning':t<5?'live':'safe';}
export class PressureDirector{
 recovery=0;tokens=2;refill=0;phase='探索';
 tick(dt:number,ghost:number,warning:number){this.recovery=Math.max(0,this.recovery-dt);this.refill+=dt;if(this.refill>=10){this.tokens=Math.min(2,this.tokens+Math.floor(this.refill/10));this.refill%=10;}this.phase=this.recovery>0?'喘息':warning>0?'预警':ghost>0?'追逐':'探索';}
 admit(){if(this.recovery>0||this.tokens===0)return false;this.tokens--;return true;}
 hurt(){this.recovery=Math.max(this.recovery,7);}
}
export class RogueRun{
 time=0;opened=new Set<string>();armed='';armUntil=0;generatorCharge=0;generatorId='';runningMachine='';machineTime=0;hidden='';hideTime=0;noiseCooldown=0;hurtCooldown=0;blockerPhase:'idle'|'warning'|'active'='idle';blockerClock=0;blockerStun=0;viewerCooldown=0;
 director=new PressureDirector();stats={cachesOpened:0,alarms:0,shortcuts:0,hazardsHit:0,hides:0,viewerAccepted:0,viewerRejected:0};
 features:Feature[];
 constructor(features:Feature[]=[]){this.features=features;}
 near(p:Position){return this.features.filter(f=>!['glass','water','steam','blocker'].includes(f.kind)&&Math.hypot(center(f).x-p.x,center(f).y-p.y)<38).sort((a,b)=>Math.hypot(center(a).x-p.x,center(a).y-p.y)-Math.hypot(center(b).x-p.x,center(b).y-p.y))[0];}
 hint(p:Position){if(this.hidden)return '藏身中 · E 离开 / 8 秒后呼吸声会暴露位置';const f=this.near(p);if(!f)return '';if(f.kind==='cache')return this.opened.has(f.id)?'补给药柜 · 已搜空':'补给药柜 · E 领取一件道具';if(f.kind==='generator')return this.opened.has(f.id)?'捷径已开启':`按住 E 手摇发电 ${Math.floor(this.generatorCharge/2.5*100)}% · 噪声引敌`;if(f.kind==='machine')return 'E 开启噪声设备 · 持续 10 秒引开追踪者';return 'E 藏入柜中 · 最多 8 秒 / 被看见时不可藏身';}
 interact(p:Position,watched:boolean,inventory?:Record<'flash'|'decoy'|'bandage',number>):RogueEvent[]{
 if(this.hidden){this.hidden='';return [{type:'message',text:'离开藏身柜。'}];}
 const f=this.near(p);if(!f)return [];
 if(f.kind==='cache'&&!this.opened.has(f.id)){
  if(inventory&&inventory[f.reward]>=3)return [{type:'loot',item:f.reward,at:center(f),full:true}];
  this.opened.add(f.id);this.stats.cachesOpened++;
  return [{type:'sound',id:'metal'},{type:'loot',item:f.reward,at:center(f)}];
 }
 if(f.kind==='machine'){this.runningMachine=f.id;this.machineTime=10;return [{type:'sound',id:'metal'},{type:'message',text:'机器开始运转。追踪者会被它吸引 10 秒。'}];}
 if(f.kind==='locker'){if(watched)return [{type:'message',text:'它看见你了！先拉开距离，再寻找藏身处。'}];this.hidden=f.id;this.hideTime=0;this.stats.hides++;return [{type:'sound',id:'metal'},{type:'message',text:'屏住呼吸。8 秒后必须离开，E 可提前出去。'}];}return [];
 }
 tick(dt:number,p:Position,moving:boolean,sprinting:boolean,holding:boolean,danger:boolean):RogueEvent[]{
 this.time+=dt;this.noiseCooldown=Math.max(0,this.noiseCooldown-dt);this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);this.blockerStun=Math.max(0,this.blockerStun-dt);this.viewerCooldown=Math.max(0,this.viewerCooldown-dt);this.machineTime=Math.max(0,this.machineTime-dt);const events:RogueEvent[]=[];
 const f=this.near(p);if(this.armed&&(this.time>this.armUntil||f?.id!==this.armed))this.armed='';
 if(this.hidden){this.hideTime+=dt;if(moving||this.hideTime>=8){this.hidden='';events.push({type:'alarm',at:p},{type:'sound',id:'breath'},{type:'message',text:'你离开了柜子，呼吸声暴露了位置。'});}}
 if(f?.kind==='generator'&&!this.opened.has(f.id)&&holding&&!moving){this.generatorCharge+=dt;this.generatorId=f.id;if(this.noiseCooldown===0){events.push({type:'alarm',at:center(f)},{type:'sound',id:'relay'});this.noiseCooldown=1;}if(this.generatorCharge>=2.5){this.opened.add(f.id);this.stats.shortcuts++;events.push({type:'shortcut',gate:f.gate!},{type:'message',text:'卷闸门升起，捷径已打开！'});this.generatorCharge=0;}}
 else{this.generatorCharge=0;this.generatorId='';}
 for(const feature of this.features){const c=center(feature),on=Math.abs(p.x-c.x)<feature.width/2&&Math.abs(p.y+12-c.y)<feature.height/2;
  if(feature.kind==='glass'&&on&&moving&&this.noiseCooldown===0){events.push({type:'alarm',at:p},{type:'sound',id:'metal'});this.noiseCooldown=sprinting?.6:2;}
  if(feature.kind==='water'&&on&&waterPhase(this.time,feature.roll*10)==='live'&&this.hurtCooldown===0){events.push({type:'damage',amount:12},{type:'sound',id:'impact'});this.hurtCooldown=2;}
 }
 const blocker=this.features.find(f=>f.kind==='blocker');const near=blocker&&Math.hypot(center(blocker).x-p.x,center(blocker).y-p.y)<90;
 this.blockerClock=Math.max(0,this.blockerClock-dt);
 if(this.blockerStun>0||!danger||this.hidden){this.blockerPhase='idle';this.blockerClock=Math.max(this.blockerClock,2);}
 else if(this.blockerClock===0){if(this.blockerPhase==='idle'&&near){this.blockerPhase='warning';this.blockerClock=2;events.push({type:'sound',id:'ghost'},{type:'message',text:'守门者正在抬头！避开它脚下的血痕。'});}else if(this.blockerPhase==='warning'){this.blockerPhase='active';this.blockerClock=3;}else if(this.blockerPhase==='active'){this.blockerPhase='idle';this.blockerClock=7;}}
 if(blocker&&this.blockerPhase==='active'&&near&&Math.hypot(center(blocker).x-p.x,center(blocker).y-p.y)<38&&this.hurtCooldown===0){events.push({type:'damage',amount:18});this.hurtCooldown=2;}
 return events;
 }
 get distraction(){const f=this.features.find(f=>f.id===this.runningMachine);return this.machineTime>0&&f?center(f):undefined;}
 steamAt(p:Position){return this.features.some(f=>f.kind==='steam'&&(this.time+f.roll*10)%10<5&&Math.abs(p.x-center(f).x)<f.width&&Math.abs(p.y-center(f).y)<f.height);}
}
