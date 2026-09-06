/** Track physical modifiers separately from Phaser's key cache. */
export class SprintInput {
 private held=new Set<string>();
 get active(){return this.held.size>0;}
 down(event:{key:string;code:string;shiftKey:boolean;repeat?:boolean},accept=true){
  if(!event.shiftKey)this.clear();
  if(event.key==='Shift'&&accept&&!event.repeat)this.held.add(event.code||'Shift');
 }
 up(event:{key:string;code:string;shiftKey:boolean}){if(event.key==='Shift')this.held.delete(event.code||'Shift');if(!event.shiftKey)this.clear();}
 clear(){this.held.clear();}
}
