/** Reacquisition needs sustained sight after a corner; close contact remains dangerous. */
export class SightLock {
 unseen=0;exposure=0;
 reset(){this.unseen=0;this.exposure=0;}
 tick(dt:number,visible:boolean,distance:number){
  if(!visible){this.unseen+=dt;this.exposure=0;return false;}
  this.exposure+=dt;
  if(this.unseen>=2&&distance>70&&this.exposure<.6)return false;
  this.unseen=0;return true;
 }
}
