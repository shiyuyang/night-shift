export const policyVersion=8;
export function canSpendOffense(count,fuses,reserve){return count>(fuses<3?reserve:0);}
export function objectiveOrder(route){if(route==='key-first')return ['key','box0','box1','door','box2','exit'];if(route==='box-first')return ['box0','key','box1','door','box2','exit'];throw Error('Unknown objective route '+route);}
/** Decisions use sampled visible tells, not hidden actor state. */
export function weeperResponse(observed,{flashlightOn,flashes,fuses,reserve,items,emergencyReady=true}){
 const weeper=observed.find(e=>e.kind==='weeper');if(!weeper)return {quiet:false,turnOff:false,flash:false};
 const quiet=['idle','alert','returning'].includes(weeper.mode)&&!weeper.dangerous;
 return {weeper,quiet,turnOff:flashlightOn,flash:emergencyReady&&weeper.dangerous&&weeper.gap<175&&canSpendOffense(flashes,fuses,reserve)&&items!=='none'&&items!=='decoy'};
}
export function activeThreat(enemy){return enemy.dangerous&&!['stunned','hesitation','light','returning'].includes(enemy.mode);}
export function quietHasPriority(quiet,observed,mixed){return quiet&&(mixed==='quiet'||!observed.some(e=>activeThreat(e)&&e.gap<95));}
/** Two thresholds avoid repeatedly restarting the game's stamina recovery delay. */
export class SprintPlan {
 active=false;recovering=false;
 decide(wanted,value,canSprint=true){
  if(value>=60)this.recovering=false;
  if(!wanted||!canSprint||value<=18){if(this.active||value<=18)this.recovering=value<60;this.active=false;return false;}
  if(this.active)return true;
  if(this.recovering||value<60)return false;
  this.active=true;return true;
 }
}
/** Counter decisions use visible position/tells and timers from our own inputs, never AI memory. */
export class PrimaryCounters {
 nextLight=0;faceUntil=0;escapeUntil=0;faceTarget=null;
 decide(time,observed,{battery,allowLight=true}){
  const listener=observed.find(e=>e.kind==='listener');
  const listenerQuiet=!!listener&&listener.gap>=85&&!observed.some(e=>e.kind!=='listener'&&activeThreat(e)&&e.gap<95);
  const light=observed.find(e=>e.kind==='light-shy'&&activeThreat(e)&&e.gap>45&&e.gap<(battery<20?180:210));
  if(allowLight&&battery>0&&light&&time>=this.nextLight){this.faceTarget={...light.position};this.faceUntil=time+.15;this.escapeUntil=this.faceUntil+2.3;this.nextLight=time+6.2;}
  const aim=allowLight&&time<this.faceUntil?this.faceTarget:null;
  return {listenerQuiet,aim,escape:time>=this.faceUntil&&time<this.escapeUntil};
 }
}
/** Revisiting a location after substantial travel is a diagnostic, not proof of bad play. */
export class RouteLoops {
 history=[];goal=null;distance=0;last=null;sampleAt=-Infinity;
 sample(frame){
  const nav=frame.input?.navigation,p=frame.player;
  const waiting=nav?.goal==='exit'&&frame.exitStartup>0&&p&&Math.hypot(p.x-nav.target.x,p.y-nav.target.y)<35&&!frame.enemies.some(e=>e.present&&activeThreat(e)&&e.gap<160);
  if(!nav||!p||waiting||nav.goal!==this.goal){this.history=[];this.distance=0;this.last=p;this.goal=nav?.goal;this.sampleAt=-Infinity;if(!nav||!p||waiting)return null;}
  if(this.last)this.distance+=Math.hypot(p.x-this.last.x,p.y-this.last.y);this.last=p;
  this.history=this.history.filter(h=>frame.time-h.time<=20);
  if(frame.time<this.sampleAt)return null;this.sampleAt=frame.time+.5;
  const prior=this.history.find(h=>frame.time-h.time>=6&&this.distance-h.distance>=200&&Math.hypot(p.x-h.position.x,p.y-h.position.y)<24);
  this.history.push({time:frame.time,position:{...p},distance:this.distance});
  return prior?{goal:nav.goal,seconds:frame.time-prior.time,traveled:this.distance-prior.distance,underThreat:frame.enemies.some(e=>e.present&&activeThreat(e)&&e.gap<160)}:null;
 }
}
