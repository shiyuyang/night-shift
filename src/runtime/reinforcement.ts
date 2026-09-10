import {SightLock} from './sight-lock.ts';
import {DistractionResponse} from './distraction-response.ts';
import {monsterFeetAt,clearContact,moveWithCollision,type Box,type Position} from '../collision.ts';
import {patrolPath,followPatrolPath} from '../patrol.ts';
/** Physical patrol shared by resident and exit-side enemies. */
export class Reinforcement {
 position:Position|null=null;entry:Position|null=null;target:Position|null=null;route:Position[]=[];
 distractionResponse=new DistractionResponse();sightLock=new SightLock();
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
 spawn(position:Position,target:Position,guardSeconds=0){this.sightLock.reset();this.resetSearch();this.used=true;this.entry={...position};this.position={...position};this.target={...target};this.warning=0;this.clueClock=4;this.routeClock=0;this.guard=guardSeconds;}
 flash(player:Position,solids:Box[]){
  if(!this.position||this.warning>0||Math.hypot(player.x-this.position.x,player.y-this.position.y)>=190||!clearContact(player,this.position,solids))return false;
  this.stun=2;const a=Math.atan2(this.position.y-player.y,this.position.x-player.x);
  this.position=moveWithCollision(this.position,Math.cos(a)*65,Math.sin(a)*65,solids,monsterFeetAt);this.route=[];this.routeClock=0;return true;
 }
 tick(dt:number,input:{player:Position;hidden:boolean;distraction?:Position;doorTarget?:Position;goal?:Position;speed?:number;retreat:boolean;visible:(p:Position)=>boolean;solids:Box[];bounds:Box}){
  if(dt<=0||!this.position)return false;
  this.warning=Math.max(0,this.warning-dt);this.stun=Math.max(0,this.stun-dt);
  const guarding=this.guard>0;
  const approaching=!input.hidden&&Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y)<260&&clearContact(this.position,input.player,input.solids);
  this.guard=approaching?0:Math.max(0,this.guard-dt);
  if(guarding&&this.guard===0){this.route=[];this.routeClock=0;}
  if(input.retreat&&this.entry&&!input.visible(this.position)){this.position=null;return false;}
  if(this.warning>0||this.stun>0)return false;
  this.clueClock=Math.max(0,this.clueClock-dt);
  const seen=this.sightLock.tick(dt,approaching,Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y));
  if(seen){this.target={...input.player};this.clueClock=2.5;this.routeClock=Math.min(this.routeClock,.2);}
  const distraction=this.distractionResponse.tick(dt,'patroller',input.distraction,seen,this.position);if(this.distractionResponse.changed)this.routeClock=0;if(this.distractionResponse.hesitation>0)return false;

  let goal=input.retreat?this.entry:distraction??(this.guard>0?this.entry:input.doorTarget??(this.clueClock>0?this.target:input.goal??this.entry));
  if(!goal)return false;
  const searching=!input.retreat&&this.guard<=0&&!input.doorTarget&&!distraction&&!seen&&this.clueClock<=0;
  if(!searching){if(this.searchAnchor)this.routeClock=0;this.resetSearch();}
  else{
   if(!this.checkpoint||Math.hypot(goal.x-this.checkpoint.x,goal.y-this.checkpoint.y)>24){this.resetSearch();this.checkpoint={...goal};this.routeClock=0;}
   if(this.idle>=1.2)this.nextSearchGoal(input.solids,input.bounds);
   goal=this.searchGoal??goal;
  }
  this.routeClock-=dt;if(this.routeClock<=0){this.route=patrolPath(this.position,goal,input.solids,input.bounds,monsterFeetAt);this.routeClock=.6;}
  const before=this.position,movement=followPatrolPath(before,this.route,(input.speed??107)*(this.sightLock.searching?.65:1)*dt,input.solids);this.position=movement.position;
  const traveled=Math.hypot(this.position.x-before.x,this.position.y-before.y);
  if(searching&&this.idlePosition&&Math.hypot(this.position.x-this.idlePosition.x,this.position.y-this.idlePosition.y)<8)this.idle+=dt;
  else{this.idle=0;this.idlePosition={...this.position};}
  this.stride+=traveled;this.angle=Math.atan2(this.position.y-before.y,this.position.x-before.x);if(movement.blocked)this.routeClock=0;
  return !input.retreat&&!input.hidden&&Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y)<26&&clearContact(this.position,input.player,input.solids);
 }
}
