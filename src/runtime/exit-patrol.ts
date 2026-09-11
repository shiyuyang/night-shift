import type {Position} from '../collision.ts';
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(p:Position)=>({x:p.x,y:p.y});
/** Exit duty only consumes a real sight clue and public map waypoints. */
export class ExitPatrol {
 mode:'patrol'|'chase'|'clue-search'|'local-search'|'exit-return'='patrol';
 target:Position|undefined;index=0;travel=0;search=0;changed=false;private clue:Position|undefined;
 tick(dt:number,input:{position:Position;seen:boolean;clue?:Position;points:Position[];blocked?:boolean}){
  this.changed=false;if(dt<=0||!input.points.length)return this.target;
  const previous=this.target,mode=this.mode;
  if(input.seen&&input.clue){this.clue=point(input.clue);this.target=this.clue;this.mode='chase';this.travel=4;this.search=3;}
  else if(this.clue&&(this.mode==='chase'||this.mode==='clue-search'||this.mode==='local-search')){
   if(this.mode==='chase')this.mode='clue-search';
   if(this.mode==='clue-search'){
    this.travel=Math.max(0,this.travel-dt);this.target=this.clue;
    if(distance(input.position,this.clue)<32||this.travel===0||input.blocked){this.mode='local-search';this.target=point(input.position);}
   }else{
    this.search=Math.max(0,this.search-dt);
    if(this.search===0){this.clue=undefined;this.mode='exit-return';this.index=input.points.reduce((best,p,i)=>distance(input.position,p)<distance(input.position,input.points[best])?i:best,0);this.target=point(input.points[this.index]);}
   }
  }else{
   this.index%=input.points.length;const goal=input.points[this.index];
   if(distance(input.position,goal)<28||input.blocked){this.index=(this.index+1)%input.points.length;this.mode='patrol';}
   this.target=point(input.points[this.index]);
  }
  this.changed=mode!==this.mode||!!previous!==!!this.target||!!previous&&!!this.target&&distance(previous,this.target)>1;
  return this.target;
 }
}
