import {monsterFeetAt,type Position,type Box} from '../collision.ts';
import {patrolPath} from '../patrol.ts';
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y);
const region=(p:Position)=>`${Math.floor(p.x/240)},${Math.floor(p.y/200)}`;
/** Coverage scheduling has no player position, perception or pursuit authority. */
export class DailyPatrol {
 elapsed=0;noContact=0;respite=0;target:Position|undefined;changed=false;reason='initial-coverage';
 private engaged=false;private correctedAt=-Infinity;private extraAssigned=false;private visited=new Map<string,number>();
 tick(dt:number,input:{position:Position;points:Position[];solids:Box[];bounds:Box;contact:boolean;engaged:boolean;busy:boolean;rest:boolean;blocked?:boolean}){
  this.changed=false;if(dt<=0)return this.target;
  this.elapsed+=dt;this.noContact=input.contact?0:this.noContact+dt;this.respite=Math.max(0,this.respite-dt);
  if(this.engaged&&!input.engaged)this.respite=10;this.engaged=input.engaged;
  if(input.contact)this.extraAssigned=false;
  const arrived=!!this.target&&distance(input.position,this.target)<50;
  if(arrived){this.visited.set(region(this.target!),this.elapsed);this.target=undefined;this.extraAssigned=false;}
  if(input.busy)return this.target;
  const correction=this.noContact>=(input.rest?20:15)&&this.respite===0&&!this.extraAssigned&&this.elapsed-this.correctedAt>=(input.rest?20:15);
  if(this.target&&!input.blocked&&!correction)return this.target;
  const candidates=input.points.flatMap(p=>{
   if(distance(p,input.position)<50)return [];
   const path=patrolPath(input.position,p,input.solids,input.bounds,monsterFeetAt),end=path.at(-1);
   if(!end||distance(end,p)>24)return [];
   let length=0,previous=input.position;for(const step of path){length+=distance(previous,step);previous=step;}
   const age=this.elapsed-(this.visited.get(region(p))??-60);
   return [{point:{x:end.x,y:end.y},score:age-length*.025}];
  }).sort((a,b)=>b.score-a.score||a.point.x-b.point.x||a.point.y-b.point.y);
  const next=(correction&&this.target?candidates.find(c=>distance(c.point,this.target!)>32):undefined)?.point??candidates[0]?.point;
  this.reason=input.blocked?'route-unreachable':correction?'no-contact-coverage':arrived?'region-visited':'initial-coverage';
  this.changed=!!next!==!!this.target||!!next&&!!this.target&&distance(next,this.target)>1;this.target=next;if(correction){this.correctedAt=this.elapsed;this.extraAssigned=true;}
  return this.target;
 }
}
