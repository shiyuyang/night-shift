import rules from '../../game/encounters.json' with {type:'json'};
import {clearContact,feetAt,monsterFeetAt,moveWithCollision,overlaps,type Box,type Position} from '../collision.ts';
import {patrolPath,followPatrolPath} from '../patrol.ts';
export const weeperRules=rules.weeper;
const riseThreshold=.75;
export type WeeperPhase='idle'|'alert'|'warning'|'dash'|'stunned'|'returning';
export type WeeperEvent='cry'|'warning'|'dash'|'suppressed'|'hit'|'quiet';
export interface WeeperInput {player:Position;hidden:boolean;angle:number;light:boolean;sprinting:boolean;noise:boolean;solids:Box[];architecture:Box[];bounds:Box;immune:boolean;flash?:boolean;}
/** One deterministic patient. No damage can occur before the flash decision. */
export class Weeper {
 position:Position;home:Position;phase:WeeperPhase='idle';anger=0;clock=0;angle=0;elapsed=0;cryAt=0;grace=1;route:Position[]=[];routeClock=0;watchful=0;hushed=false;noticed=false;noticeTime=0;calmWait=0;
 constructor(home:Position){this.home={...home};this.position={...home};}
 get dangerous(){return this.phase==='warning'||this.phase==='dash';}
 get awake(){return this.dangerous||this.phase==='returning';}
 flash(player:Position,solids:Box[]):boolean{
  if(Math.hypot(player.x-this.position.x,player.y-this.position.y)>weeperRules.flashRadius||!clearContact({x:player.x,y:player.y+10},{x:this.position.x,y:this.position.y+10},solids))return false;
  this.phase='stunned';this.clock=weeperRules.flashSeconds;this.anger=0;this.calmWait=0;this.watchful=12;this.hushed=true;this.route=[];return true;
 }
 tick(dt:number,input:WeeperInput):WeeperEvent[]{
  if(dt<=0)return [];
  const events:WeeperEvent[]=[];this.elapsed+=dt;this.grace=Math.max(0,this.grace-dt);
  if(input.flash&&this.flash(input.player,input.solids))return ['quiet','suppressed'];
  const distance=Math.hypot(input.player.x-this.position.x,input.player.y-this.position.y);
  const visible=!input.hidden&&clearContact({x:input.player.x,y:input.player.y+10},{x:this.position.x,y:this.position.y+10},input.solids);
  if(this.phase==='idle'||this.phase==='alert'){
   // Proximity tells are independent of the attack meter: walking quietly still gets a reaction.
   this.noticed=visible&&distance<(this.noticed?170:150);
   this.noticeTime=this.noticed?this.noticeTime+dt:0;
   const toward=Math.atan2(this.position.y-input.player.y,this.position.x-input.player.x),diff=Math.abs(Math.atan2(Math.sin(toward-input.angle),Math.cos(toward-input.angle)));
   const close=visible&&distance<weeperRules.alertRadius&&this.grace===0;
   this.watchful=Math.max(0,this.watchful-dt);
   const disturbance=close&&(this.watchful>0||input.light&&diff<.62||input.sprinting||input.noise||distance<50);
   // Frame 5 starts standing: from here the attack builds even after all stimuli disappear.
   if(disturbance||this.anger>=riseThreshold){this.calmWait=weeperRules.calmDelay;this.anger=Math.min(1,this.anger+dt/weeperRules.alertSeconds);}
   else{const cooling=Math.max(0,dt-this.calmWait);this.calmWait=Math.max(0,this.calmWait-dt);this.anger=Math.max(0,this.anger-cooling*weeperRules.calmRate);}
   this.phase=this.anger>0?'alert':'idle';
   if((this.noticed||this.anger>=.3)&&!this.hushed){this.hushed=true;events.push('quiet');}
   if(!this.noticed&&this.anger===0&&this.watchful===0&&this.hushed){this.hushed=false;this.cryAt=this.elapsed+3;}
   if(visible&&(this.noticed||this.phase==='alert'))this.angle=Math.atan2(input.player.y-this.position.y,input.player.x-this.position.x);
   if(close&&distance<weeperRules.touchRadius||this.anger>=1){this.phase='warning';this.clock=weeperRules.warningSeconds;events.push('quiet','warning');}
   else if(!this.hushed&&distance<290&&this.elapsed>=this.cryAt){this.cryAt=this.elapsed+8.5+Math.floor(this.elapsed)%3;events.push('cry');}
   return events;
  }
  if(this.phase==='warning'){
   this.clock=Math.max(0,this.clock-dt);
   if(this.clock===0){
    if(visible)this.angle=Math.atan2(input.player.y-this.position.y,input.player.x-this.position.x);
    this.phase='dash';this.clock=weeperRules.dashSeconds;return ['quiet','dash'];
   }
   return events;
  }
  if(this.phase==='dash'){
   const travel=weeperRules.dashSpeed*Math.min(dt,this.clock),steps=Math.max(1,Math.ceil(travel/2));
   for(let i=0;i<steps;i++){
    const dx=Math.cos(this.angle)*travel/steps,dy=Math.sin(this.angle)*travel/steps,next=moveWithCollision(this.position,dx,dy,input.architecture,monsterFeetAt);
    const blocked=Math.hypot(next.x-this.position.x-dx,next.y-this.position.y-dy)>.1;this.position=next;
    if(!input.hidden&&!input.immune&&overlaps(monsterFeetAt(next.x,next.y),feetAt(input.player.x,input.player.y))&&clearContact({x:next.x,y:next.y+10},{x:input.player.x,y:input.player.y+12},input.solids)){this.phase='stunned';this.clock=weeperRules.flashSeconds;return ['quiet','hit'];}
    if(blocked){this.phase='stunned';this.clock=weeperRules.missSeconds;return ['quiet'];}
   }
   this.clock=Math.max(0,this.clock-dt);if(this.clock===0){this.phase='stunned';this.clock=weeperRules.missSeconds;events.push('quiet');}return events;
  }
  if(this.phase==='stunned'){this.clock=Math.max(0,this.clock-dt);if(this.clock===0){this.phase='returning';this.routeClock=0;}return events;}
  if(Math.hypot(this.position.x-this.home.x,this.position.y-this.home.y)<6){this.phase='idle';this.anger=0;this.grace=2;return events;}
  this.routeClock-=dt;if(this.routeClock<=0){this.route=patrolPath(this.position,this.home,input.architecture,input.bounds,monsterFeetAt);this.routeClock=.6;}
  while(this.route.length&&Math.hypot(this.position.x-this.route[0].x,this.position.y-this.route[0].y)<.001)this.route.shift();
  // The grid's proximity goal can stop short of home; finish with collision-aware motion.
  const target=this.route[0]??this.home,a=Math.atan2(target.y-this.position.y,target.x-this.position.x);this.angle=a;
  const movement=followPatrolPath(this.position,this.route,48*dt,input.architecture);this.position=movement.position;if(movement.blocked)this.routeClock=0;return events;
 }
 get frame(){if(this.phase==='idle')return this.noticed?(this.noticeTime<.2?2:4):Math.floor(this.elapsed*2)%4;if(this.phase==='alert')return this.anger<riseThreshold?(this.noticeTime<.2?2:4):5;if(this.phase==='warning')return this.clock>weeperRules.warningSeconds*.8?5:this.clock>weeperRules.warningSeconds*.35?6:7;if(this.phase==='dash')return 8+Math.floor(this.elapsed*12)%4;if(this.phase==='stunned')return this.clock>4?12:14;return 8+Math.floor(this.elapsed*4)%2;}
}
