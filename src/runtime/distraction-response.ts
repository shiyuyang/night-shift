import type {Position} from '../collision.ts';
import type {Threat} from '../run-rules.ts';
/** A patrol investigates one sound briefly, then returns before accepting another. */
export class DistractionResponse {
 private active=false;private remaining=0;private recovery=0;private anchor:Position|null=null;private point:Position|null=null;
 returning=false;changed=false;private following=false;
 tick(dt:number,threat:Threat,source:Position|undefined,seen:boolean,position:Position):Position|undefined{
  this.changed=false;if(dt<=0)return this.returning?this.anchor??undefined:this.point??undefined;
  if(threat==='listener')return source;
  if(threat==='light-shy'){const following=!seen&&!!source;this.changed=following!==this.following;this.following=following;return following?source:undefined;}
  this.recovery=Math.max(0,this.recovery-dt);
  if(!source)this.active=false;
  if(this.returning){if(this.anchor&&Math.hypot(position.x-this.anchor.x,position.y-this.anchor.y)>24)return this.anchor;this.returning=false;this.anchor=null;this.changed=true;}
  if(this.point){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining>0)return this.point;this.point=null;this.returning=true;this.recovery=6;this.changed=true;return this.anchor??undefined;}
  if(source&&!this.active){this.active=true;if(this.recovery===0&&Math.hypot(source.x-position.x,source.y-position.y)<=180){this.anchor={...position};const dx=source.x-position.x,dy=source.y-position.y,scale=Math.min(1,120/Math.max(1,Math.hypot(dx,dy)));this.point={x:position.x+dx*scale,y:position.y+dy*scale};this.remaining=2;this.changed=true;return this.point;}}
  return undefined;
 }
}
