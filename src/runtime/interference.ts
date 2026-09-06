/** Negative gifts expire in simulation time and cannot stack while active. */
export class Interference {
 drain=0;alarm=0;
 start(kind:'drain'|'alarm'){if(this[kind]>0)return false;this[kind]=kind==='drain'?8:6;return true;}
 tick(dt:number){if(dt<=0)return 0;const loss=Math.min(dt,this.drain)*2;this.drain=Math.max(0,this.drain-dt);this.alarm=Math.max(0,this.alarm-dt);return loss;}
 reset(){this.drain=0;this.alarm=0;}
}
