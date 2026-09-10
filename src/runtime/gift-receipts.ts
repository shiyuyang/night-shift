/** Tracks actual completion of every unit in a local interaction, not queue admission. */
export class GiftReceipts {
 private pending=new Map<string,{left:number;resolve:(result:boolean)=>void;cancel:()=>void}>();
 wait(id:string,count:number,cancel:()=>void){return new Promise<boolean>(resolve=>{this.pending.set(id,{left:count,resolve,cancel});});}
 complete(id:string,count=1){const p=this.pending.get(id);if(p&&(p.left-=count)<=0)this.finish(id,true);}
 fail(id:string){this.finish(id,false);}
 clear(){for(const id of this.pending.keys())this.fail(id);}
 private finish(id:string,result:boolean){const p=this.pending.get(id);if(!p)return;this.pending.delete(id);p.resolve(result);}
}
