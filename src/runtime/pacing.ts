import tuning from '../../game/pacing.json' with {type:'json'};
export {tuning};
export function encounterProfile(round:number,fuses:number){const stage=Math.max(0,Math.min(3,fuses));return {speed:stage===3?(round===1?111:117):Math.min(tuning.sprintSpeed-8,tuning.monsterBaseSpeed+stage*tuning.speedPerFuse+Math.min(8,Math.max(0,round-1)*2)),duration:tuning.encounterDuration+stage*tuning.durationPerFuse,rest:stage===3?8:Math.max(12,tuning.recoveryInterval-stage*4)};}
export class Stamina {
 value=100;exhausted=false;private recoveryDelay=0;
 get canSprint(){return !this.exhausted&&this.value>0;}
 tick(dt:number,sprinting:boolean){if(dt<=0)return;if(sprinting){this.value=Math.max(0,this.value-dt*tuning.staminaDrain);this.recoveryDelay=tuning.staminaRecoveryDelay;if(this.value===0)this.exhausted=true;}else{const recovery=Math.max(0,dt-this.recoveryDelay);this.recoveryDelay=Math.max(0,this.recoveryDelay-dt);this.value=Math.min(100,this.value+recovery*tuning.staminaRecovery);if(this.value>=30)this.exhausted=false;}}
 reset(){this.value=100;this.exhausted=false;this.recoveryDelay=0;}
}
