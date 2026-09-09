import {t as msg} from './i18n.ts';
export type Threat='listener'|'light-shy'|'patroller';
// Listener has no visual lock; the patroller only hears nearby activity.
export function detectsPlayer(threat:Threat,distance:number,visible:boolean){return threat!=='listener'&&visible&&distance<240;}
export function hearsPlayer(threat:Threat,distance:number){return distance<({listener:260,'light-shy':180,patroller:100}[threat]);}
/** Quiet walking remains audible to the listener nearby; loud actions use hearsPlayer. */
export function hearsWalking(threat:Threat,distance:number){return threat==='listener'&&distance<200;}
export function roundRules(round:number){const index=round-1;const threat=(['listener','light-shy','patroller'] as const)[(index+Math.floor(index/3))%3];const event=(['quiet','supply','power'] as const)[(Math.floor(index/2)+(index%2)*2+Math.floor(index/3))%3];
 return {threat,event,threatName:{listener:msg("threat.listener"), 'light-shy':msg("threat.light-shy"),patroller:msg("threat.patroller")}[threat],hint:{listener:msg("gameplay.it-cannot-see-sprinting-and-searching-reveal"), 'light-shy':msg("gameplay.light-makes-it-recoil-turn-and-run"),patroller:msg("gameplay.it-pursues-on-sight-turn-corners-and")}[threat],eventName:{quiet:msg("gameplay.quiet-patrol-longer-pursuit-intervals"),supply:msg("gameplay.extra-supplies-one-additional-flash-per-stage"),power:msg("gameplay.power-maintenance-intermittent-second-outages-after-searching")}[event]};}
export const itemRules={flashDuration:4,decoyDuration:8,bandages:1} as const;
export function lightSlows(angle:number,dx:number,dy:number,battery:number,unobstructed=true){return unobstructed&&battery>0&&Math.hypot(dx,dy)<(battery<20?190:250)&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<.5;}
