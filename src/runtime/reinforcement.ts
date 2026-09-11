import {ExitPatrol} from './exit-patrol.ts';
import {AttackRecovery} from './attack-recovery.ts';
import {SightLock} from './sight-lock.ts';
import {DistractionResponse,type SoundReception} from './distraction-response.ts';
import {monsterFeetAt,clearContact,moveWithCollision,type Box,type Position} from '../collision.ts';
import {patrolPath,followPatrolPath} from '../patrol.ts';
export type ReinforcementInput={player:Position;hidden:boolean;distraction?:Position;sound?:SoundReception;doorTarget?:Position;goal?:Position;patrolGoals?:Position[];speed?:number;retreat:boolean;visible:(p:Position)=>boolean;solids:Box[];bounds:Box};
/** Physical patrol shared by resident and exit-side enemies. */
export class Reinforcement {
 diagnosticsEnabled=false;diagnostics:{mode:string;reason:string;seen:boolean;blocked:boolean;target?:Position}={mode:"absent",reason:"not-spawned",seen:false,blocked:false};
 position:Position|null=null;entry:Position|null=null;target:Position|null=null;route:Position[]=[];
 exitPatrol=new ExitPatrol();patrolIntent:Position|undefined;private routeFailed=false;
 attackRecovery=new AttackRecovery();distractionResponse=new DistractionResponse();sightLock=new SightLock();
 searchAnchor:Position|null=null;searchGoal:Position|null=null;searchIndex=0;idle=0;private checkpoint:Position|null=null;private idlePosition:Position|null=null;
 resetSearch(){this.searchAnchor=null;this.searchGoal=null;this.checkpoint=null;this.searchIndex=0;this.idle=0;this.idlePosition=null;}
 /** Short reachable legs around the checkpoint/nearest reachable approach, never the player. */
 nextSearchGoal(solids:Box[],bounds:Box){
  if(!this.position)return;
  this.searchAnchor??={...this.position};this.searchGoal=null;
  for(let i=0;i<8;i++){
   const angle=(this.searchIndex++%8)*Math.PI/4;
   const point={x:this.searchAnchor.x+Math.cos(angle)*88,y:this.searchAnchor.y+Math.sin(angle)*88};
   if(point.x<bounds.x||point.x>bounds.x+bounds.width||point.y<bounds.y||point.y>bounds.y+bounds.height)continue;
   const route=patrolPath(this.position,point,solids,bounds,monsterFeetAt),end=route.at(-1);
   let length=0,previous=this.position;for(const step of route){length+=Math.hypot(step.x-previous.x,step.y-previous.y);previous=step;}
   if(end&&Math.hypot(end.x-point.x,end.y-point.y)<16&&Math.hypot(end.x-this.position.x,end.y-this.position.y)>32&&length<=220){this.searchGoal={...end};this.route=route;this.routeClock=.6;break;}
  }
  this.idle=0;this.idlePosition={...this.position};
 }
 warning=0;stun=0;routeClock=0;clueClock=0;stride=0;angle=0;used=false;retry=0;guard=0;
 spawn(position:Position,target:Position,guardSeconds=0){this.exitPatrol=new ExitPatrol();this.patrolIntent=undefined;this.routeFailed=false;this.prepared=false;this.seen=false;this.distractionResponse=new DistractionResponse();this.attackRecovery=new AttackRecovery();this.sightLock.reset();this.resetSearch();this.used=true;this.entry={...position};this.position={...position};this.target={...target};this.warning=0;this.clueClock=4;this.routeClock=0;this.guard=guardSeconds;}
 flash(player:Position,solids:Box[]){
  if(!this.position||this.warning>0||Math.hypot(player.x-this.position.x,player.y-this.position.y)>=190||!clearContact(player,this.position,solids))return false;
  this.stun=2;const a=Math.atan2(this.position.y-player.y,this.position.x-player.x);
  this.position=moveWithCollision(this.position,Math.cos(a)*65,Math.sin(a)*65,solids,monsterFeetAt);this.route=[];this.routeClock=0;return true;
 }
 private prepared=false;seen=false;
 prepare(dt:number,input:ReinforcementInput){
  if(dt<=0||!this.position)return;
  this.prepared=true;this.attackRecovery.tick(dt);this.warning=Math.max(0,this.warning-dt);this.stun=Math.max(0,this.stun-dt);
  const guarding=this.guard>0,gap=Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y);
  const approaching=!input.hidden&&gap<260&&clearContact(this.position,input.player,input.solids);
  this.guard=approaching?0:Math.max(0,this.guard-dt);if(guarding&&this.guard===0){this.route=[];this.routeClock=0;}
  this.seen=false;
  if(this.warning<=0&&this.stun<=0){this.clueClock=Math.max(0,this.clueClock-dt);this.seen=this.sightLock.tick(dt,approaching,gap);if(this.seen){this.target={x:input.player.x,y:input.player.y};this.clueClock=2.5;this.routeClock=Math.min(this.routeClock,.2);}}
  this.distractionResponse.tick(dt,'patroller',input.distraction,this.seen,this.position,{...input.sound,audible:!!input.distraction&&clearContact(this.position,input.distraction,input.solids),deaf:this.stun>0||this.warning>0});
  if(this.distractionResponse.changed)this.routeClock=0;
  if(input.patrolGoals?.length&&this.guard<=0&&this.warning<=0&&this.stun<=0&&!this.attackRecovery.active&&this.distractionResponse.hesitation<=0&&!this.distractionResponse.target){
   this.patrolIntent=this.exitPatrol.tick(dt,{position:this.position,seen:this.seen,clue:this.target??undefined,points:input.patrolGoals,blocked:this.routeFailed});this.routeFailed=false;
   if(this.exitPatrol.changed){this.routeClock=0;this.resetSearch();}
  }
 }
 tick(dt:number,input:ReinforcementInput){
  if(dt<=0||!this.position)return false;
  if(!this.prepared)this.prepare(dt,input);this.prepared=false;
  if(input.retreat&&this.entry&&!input.visible(this.position)){this.position=null;return false;}
  const seen=this.seen,distraction=this.distractionResponse.target;
  const blocked=this.warning>0?'warning':this.stun>0?'stunned':this.attackRecovery.active?'recovery':this.distractionResponse.hesitation>0?'hesitation':undefined;
  if(blocked){if(this.diagnosticsEnabled)this.diagnostics={mode:blocked,reason:blocked==='recovery'?'landed-hit':blocked==='hesitation'?'accepted-noise':'interrupted',seen,blocked:false,target:this.target?{x:this.target.x,y:this.target.y}:undefined};return false;}

  let goal=input.retreat?this.entry:distraction??(this.guard>0?this.entry:input.doorTarget??(this.patrolIntent??(this.clueClock>0?this.target:input.goal??this.entry)));
  if(!goal)return false;
  const searching=!input.retreat&&this.guard<=0&&!input.doorTarget&&!distraction&&!seen&&(input.patrolGoals?.length?this.exitPatrol.mode==='local-search'||input.patrolGoals.length===1&&Math.hypot(this.position.x-goal.x,this.position.y-goal.y)<30:this.clueClock<=0);
  if(!searching){if(this.searchAnchor)this.routeClock=0;this.resetSearch();}
  else{
   if(!this.checkpoint||Math.hypot(goal.x-this.checkpoint.x,goal.y-this.checkpoint.y)>24){this.resetSearch();this.checkpoint={...goal};this.routeClock=0;}
   if(this.idle>=1.2)this.nextSearchGoal(input.solids,input.bounds);
   goal=this.searchGoal??goal;
  }
  if(this.diagnosticsEnabled){const mode=input.retreat?"returning":distraction?"distraction":this.guard>0?"guard":input.doorTarget?"door":input.patrolGoals?.length?this.exitPatrol.mode:this.clueClock>0?"chase":searching?"search":"intercept";this.diagnostics={mode,reason:mode==="chase"?(seen?"sight":"remembered-clue"):mode,target:{x:goal.x,y:goal.y},seen,blocked:false};}
  this.routeClock-=dt;if(this.routeClock<=0){this.route=patrolPath(this.position,goal,input.solids,input.bounds,monsterFeetAt);this.routeClock=.6;if(input.patrolGoals?.length){const end=this.route.at(-1);this.routeFailed=!end||Math.hypot(end.x-goal.x,end.y-goal.y)>32;}}
  const before=this.position,movement=followPatrolPath(before,this.route,(input.speed??107)*(this.sightLock.searching?.65:1)*dt,input.solids);this.position=movement.position;if(this.diagnosticsEnabled)this.diagnostics.blocked=movement.blocked;
  const traveled=Math.hypot(this.position.x-before.x,this.position.y-before.y);
  if(searching&&this.idlePosition&&Math.hypot(this.position.x-this.idlePosition.x,this.position.y-this.idlePosition.y)<8)this.idle+=dt;
  else{this.idle=0;this.idlePosition={...this.position};}
  this.stride+=traveled;this.angle=Math.atan2(this.position.y-before.y,this.position.x-before.x);if(movement.blocked)this.routeClock=0;
  return !input.retreat&&!input.hidden&&Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y)<26&&clearContact(this.position,input.player,input.solids);
 }
}
