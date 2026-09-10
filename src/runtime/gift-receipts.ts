/** Tracks actual completion of every unit in a local interaction, not queue admission. */
export class GiftReceipts {
 private pending=new Map<string,{left:number;resolve:(result:boolean)=>void;timer:ReturnType<typeof setTimeout>}>();
 wait(id:string,count:number,cancel:()=>void){return new Promise<boolean>(resolve=>{const timer=setTimeout(()=>{cancel();this.fail(id);},120_000);this.pending.set(id,{left:count,resolve,timer});});}
 complete(id:string){const p=this.pending.get(id);if(p&&--p.left===0)this.finish(id,true);}
 fail(id:string){this.finish(id,false);}
 clear(){for(const id of this.pending.keys())this.fail(id);}
 private finish(id:string,result:boolean){const p=this.pending.get(id);if(!p)return;clearTimeout(p.timer);this.pending.delete(id);p.resolve(result);}
}
