export const lightFearEscapeSeconds=2.5;
/** A brief light hit grants an escape window; fresh hits cannot extend it during cooldown. */
export class LightFear {
 lit=false;flinch=0;cooldown=0;recovery=0;private releasePending=false;
 get suppressed(){return this.recovery>0;}
 get loweringArms(){return this.recovery>0&&this.recovery<=.35;}
 reset(){this.lit=false;this.flinch=0;this.cooldown=0;this.recovery=0;this.releasePending=false;}
 tick(dt:number,lit:boolean){
  if(dt<=0)return this.speed();
  this.flinch=Math.max(0,this.flinch-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.recovery=Math.max(0,this.recovery-dt);
  if(lit&&!this.lit&&this.cooldown===0){this.flinch=.65;this.recovery=.65+lightFearEscapeSeconds;this.cooldown=6;this.releasePending=true;}
  if(!lit&&this.lit&&this.releasePending){this.recovery=Math.max(this.recovery,lightFearEscapeSeconds);this.cooldown=Math.max(this.cooldown,4);this.releasePending=false;}
  this.lit=lit;return this.speed();
 }
 private speed(){return this.flinch>0?-.65:this.suppressed?0:this.lit?.28:1;}
}
