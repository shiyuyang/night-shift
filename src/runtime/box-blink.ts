import {monsterFeetAt,overlaps,type Box,type Position} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
import {choosePursuitEntry} from './pursuit.ts';
const length=(from:Position,path:Position[])=>{let n=0,p=from;for(const q of path){n+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return n;};
export interface BlinkWorld {player:Position;enemy:Position;exit:Position;angle:number;solids:Box[];bounds:Box;speed:number;visible:(p:Position)=>boolean;forbidden:Box[];blocked:boolean;}
export class BoxBlink {
 used=false;warning=0;landing:Position|null=null;
 request(w:BlinkWorld){
  if(this.used)return false;this.used=true;
  if(w.blocked||length(w.enemy,patrolPath(w.enemy,w.player,w.solids,w.bounds,monsterFeetAt))/w.speed<=6)return false;
  const candidates:Position[]=[];
  for(const radius of [280,360,440])for(const turn of [Math.PI,-Math.PI/2,Math.PI/2]){
   const angle=w.angle+turn,p={x:Math.round(w.player.x+Math.cos(angle)*radius),y:Math.round(w.player.y+Math.sin(angle)*radius)};
   if(p.x<w.bounds.x||p.x>w.bounds.x+w.bounds.width||p.y<w.bounds.y||p.y>w.bounds.y+w.bounds.height||Math.hypot(p.x-w.exit.x,p.y-w.exit.y)<180||w.forbidden.some(b=>overlaps(monsterFeetAt(p.x,p.y),b)))continue;
   candidates.push(p);
  }
  const entry=choosePursuitEntry(candidates,w.player,w.solids,w.bounds,w.speed,w.visible);
  if(!entry||entry.seconds<2.5||entry.seconds>4.5)return false;
  this.landing={...entry.position};this.warning=.8;return true;
 }
 tick(dt:number,w:BlinkWorld){
  if(dt<=0||!this.landing)return null;
  if(w.blocked){this.warning=0;this.landing=null;return null;}
  this.warning=Math.max(0,this.warning-dt);if(this.warning>0)return null;
  const p=this.landing;this.landing=null;
  if(w.forbidden.some(b=>overlaps(monsterFeetAt(p.x,p.y),b))||w.visible(p)||Math.hypot(p.x-w.player.x,p.y-w.player.y)<220||w.solids.some(b=>overlaps(monsterFeetAt(p.x,p.y),b)))return null;
  const path=patrolPath(p,w.player,w.solids,w.bounds,monsterFeetAt),end=path.at(-1);
  return end&&Math.hypot(end.x-w.player.x,end.y-w.player.y)<35?p:null;
 }
}
