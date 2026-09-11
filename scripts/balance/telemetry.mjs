import {RecoveryWindows,metricsVersion} from './recovery.mjs';
import {RouteLoops} from './policy.mjs';
/** Shared by the real-scene browser harness and Node regression tests. No gameplay logic. */
export class Telemetry {
 constructor(meta,{windowSeconds=30,maxEvents=2400}={}){this.meta=meta;this.recovery=new RecoveryWindows();this.routeLoops=new RouteLoops();this.windowSeconds=windowSeconds;this.maxEvents=maxEvents;this.frames=[];this.events=[];this.anomalies=[];this.groups={};this.tracks=new Map();this.previous=null;this.result=null;this.censoredEpisodes=[];this.itemWindows=[];this.pendingItems=[];this.policyAnchor=null;this.policyStill=0;}
 event(time,type,data={}){this.events.push({time,type,...structuredClone(data)});this.events=this.events.filter(e=>e.time>=time-this.windowSeconds).slice(-this.maxEvents);}
 flag(time,kind,id,detail){if(this.anomalies.some(a=>a.kind===kind&&a.id===id&&time-a.time<10))return;this.anomalies.push({time,kind,id,detail,frames:structuredClone(this.frames),events:structuredClone(this.events)});if(this.anomalies.length>8)this.anomalies.shift();}
 sample(frame){
  frame=structuredClone(frame);const dt=this.previous?Math.max(0,frame.time-this.previous.time):0;
  this.frames.push(frame);this.frames=this.frames.filter(f=>f.time>=frame.time-this.windowSeconds).slice(-1201);
  const stage=frame.fuses===3?'finale':'daily';
  const group=this.groups[stage]??={startedAt:frame.time,inventoryAtStart:structuredClone(frame.inventory??null),healthAtStart:frame.health,minimumHealth:frame.health,seconds:0,damage:0,threatSeconds:0,nearDangerSeconds:0,controlledSeconds:0,firstEncounter:null,chases:[],escapes:[],reencounters:[],items:{F:0,R:0,Q:0},monsters:{},alarm:{seconds:0,damage:0,threatSeconds:0,nearDangerSeconds:0,controlledSeconds:0}};
  group.seconds+=dt;
  group.damageByActor??={};group.controlHits??=[];
  for(const event of frame.actorEvents??[]){this.event(frame.time,event.type,event);if(event.type==='damage-source')group.damageByActor[event.id]=(group.damageByActor[event.id]??0)+event.amount;if(event.type==='control-hit')group.controlHits.push(event);}

  group.searches??={cabinets:0,empty:0,loot:{F:0,R:0,Q:0}};
  for(const key of ['cabinets','empty']){const added=Math.max(0,(frame.searches?.[key]??0)-(this.previous?.searches?.[key]??0));group.searches[key]+=added;if(added)this.event(frame.time,'search',{kind:key,count:added});}
  for(const key of ['F','R','Q'])group.searches.loot[key]+=frame.gained?.[key]??0;
  const damage=this.previous?Math.max(0,this.previous.health+(frame.healed??0)-frame.health):0;
  group.damage+=damage;this.totalDamage=(this.totalDamage??0)+damage;group.minimumHealth=Math.min(group.minimumHealth,frame.health);if(damage)this.event(frame.time,'damage',{amount:damage});
  if(this.previous&&this.previous.fuses!==frame.fuses)this.event(frame.time,'objective',{fuses:frame.fuses});
  let pressure=false,nearDanger=false,controlled=false,attackRecovery=false;
  for(const actor of frame.enemies){
   const key=actor.id;let track=this.tracks.get(key);
   if(!track){track={mode:'absent',chaseStart:null,quiet:0,escapedAt:null,stationary:0,last:actor.position};this.tracks.set(key,track);}
   const sensed=actor.present&&actor.cue>0;
   const pursuing=sensed&&['chase','door','contact','dash'].includes(actor.mode);
   const blockedEffect=['stunned','hesitation','light','warning','returning','recovery'].includes(actor.mode);
   const nearbyActive=actor.present&&actor.dangerous&&actor.gap<160&&(!blockedEffect||actor.kind==='weeper'&&actor.mode==='warning');
   const nearbyControlled=actor.present&&actor.gap<160&&['stunned','hesitation','light'].includes(actor.mode);
   const threatened=actor.present&&pursuing||nearbyActive;
   pressure ||=threatened;
   nearDanger ||=nearbyActive;controlled ||=nearbyControlled;attackRecovery ||=actor.present&&actor.gap<160&&actor.mode==='recovery';
   const m=group.monsters[actor.kind]??={seconds:0,threatSeconds:0,chaseSeconds:0,controlledSeconds:0};m.seconds+=actor.present?dt:0;m.threatSeconds+=threatened?dt:0;m.chaseSeconds+=pursuing?dt:0;m.controlledSeconds+=nearbyControlled?dt:0;
   if(track.mode!==actor.mode){if(['stunned','hesitation','light','recovery'].includes(actor.mode))this.event(frame.time,'control-start',{id:key,effect:actor.mode});if(['stunned','hesitation','light','recovery'].includes(track.mode))this.event(frame.time,'control-end',{id:key,effect:track.mode,next:actor.mode});this.event(frame.time,'transition',{id:key,from:track.mode,to:actor.mode,reason:actor.reason,target:actor.target});track.mode=actor.mode;}
   if(threatened&&group.firstEncounter===null)group.firstEncounter=frame.time-group.startedAt;
   if(track.stage&&track.stage!==stage&&track.chaseStart!==null){this.censoredEpisodes.push({id:key,stage:track.stage,started:track.chaseStart,ended:frame.time,reason:'stage-changed'});track.chaseStart=null;track.quiet=0;}track.stage=stage;
   if(pursuing){if(track.chaseStart===null){track.chaseStart=frame.time;if(track.escapedAt!==null){group.reencounters.push(frame.time-track.escapedAt);track.escapedAt=null;}}track.quiet=0;}
   else if(track.chaseStart!==null&&!sensed){track.quiet+=dt;if(track.quiet>=2){const duration=frame.time-track.chaseStart-2;group.chases.push(duration);group.escapes.push({at:frame.time,duration});track.chaseStart=null;track.escapedAt=frame.time;}}else if(sensed)track.quiet=0;
   const movement=track.last?Math.hypot(actor.position.x-track.last.x,actor.position.y-track.last.y):0;
   track.stationary=pursuing&&!blockedEffect&&actor.gap>40&&actor.target&&Math.hypot(actor.target.x-actor.position.x,actor.target.y-actor.position.y)>32&&movement<.05?track.stationary+dt:0;
   if(track.stationary>=3)this.flag(frame.time,'stationary-pursuit',key,{seconds:track.stationary,blocked:actor.blocked,target:actor.target});
   if(actor.present&&actor.seen&&!blockedEffect&&actor.mode==='patrol')this.flag(frame.time,'visible-player-abandoned',key,{target:actor.target});
   track.last=actor.position;
  }
  group.attackRecoverySeconds=(group.attackRecoverySeconds??0)+(attackRecovery?dt:0);group.threatSeconds+=pressure?dt:0;
  group.nearDangerSeconds+=nearDanger?dt:0;group.controlledSeconds+=controlled?dt:0;
  if(stage==='finale'&&(frame.exitStartup>0||this.previous?.exitStartup>0)){group.alarm.seconds+=dt;group.alarm.damage+=damage;group.alarm.threatSeconds+=pressure?dt:0;group.alarm.nearDangerSeconds+=nearDanger?dt:0;group.alarm.controlledSeconds+=controlled?dt:0;}
  for(const item of frame.used??[]){group.items[item]++;const nearest=frame.enemies.filter(e=>e.present).sort((a,b)=>a.gap-b.gap)[0];this.pendingItems.push({item,at:frame.time,stage,health:frame.health,damageAt:this.totalDamage,id:nearest?.id,kind:nearest?.kind,gap:nearest?.gap});this.event(frame.time,'item',{item,kind:nearest?.kind});}
  this.pendingItems=this.pendingItems.filter(item=>{if(frame.time-item.at<3)return true;const enemy=frame.enemies.find(e=>e.id===item.id);this.itemWindows.push({...item,damage:this.totalDamage-item.damageAt,gapChange:enemy&&item.gap!==undefined?enemy.gap-item.gap:null});return false;});
  const nav=frame.input?.navigation;
  if(nav&&!(nav.goal==='exit'&&frame.exitStartup>0&&!nearDanger&&Math.hypot(frame.player.x-nav.target.x,frame.player.y-nav.target.y)<35)){
   if(!this.policyAnchor||this.policyGoal!==nav.goal||Math.hypot(frame.player.x-this.policyAnchor.x,frame.player.y-this.policyAnchor.y)>16){this.policyAnchor=frame.player;this.policyGoal=nav.goal;this.policyStill=0;}else this.policyStill+=dt;
   if(this.policyStill>5)this.flag(frame.time,'policy-stalled','driver',{goal:nav.goal,next:nav.next});
  }else{this.policyStill=0;this.policyAnchor=null;}
  const loop=this.routeLoops.sample(frame);if(loop)this.flag(frame.time,'policy-route-loop','driver',loop);
  this.recovery.sample(frame);this.previous=frame;
 }
 finish(outcome,time,cause){this.result={outcome,time,...(cause?{cause}:{})};this.event(time,'finish',{outcome,cause});}
 export(){return structuredClone({schema:2,metricsVersion,content:this.content,recovery:this.recovery.export(this.previous?.time??0),meta:this.meta,result:this.result,groups:this.groups,censoredEpisodes:this.censoredEpisodes,itemWindows:this.itemWindows,censoredItems:this.pendingItems,frames:this.frames,events:this.events,anomalies:this.anomalies,censoredChases:[...this.tracks.entries()].filter(([,t])=>t.chaseStart!==null).map(([id,t])=>({id,started:t.chaseStart}))});}
}
export function percentile(values,p){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))];}
export function summarize(runs){const groups={};for(const run of runs){for(const [stage,g]of Object.entries(run.trace.groups)){const key=[run.meta.scenario,run.meta.night,run.meta.policy,stage].join('/');const a=groups[key]??={runs:0,seconds:[],damage:[],threatRatio:[],firstEncounter:[],chases:[],reencounters:[],wins:0,timeouts:0,anomalies:0,items:[],monsters:{}};a.runs++;a.seconds.push(g.seconds);a.damage.push(g.damage);a.threatRatio.push(g.seconds?g.threatSeconds/g.seconds:0);if(g.firstEncounter!==null)a.firstEncounter.push(g.firstEncounter);a.chases.push(...g.chases);a.reencounters.push(...g.reencounters);a.wins+=run.trace.result?.outcome==='won'?1:0;a.timeouts+=run.trace.result?.outcome==='timeout'?1:0;a.anomalies+=run.trace.anomalies.length;a.items.push(g.items);for(const[k,v]of Object.entries(g.monsters)){const m=a.monsters[k]??={seconds:0,threatSeconds:0,chaseSeconds:0};for(const f of Object.keys(m))m[f]+=v[f];}}}return Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{...v,damageP50:percentile(v.damage,.5),threatP50:percentile(v.threatRatio,.5),chaseP50:percentile(v.chases,.5),chaseP90:percentile(v.chases,.9),reencounterP50:percentile(v.reencounters,.5)}]));}
