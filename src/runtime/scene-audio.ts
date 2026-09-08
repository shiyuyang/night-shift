import type {Level} from '../levels.ts';
import type {Position} from '../collision.ts';
/** Concrete room foley: once per search beat, placed at an actual furnishing. */
const beds=[['ward-bed-call','bed'],['ward-curtain','bed'],['ward-bedframe','bed']];
const themes=[beds,[['warehouse-cold-unit','machine'],['warehouse-vials','rack'],['warehouse-rack','rack']],[['plant-coastdown','engine'],['plant-pipe-knock','engine'],['plant-breaker-arc','machine']],[['outpatient-wheel','seating'],['outpatient-speaker','desk']],[['surgery-suction','operatingtable'],['surgery-tray','operatingtable']],[['morgue-knock','coldcabinet']],[['garden-wind','tree'],['garden-chime','tree']]];
export class SceneAudio {
 private fired=new Set<number>();private wait=5;
 tick(dt:number,level:Level,player:Position,fuses:number,critical:boolean){
  this.wait=Math.max(0,this.wait-dt);if(dt<=0||critical||this.wait>0||fuses===3)return;
  const entries=themes[level.theme]??[];
  for(let i=0;i<entries.length;i++){
   if(this.fired.has(i)||fuses<i)continue;
   const [id,kind]=entries[i],props=level.props.filter(p=>p.kind===kind).map(p=>({x:p.x+p.width/2,y:p.y+p.height/2}));
   const source=props.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
   if(!source||Math.hypot(source.x-player.x,source.y-player.y)>280)continue;
   this.fired.add(i);this.wait=12;return {id,source};
  }
 }
}
