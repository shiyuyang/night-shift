/** Only a successful damaging strike starts recovery; shared contact immunity is separate. */
export class AttackRecovery {
 remaining=0;
 get active(){return this.remaining>0;}
 hit(){this.remaining=Math.max(this.remaining,.7);}
 tick(dt:number){if(dt>0)this.remaining=Math.max(0,this.remaining-dt);}
}
