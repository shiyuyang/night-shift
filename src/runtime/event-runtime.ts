import sounds from '../../game/audio-sfx.json' with {type:'json'};
export type Action={type:'blood-moon';strength:number}|{type:'wait';seconds:number}|{type:'sound';id:string;pan:number;source?:string}|{type:'light';target:string;strength:number}|{type:'message';text:string};
export interface EventDefinition{id:string;trigger:{flag:string;zone:string};once:true;sequence:Action[]}
export interface EventState{flags:Record<string,boolean>;zones:Record<string,boolean>}
/** Small allowlisted DSL: never eval scripts or schedule wall-clock timers. */
export function parseEvents(value:unknown,lightTargets:readonly string[]=['crt']):EventDefinition[]{
 if(!Array.isArray(value))throw Error('Events must be an array');const ids=new Set<string>();
 for(const e of value){if(!e||typeof e.id!=='string'||ids.has(e.id)||e.once!==true||typeof e.trigger?.flag!=='string'||typeof e.trigger?.zone!=='string'||!Array.isArray(e.sequence)||e.sequence.length>32)throw Error('Invalid event header');ids.add(e.id);
 for(const a of e.sequence){const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;const valid=a&&((a.type==='blood-moon'&&finite(a.strength,0,1))||(a.type==='wait'&&finite(a.seconds,0,30))||(a.type==='sound'&&sounds.some(s=>s.id===a.id)&&finite(a.pan,-1,1)&&(a.source===undefined||lightTargets.includes(a.source)&&a.source!=='crt'))||(a.type==='light'&&lightTargets.includes(a.target)&&finite(a.strength,0,1))||(a.type==='message'&&typeof a.text==='string'&&a.text.length<=160));if(!valid)throw Error(`Invalid action in ${e.id}`);}}
 return value;
}
export class EventRuntime {
 private elapsed=0;private active:{event:EventDefinition;index:number;due:number}[]=[];private fired=new Set<string>();private finished=new Set<string>();
 private definitions:EventDefinition[];private emit:(action:Exclude<Action,{type:'wait'}>)=>void;
 constructor(definitions:EventDefinition[],emit:(action:Exclude<Action,{type:'wait'}>)=>void){this.definitions=definitions;this.emit=emit;}
 reset(){this.elapsed=0;this.active=[];this.fired.clear();this.finished.clear();}
 get triggered(){return [...this.fired];}
 get completed(){return [...this.finished];}
 get pending(){return this.active.map(j=>j.event.id);}
 tick(dt:number,state:EventState){if(dt<=0)return;this.elapsed+=dt;
 for(const e of this.definitions)if(!this.fired.has(e.id)&&state.flags[e.trigger.flag]&&state.zones[e.trigger.zone]){this.fired.add(e.id);this.active.push({event:e,index:0,due:this.elapsed});}
 for(const job of this.active){while(job.index<job.event.sequence.length&&job.due<=this.elapsed){const action=job.event.sequence[job.index++];if(action.type==='wait')job.due+=action.seconds;else this.emit(action);}}
 for(const job of this.active)if(job.index>=job.event.sequence.length&&job.due<=this.elapsed)this.finished.add(job.event.id);
 this.active=this.active.filter(j=>j.index<j.event.sequence.length||j.due>this.elapsed);
 }
}
