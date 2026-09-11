/** Reacquisition needs sustained sight after a corner; close contact remains dangerous. */
export const patrollerSightBreak=.35;
export class SightLock {
 readonly breakSeconds:number;
 constructor(breakSeconds=.75){this.breakSeconds=breakSeconds;}
 unseen=0;exposure=0;
 reset(){this.unseen=0;this.exposure=0;}
 get searching(){return this.unseen>=this.breakSeconds;}
 tick(dt:number,visible:boolean,distance:number){
  if(!visible){this.unseen+=dt;this.exposure=0;return false;}
  this.exposure+=dt;
  if(this.searching&&distance>35&&this.exposure<.9)return false;
  this.unseen=0;return true;
 }
}
