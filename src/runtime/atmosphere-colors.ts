import type {Lamp} from '../light-renderer';

// Internal palette IDs only; these names are never displayed to players.
export const atmospherePalettes = [
 {id:'grey-green',ambient:'#536b63',flashlight:'#c4d5c6'},
 {id:'cold-white',ambient:'#596c75',flashlight:'#d0dde0'},
] as const;

/** Infrequent, simulation-time colour drift. Brightness, reach and gameplay stay intact. */
export class AtmosphereColors {
 amount=0;
 private age=0;
 private wait:number;
 private index=-1;
 private random:()=>number;
 constructor(random:()=>number=Math.random){this.random=random;this.wait=this.random()<.6?60+this.random()*40:Infinity;}
 get snapshot(){return {palette:this.index<0?null:atmospherePalettes[this.index].id,amount:this.amount,wait:this.wait};}
 tick(dt:number,allowed:boolean){
  if(dt<=0)return;
  if(!allowed){
   this.amount=Math.max(0,this.amount-dt/4);this.age=0;
   this.wait=Math.max(this.wait,35);
   return;
  }
  if(this.age===0){
   this.amount=Math.max(0,this.amount-dt/4);
   this.wait-=dt;
   if(this.wait>0)return;
   // One opportunity per run; interruption also consumes the event.
   this.index=Math.floor(this.random()*atmospherePalettes.length);
   this.wait=Infinity;
  }
  this.age+=dt;
  this.amount=this.age<3?this.age/3:this.age<=10?1:Math.max(0,(14-this.age)/4);
  if(this.age>=14){this.age=0;this.amount=0;this.wait=Infinity;}
 }
 light(lamp:Lamp):Lamp{
  if(this.amount===0||this.index<0)return lamp;
  const palette=atmospherePalettes[this.index];
  const from=parseInt(lamp.color.slice(1),16),to=parseInt((lamp.angle===undefined?palette.ambient:palette.flashlight).slice(1),16);
  const mix=this.amount*this.amount*(3-2*this.amount);
  let color=0;
  for(const shift of [16,8,0])color|=Math.round(((from>>shift)&255)*(1-mix)+((to>>shift)&255)*mix)<<shift;
  return {...lamp,color:'#'+color.toString(16).padStart(6,'0'),colorStrength:(lamp.colorStrength??.035)*(1-mix)+(lamp.angle===undefined?.22:.3)*mix};
 }
}
