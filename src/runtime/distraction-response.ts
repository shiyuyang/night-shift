import type {Position} from '../collision.ts';
import type {Threat} from '../run-rules.ts';
export type SoundReception={id?:string;remaining?:number;audible?:boolean;deaf?:boolean};
export const distractionRange=(threat:Threat)=>threat==='listener'?260:180;
/** Sound acceptance is latched per emission, rather than re-triggered by every frame. */
export class DistractionResponse {
 private accepted='';private handled=new Set<string>();private notice='';decisionChanged=false;private sourcePoint:Position|null=null;private remaining=0;private recovery=0;
 private anchor:Position|null=null;private point:Position|null=null;
 hesitation=0;returning=false;changed=false;heard=false;reason='no-source';target:Position|undefined;
 tick(dt:number,threat:Threat,source:Position|undefined,seen:boolean,position:Position,reception:SoundReception={}):Position|undefined{
  this.changed=false;this.heard=false;if(dt<=0)return this.target;
  this.hesitation=Math.max(0,this.hesitation-dt);this.remaining=Math.max(0,this.remaining-dt);this.recovery=Math.max(0,this.recovery-dt);
  const life=reception.remaining??8,key=source&&life>0?(reception.id??`${source.x},${source.y}`):'';
  const audible=!!source&&Math.hypot(source.x-position.x,source.y-position.y)<distractionRange(threat)&&(reception.audible??true);
  this.reason=!key?'no-source':reception.deaf?'deaf':!audible?'outside-hearing-range':'already-heard';
  if(key&&!this.handled.has(key)&&audible&&!reception.deaf&&(threat!=='patroller'||this.recovery===0)){
   this.handled.add(key);if(this.handled.size>128)this.handled.delete(this.handled.values().next().value!);this.accepted=key;this.sourcePoint={x:source!.x,y:source!.y};this.heard=true;this.reason='heard';
   this.remaining=Math.min(2,life);
   if(threat==='light-shy'||threat==='patroller'&&seen)this.hesitation=.65;
   if(threat==='patroller'){
    if(seen){this.recovery=6;this.point=null;this.anchor=null;this.returning=false;}
    else{this.anchor={x:position.x,y:position.y};const dx=source!.x-position.x,dy=source!.y-position.y,scale=Math.min(1,120/Math.max(1,Math.hypot(dx,dy)));this.point={x:position.x+dx*scale,y:position.y+dy*scale};this.returning=false;}
   }
  }
  if(threat==='listener'&&key&&this.handled.has(key)&&key!==this.accepted){this.accepted=key;this.sourcePoint={x:source!.x,y:source!.y};}
  const live=!!key&&key===this.accepted;if(live&&!this.heard)this.reason='latched-source';
  let next:Position|undefined;
  if(threat==='listener')next=live?this.sourcePoint??undefined:undefined;
  else if(threat==='light-shy')next=live&&!seen&&this.remaining>0?this.sourcePoint??undefined:undefined;
  else{
   if(seen&&(this.point||this.returning)){this.point=null;this.anchor=null;this.returning=false;this.recovery=6;}
   if(this.point&&(!live||this.remaining===0)){this.point=null;this.returning=true;this.recovery=6;}
   if(this.returning){if(this.anchor&&Math.hypot(position.x-this.anchor.x,position.y-this.anchor.y)>24)next=this.anchor;else{this.returning=false;this.anchor=null;}}
   else next=this.point??undefined;
  }
  if(!key){if(!reception.id)this.handled.delete(this.accepted);this.accepted='';}
  const notice=`${key}:${this.reason}`;this.decisionChanged=notice!==this.notice;this.notice=notice;
  this.changed=!!next!==!!this.target||!!next&&!!this.target&&Math.hypot(next.x-this.target.x,next.y-this.target.y)>.01;
  this.target=next;return next;
 }
}
