import {monsterFeetAt,type Box,type Position} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
/** Visits authored objectives in turn; never takes the player's live position. */
export class PatrolCircuit {
 target?:Position;index=0;elapsed=0;private signature='';
 reset(){this.target=undefined;this.index=0;this.elapsed=0;this.signature='';}
 tick(dt:number,position:Position,points:Position[],solids:Box[],bounds:Box){
  const signature=points.map(p=>`${p.x},${p.y}`).join(';');
  if(signature!==this.signature){this.reset();this.signature=signature;}
  if(dt<=0)return this.target??position;
  this.elapsed+=dt;
  if(this.target&&Math.hypot(position.x-this.target.x,position.y-this.target.y)>28&&this.elapsed<16)return this.target;
  this.target=undefined;this.elapsed=0;
  for(let i=0;i<points.length;i++){
   const point=points[this.index++%points.length],route=patrolPath(position,point,solids,bounds,monsterFeetAt),end=route.at(-1);
   if(end&&Math.hypot(end.x-point.x,end.y-point.y)<64&&Math.hypot(end.x-position.x,end.y-position.y)>35){this.target={...end};break;}
  }
  return this.target??position;
 }
}
