import {monsterFeetAt,overlaps,type Box,type Position} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
export function routeLength(from:Position,route:Position[]){let n=0,p=from;for(const q of route){n+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return n;}
/** Entry selection uses walking distance, never a straight-line shortcut through walls. */
export function choosePursuitEntry(entries:Position[],player:Position,solids:Box[],bounds:Box,speed:number,visible:(p:Position)=>boolean){
 const candidates=entries.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)>=180&&!visible(p)&&!solids.some(b=>overlaps(monsterFeetAt(p.x,p.y),b))).map(p=>{
  const route=patrolPath(p,player,solids,bounds,monsterFeetAt);return {position:p,route,seconds:routeLength(p,route)/speed};
 }).filter(p=>p.route.length&&p.route.at(-1)&&Math.hypot(p.route.at(-1)!.x-player.x,p.route.at(-1)!.y-player.y)<35);
 return candidates.sort((a,b)=>Math.abs(a.seconds-5.5)-Math.abs(b.seconds-5.5))[0];
}
/** Search destinations derive from the last sensed position, not the hidden player's position. */
export class PursuitSearch {
 points:Position[]=[];index=0;remaining=0;private anchor?:Position;
 reset(){this.points=[];this.index=0;this.remaining=0;this.anchor=undefined;}
 begin(last:Position,from:Position,solids:Box[],bounds:Box){
  this.anchor={...last};this.remaining=12;this.index=0;
  const heading=Math.atan2(last.y-from.y,last.x-from.x);
  const approach=patrolPath(from,last,solids,bounds,monsterFeetAt).at(-1)??from;
  this.points=[{...approach}];last=approach;
  for(const turn of [0,Math.PI/2,-Math.PI/2,Math.PI]){
   const a=heading+turn,target={x:last.x+Math.cos(a)*112,y:last.y+Math.sin(a)*112};
   if(target.x<bounds.x||target.x>bounds.x+bounds.width||target.y<bounds.y||target.y>bounds.y+bounds.height)continue;
   const route=patrolPath(last,target,solids,bounds,monsterFeetAt),end=route.at(-1);
   if(end&&Math.hypot(end.x-last.x,end.y-last.y)>40&&!this.points.some(p=>Math.hypot(p.x-end.x,p.y-end.y)<30))this.points.push({...end});
  }
 }
 tick(dt:number,position:Position,last:Position,solids:Box[],bounds:Box):Position{
  if(!this.anchor||Math.hypot(last.x-this.anchor.x,last.y-this.anchor.y)>24)this.begin(last,position,solids,bounds);
  // Travel to a remembered clue does not consume the room-search budget.
  if(this.index>0||Math.hypot(position.x-this.points[0].x,position.y-this.points[0].y)<32)this.remaining=Math.max(0,this.remaining-Math.max(0,dt));
  if(Math.hypot(position.x-this.points[this.index].x,position.y-this.points[this.index].y)<24)this.index=Math.min(this.points.length-1,this.index+1);
  return this.points[this.index];
 }
}
