/** Light flinch has a cooldown so flicking the beam cannot repeatedly stun-lock. */
export class LightFear {
 lit=false;flinch=0;cooldown=0;
 reset(){this.lit=false;this.flinch=0;this.cooldown=0;}
 tick(dt:number,lit:boolean){
  this.flinch=Math.max(0,this.flinch-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(lit&&!this.lit&&this.cooldown===0){this.flinch=.22;this.cooldown=2.5;}
  if(!lit)this.flinch=0;this.lit=lit;
  return !lit?1:this.flinch>0?-.35:.28;
 }
}
