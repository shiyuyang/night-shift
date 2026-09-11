import {feetAt,clearContact,type Position,type Box} from '../collision.ts';
import {patrolPath,followPatrolPath} from '../patrol.ts';
import {shadeLanding} from './gift-placement.ts';
export const shadeRules={spawnDistance:72,teleportDistance:68,leashDistance:150,speed:48,flickerSeconds:.65,teleportInterval:2.5} as const;
export class GiftShade {
 position:Position|null=null;route:Position[]=[];routeClock=0;teleportWait=0;tear=0;age=0;contactWait=0;teleports=0;
 reset(){this.position=null;this.route=[];this.routeClock=0;this.teleportWait=0;this.tear=0;this.age=0;this.contactWait=0;this.teleports=0;}
 spawn(player:Position,angle:number,solids:Box[],bounds:Box,desired:number=shadeRules.spawnDistance){this.position=shadeLanding(player,solids,bounds,desired,angle);this.tear=shadeRules.flickerSeconds;this.teleportWait=shadeRules.teleportInterval;this.routeClock=0;}
 tick(dt:number,player:Position,angle:number,solids:Box[],bounds:Box){
  if(dt<=0||!this.position)return false;
  this.age+=dt;this.tear=Math.max(0,this.tear-dt);this.teleportWait=Math.max(0,this.teleportWait-dt);this.contactWait=Math.max(0,this.contactWait-dt);
  if(Math.hypot(player.x-this.position.x,player.y-this.position.y)>shadeRules.leashDistance&&this.teleportWait<=0){this.spawn(player,angle,solids,bounds,shadeRules.teleportDistance);this.teleports++;}
  this.routeClock-=dt;
  if(this.tear<=0){if(this.routeClock<=0){this.route=patrolPath(this.position,player,solids,bounds,feetAt);this.routeClock=.8;}
   this.position=followPatrolPath(this.position,this.route,shadeRules.speed*dt,solids,feetAt).position;
  }
  if(this.tear<=0&&this.contactWait<=0&&Math.hypot(player.x-this.position.x,player.y-this.position.y)<22&&clearContact(this.position,player,solids)){this.contactWait=2;return true;}
  return false;
 }
}
