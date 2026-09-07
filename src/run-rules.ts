export type Threat='listener'|'light-shy'|'patroller';
// Listener has no visual lock; the patroller only hears nearby activity.
export function detectsPlayer(threat:Threat,distance:number,visible:boolean){return threat!=='listener'&&visible&&distance<240;}
export function hearsPlayer(threat:Threat,distance:number){return distance<({listener:260,'light-shy':180,patroller:100}[threat]);}
export function roundRules(round:number){const index=round-1;const threat=(['listener','light-shy','patroller'] as const)[(index+Math.floor(index/3))%3];const event=(['quiet','supply','power'] as const)[(Math.floor(index/2)+(index%2)*2+Math.floor(index/3))%3];
 return {threat,event,threatName:{listener:'听声者', 'light-shy':'畏光者',patroller:'巡逻者'}[threat],hint:{listener:'它看不见你；疾跑、开箱会暴露位置，轻走离开或用 R 引开', 'light-shy':'照一下让它遮脸后退，转身逃跑；重复照光不能立即再控',patroller:'看见你就会追；绕过转角、用 E 关门，近处可用 R 引走'}[threat],eventName:{quiet:'静默巡查：追逐间隔更长',supply:'补给充足：每轮多 1 个闪光器',power:'供电检修：搜寻后间歇断电 5 秒，手电保留'}[event]};}
export const itemRules={flashDuration:4,decoyDuration:8,bandages:1} as const;
export function lightSlows(angle:number,dx:number,dy:number,battery:number,unobstructed=true){return unobstructed&&battery>0&&Math.hypot(dx,dy)<(battery<20?190:250)&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<.5;}
