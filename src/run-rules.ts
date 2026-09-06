export type Threat='listener'|'light-shy'|'patroller';
export function roundRules(round:number){const index=round-1;const threat=(['listener','light-shy','patroller'] as const)[(index+Math.floor(index/3))%3];const event=(['quiet','supply','power'] as const)[(Math.floor(index/2)+(index%2)*2+Math.floor(index/3))%3];
 return {threat,event,threatName:{listener:'听声者', 'light-shy':'畏光者',patroller:'巡逻者'}[threat],hint:{listener:'疾跑、开箱会引来它；拉开距离后停下，或用 R 诱饵转移', 'light-shy':'照住它会退缩并明显减速；隔墙无效，F 闪光可定身',patroller:'沿通道追踪；用 E 关门阻挡，R 引走'}[threat],eventName:{quiet:'静默巡查：追逐间隔更长',supply:'补给充足：每轮多 1 个闪光器',power:'供电检修：搜寻后间歇断电 5 秒，手电保留'}[event]};}
export const itemRules={flashDuration:4,decoyDuration:8,bandages:1} as const;
export function lightSlows(angle:number,dx:number,dy:number,battery:number,unobstructed=true){return unobstructed&&battery>0&&Math.hypot(dx,dy)<(battery<20?190:250)&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<.5;}
