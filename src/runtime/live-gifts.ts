export const giftDefinitions = {
 '59511':{kind:'battery',coins:1},'59316':{kind:'flash',coins:30},'59317':{kind:'heal',coins:100},
 '59315':{kind:'failure',coins:20},'59318':{kind:'warp',coins:299},'59319':{kind:'shade',coins:399},
} as const;
export type GiftKind=typeof giftDefinitions[keyof typeof giftDefinitions]['kind'];
export interface GiftEvent {id:string;runId:string;giftId:keyof typeof giftDefinitions;viewer:string;userId:string;avatar?:string;comboId?:string;count:number}
export interface GiftEntry {kind:GiftKind;viewer:string;userId:string;avatar?:string;count:number;key:string}
export type GiftNotice=GiftEntry&{serial:number;status:'queued'|'started'|'added'|'delivered';value:number};
export interface GiftView {runId:string;active:{entry:GiftEntry;remaining:number}|null;shade:number;shadeOwner:GiftEntry|null;queue:GiftEntry[];pending:number;wait:number;reason:'interval'|'power'|'paused'|null;notice:GiftNotice|null}
/** One run owns effects. Deduplication survives clearing a run. Counts are cumulative per combo. */
export class LiveGifts {
 runId='';shade=0;shadeOwner:GiftEntry|null=null;active:{entry:GiftEntry;remaining:number}|null=null;
 queue:GiftEntry[]=[];notice:GiftNotice|null=null;noticeTime=0;clock=0;private gap=0;private failureReady=0;private warpReady=0;private serial=0;
 private seen=new Set<string>();private combos=new Map<string,number>();
 begin(runId:string){this.clear();this.runId=runId;}
 clear(){this.runId='';this.shade=0;this.shadeOwner=null;this.active=null;this.queue=[];this.notice=null;this.noticeTime=0;this.clock=0;this.gap=0;this.failureReady=0;this.warpReady=0;}
 private report(entry:GiftEntry,status:GiftNotice['status'],value=0){const count=status==='started'&&this.notice?.key===entry.key&&this.notice.status==='queued'?this.notice.count:entry.count;this.notice={...entry,count,status,value,serial:++this.serial};this.noticeTime=6;}
 receive(e:GiftEvent):GiftEntry|null {
  if(!e||typeof e.id!=='string'||typeof e.viewer!=='string'||typeof e.userId!=='string'||!this.runId||e.runId!==this.runId||this.seen.has(e.id)||!giftDefinitions[e.giftId]||!Number.isSafeInteger(e.count)||e.count<1)return null;
  const key=e.comboId?`${e.runId}/${e.userId}/${e.giftId}/${e.comboId}`:e.id;
  const before=e.comboId?(this.combos.get(key)??0):0,delta=Math.max(0,e.count-before);
  this.seen.add(e.id);if(e.comboId)this.combos.set(key,Math.max(before,e.count));if(!delta)return null;
  const entry:GiftEntry={kind:giftDefinitions[e.giftId].kind,viewer:e.viewer,userId:e.userId,avatar:e.avatar,count:delta,key};
  if(entry.kind==='shade'){this.shade+=20*delta;this.shadeOwner=entry;this.report({...entry,count:e.count},'added',20*delta);}
  else if(entry.kind==='failure'||entry.kind==='warp'){
   const last=this.queue.at(-1);if(last&&last.key===key)last.count+=delta;else this.queue.push({...entry});this.report({...entry,count:e.count},'queued');
  }else this.report({...entry,count:e.count},'delivered');
  return entry;
 }
 get failure(){return this.active?.entry.kind==='failure'&&this.active.remaining<=9&&this.active.remaining>1;}
 get warping(){return this.active?.entry.kind==='warp';}
 tick(dt:number,canFail:boolean):'failure'|'warp'|'wake'|null {
  if(dt<=0)return null;
  this.noticeTime=Math.max(0,this.noticeTime-dt);if(!this.noticeTime)this.notice=null;
  const wasWarp=this.warping;if(!wasWarp){this.clock+=dt;this.shade=Math.max(0,this.shade-dt);}
  if(this.active){
   this.active.remaining=Math.max(0,this.active.remaining-dt);
   if(this.active.remaining===0){const kind=this.active.entry.kind;this.active=null;this.gap=this.clock+10;if(kind==='warp')this.warpReady=this.clock+15;else this.failureReady=this.clock+10;return kind==='warp'?'wake':null;}
   return null;
  }
  if(this.clock<this.gap)return null;
  const i=this.queue.findIndex(e=>e.kind==='warp'?this.clock>=this.warpReady:canFail&&this.clock>=this.failureReady);
  if(i<0)return null;
  const item=this.queue[i],entry={...item,count:1};if(--item.count===0)this.queue.splice(i,1);
  this.active={entry,remaining:entry.kind==='warp'?2:10};this.report(entry,'started');return entry.kind as 'warp'|'failure';
 }
 view(canFail=true,paused=false):GiftView {
  const pending=this.queue.reduce((sum,e)=>sum+e.count,0),next=this.queue[0];
  const wait=Math.max(0,this.gap-this.clock,next?(next.kind==='warp'?this.warpReady:this.failureReady)-this.clock:0);
  return {runId:this.runId,active:this.active?{entry:{...this.active.entry},remaining:this.active.remaining}:null,shade:this.shade,shadeOwner:this.shadeOwner,queue:this.queue.slice(0,3).map(e=>({...e})),pending,wait,reason:paused?'paused':wait>0||this.active?'interval':next?.kind==='failure'&&!canFail?'power':null,notice:this.notice};
 }
}
