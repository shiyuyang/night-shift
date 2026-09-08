import {overlaps,type Box} from '../collision.ts';
/** One-shot obstacle. Collision is reserved only after a warning and an empty sweep. */
export class MorgueDrawer {
 phase:'idle'|'warning'|'extending'|'open'|'cancelled'='idle';
 elapsed=0;progress=0;
 readonly area?:Box;
 constructor(area?:Box){this.area=area;}
 get solids():Box[]{return this.area&&(this.phase==='extending'||this.phase==='open')?[this.area]:[];}
 tick(dt:number,opened:number,near:boolean,bodies:Box[]):'warning'|'slide'|undefined{
  if(!this.area||dt<=0)return;
  if(this.phase==='idle'&&opened===3&&near){this.phase='warning';this.elapsed=0;return 'warning';}
  if(this.phase==='warning'){
   this.elapsed+=dt;
   const sweep={x:this.area.x-8,y:this.area.y-8,width:this.area.width+16,height:this.area.height+16};
   if(this.elapsed>=3&&!bodies.some(b=>overlaps(b,sweep))){this.phase='extending';this.elapsed=0;return 'slide';}
  }else if(this.phase==='extending'){
   this.elapsed+=dt;this.progress=Math.min(1,this.elapsed/1.5);if(this.progress===1)this.phase='open';
  }
 }
}
