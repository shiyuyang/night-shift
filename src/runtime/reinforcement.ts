import {monsterFeetAt,clearContact,moveWithCollision,type Box,type Position} from '../collision.ts';
import {patrolPath,followPatrolPath} from '../patrol.ts';
/** Physical patrol shared by resident and exit-side enemies. */
export class Reinforcement {
 position:Position|null=null;entry:Position|null=null;target:Position|null=null;route:Position[]=[];
 warning=0;stun=0;routeClock=0;clueClock=0;stride=0;angle=0;used=false;retry=0;guard=0;
 spawn(position:Position,target:Position,guardSeconds=0){this.used=true;this.entry={...position};this.position={...position};this.target={...target};this.warning=0;this.clueClock=4;this.routeClock=0;this.guard=guardSeconds;}
 flash(player:Position,solids:Box[]){
  if(!this.position||this.warning>0||Math.hypot(player.x-this.position.x,player.y-this.position.y)>=190||!clearContact(player,this.position,solids))return false;
  this.stun=4;const a=Math.atan2(this.position.y-player.y,this.position.x-player.x);
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
  this.clueClock-=dt;
  if(!input.goal&&this.clueClock<=0&&!input.hidden&&!input.distraction){this.target={...input.player};this.clueClock=4;this.routeClock=0;}
  const goal=input.retreat?this.entry:input.distraction??(this.guard>0?this.entry:input.doorTarget??(guarding&&approaching?input.player:input.goal??this.target));
  if(!goal)return false;
  this.routeClock-=dt;if(this.routeClock<=0){this.route=patrolPath(this.position,goal,input.solids,input.bounds,monsterFeetAt);this.routeClock=.6;}
  const before=this.position,movement=followPatrolPath(before,this.route,(input.speed??107)*dt,input.solids);this.position=movement.position;
  this.stride+=Math.hypot(this.position.x-before.x,this.position.y-before.y);this.angle=Math.atan2(this.position.y-before.y,this.position.x-before.x);if(movement.blocked)this.routeClock=0;
  return !input.retreat&&!input.hidden&&Math.hypot(this.position.x-input.player.x,this.position.y-input.player.y)<26&&clearContact(this.position,input.player,input.solids);
 }
}
