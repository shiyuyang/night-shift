export type ItemBinding='F'|'R'|'Q';
/** Feedback uses simulation time, so pause, tutorials and restart remain consistent. */
export class Feedback {
 heal=0;healAmount=0;damage=0;hitSide:'left'|'right'='left';staminaNotice=0;exitReady=0;
 receipt:{item?:ItemBinding;text:string;x:number;y:number;remaining:number}|null=null;
 received:Record<ItemBinding,number>={F:0,R:0,Q:0};
 obtain(key:ItemBinding){this.received[key]=2.5;}
 notice(text:string,x:number,y:number,item?:ItemBinding){this.receipt={text,x,y,item,remaining:4};}
 used:Record<ItemBinding,number>={F:0,R:0,Q:0};
 tick(dt:number){if(this.receipt){this.receipt.remaining=Math.max(0,this.receipt.remaining-dt);if(!this.receipt.remaining)this.receipt=null;}for(const key of ['F','R','Q'] as const)this.received[key]=Math.max(0,this.received[key]-dt);for(const key of ['heal','damage','staminaNotice','exitReady'] as const)this[key]=Math.max(0,this[key]-dt);for(const key of ['F','R','Q'] as const)this.used[key]=Math.max(0,this.used[key]-dt);}
 healed(before:number,after:number){this.healAmount=Math.max(0,Math.round(after-before));if(this.healAmount>0){this.heal=1.4;this.use('Q');}}
 hurt(side:'left'|'right'){this.damage=.55;this.hitSide=side;}
 use(key:ItemBinding){this.used[key]=.35;}
 reset(){this.receipt=null;this.received={F:0,R:0,Q:0};this.heal=0;this.healAmount=0;this.damage=0;this.staminaNotice=0;this.exitReady=0;this.used={F:0,R:0,Q:0};}
 get view(){return {receipt:this.receipt?{...this.receipt}:null,received:{...this.received},heal:this.heal,healAmount:this.healAmount,damage:this.damage,hitSide:this.hitSide,staminaNotice:this.staminaNotice,exitReady:this.exitReady,used:{...this.used}};}
}
