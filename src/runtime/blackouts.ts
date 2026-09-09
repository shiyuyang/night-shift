import {difficultyForNight} from './difficulty.ts';
/** Shared blackout timing; all clocks advance only with active gameplay. */
export class Blackouts {
 remaining=0;cooldown=0;warning=0;wait=Infinity;armed=false;count=0;
 private random:()=>number;
 constructor(random:()=>number=Math.random){this.random=random;}
 reset(){this.remaining=0;this.cooldown=0;this.warning=0;this.wait=Infinity;this.armed=false;this.count=0;}
 start(seconds=5,finale=false){
  if(!finale&&(this.remaining>0||this.cooldown>0))return false;
  this.remaining=Math.max(this.remaining,seconds);this.cooldown=this.remaining+15;this.warning=0;this.wait=Infinity;this.count++;return true;
 }
 tick(dt:number,fuses:number,round:number,power:boolean,blocked:boolean):'warning'|'outage'|undefined{
  this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(!difficultyForNight(round).blackouts)return;
  if(fuses>=3){this.warning=0;return;}
  if(fuses>0&&!this.armed){this.armed=true;this.wait=3+this.random()*2;}
  if(!this.armed||this.remaining>0||round===1&&this.count>0)return;
  if(blocked){if(this.warning>0){this.warning=0;this.wait=2;}return;}
  if(this.wait===Infinity)this.wait=(power?20:25)+this.random()*10;
  if(this.warning>0){this.warning=Math.max(0,this.warning-dt);if(this.warning===0){this.start(round===1?4:5);return 'outage';}return;}
  this.wait-=dt;
  if(this.cooldown>0)return;
  if(this.wait<=0){this.warning=1.2;return 'warning';}
 }
}
