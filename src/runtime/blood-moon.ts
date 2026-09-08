import type {Lamp} from '../light-renderer';
/** Run-local transition, driven by simulation time so pausing freezes the fade. */
export class BloodMoon {
 amount=0;target=0;private time=0;
 tick(dt:number){if(this.target>0)this.time+=Math.max(0,dt);const step=Math.max(0,dt)/3;this.amount+=Math.sign(this.target-this.amount)*Math.min(Math.abs(this.target-this.amount),step);}
 reset(){this.amount=0;this.target=0;this.time=0;}
 light(lamp:Lamp):Lamp{
  if(this.amount===0)return lamp;
  const from=parseInt(lamp.color.slice(1),16),to=lamp.angle===undefined?0x50030b:0x780207;
  let color=0;for(const shift of [16,8,0])color|=Math.round(((from>>shift)&255)*(1-this.amount)+((to>>shift)&255)*this.amount)<<shift;
  const phase=(this.time+(lamp.angle===undefined?(lamp.x%7)*.13:0))%43;
  let dip=0;for(const [at,duration] of [[7,.7],[19,1.1],[34,.5]])if(phase>at&&phase<at+duration)dip=Math.max(dip,Math.sin((phase-at)/duration*Math.PI));
  const loss=lamp.radius>500?.8:lamp.angle===undefined?.32:.24;
  return {...lamp,strength:lamp.strength*(1-this.amount*(loss+dip*(lamp.angle===undefined?.35:.2))),color:'#'+color.toString(16).padStart(6,'0'),colorStrength:(lamp.colorStrength??.035)*(1-this.amount)+(lamp.radius>500?.025:lamp.angle===undefined?.27:.62)*this.amount};
 }
}
