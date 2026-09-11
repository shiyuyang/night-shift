import {Telemetry} from './telemetry.mjs';
import {patrolPath} from '/src/patrol.ts';
import {feetAt,moveWithCollision,clearContact} from '/src/collision.ts';
import {tuning} from '/src/runtime/pacing.ts';
import {Blackouts} from '/src/runtime/blackouts.ts';
import {AtmosphereColors} from '/src/runtime/atmosphere-colors.ts';
import {canSpendOffense,objectiveOrder,weeperResponse,activeThreat,quietHasPriority,SprintPlan,PrimaryCounters} from './policy.mjs';
import {OptionalSearchPlan} from './search-policy.mjs';
import {ExitWaitPlan} from './exit-wait.mjs';
const profiles={conservative:{reaction:.7,sprint:95,flash:65,decoy:130,heal:35},ordinary:{reaction:.35,sprint:140,flash:90,decoy:170,heal:50},practiced:{reaction:.15,sprint:180,flash:115,decoy:200,heal:60}};
const point=p=>({x:p.x,y:p.y});
function randomStream(seed){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
function fingerprint(value){const str=JSON.stringify(value);let hash=2166136261;for(let i=0;i<str.length;i++)hash=Math.imul(hash^str.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
export function createHarness(s,meta,{render=false}={}){
 const random=randomStream(meta.seed^0x70ab21),trace=new Telemetry(meta);let outcome=null,step=0,terminalFrame=null,healedThisStep=0,gainedThisStep={F:0,R:0,Q:0};
 trace.content={theme:s.level.theme,cabinets:s.rogue.features.filter(f=>f.kind==='cache').length,rewards:s.rogue.features.filter(f=>f.kind==='cache'&&f.hasLoot).length,empty:s.rogue.features.filter(f=>f.kind==='empty-task').length};
 s.game.loop.sleep();s.tutorial.skip();s.paused=false;s.balanceDiagnostics=true;
 // These are the production random consumers. Isolate them from renderer/audio timing.
 s.blackouts=new Blackouts(random);s.atmosphereColors=new AtmosphereColors(random);
 if(!render){for(const method of ['draw','light','drawBodyFeedback','showGifts'])s[method]=()=>{};}
 const originalFinish=s.finish.bind(s);s.finish=(won,...args)=>{terminalFrame=capture();outcome=won?'won':'lost';trace.finish(outcome,s.state.elapsed,args[0]);return originalFinish(won,...args);};
 const originalHear=s.hear.bind(s);s.hear=(...args)=>{const before=s.memory;originalHear(...args);trace.event(s.state.elapsed,'cue',{id:'primary',source:args[1]?'walk':args[2]?'sprint':'event',accepted:s.balanceCue?.accepted??false,reason:s.balanceCue?.reason,before,after:s.memory});};
 const originalHealed=s.feedback.healed.bind(s.feedback);s.feedback.healed=(before,after)=>{healedThisStep+=after-before;return originalHealed(before,after);};
 const originalRogue=s.handleRogue.bind(s);s.handleRogue=(events)=>{const before={F:s.flashes,R:s.decoys,Q:s.bandages};originalRogue(events);const after={F:s.flashes,R:s.decoys,Q:s.bandages};for(const k of ['F','R','Q'])gainedThisStep[k]+=Math.max(0,after[k]-before[k]);};
 const optionalSearch=new OptionalSearchPlan(meta.searches??'off'),exitWait=new ExitWaitPlan();
 let nextReaction=0,nextItem=0,nextInteraction=0,route=[],routeAt=0,goalKey='',observed=[],lastQuietWeeper=null,quietSeenAt=-Infinity,nextEmergency=0,avoidKey='',lightOffUntil=0,dimmedForWeeper=false;
 const config=profiles[meta.policy];if(!config)throw Error('Unknown policy '+meta.policy);
 const movement=meta.movement??'route',staminaMode=meta.staminaMode??'burst',mixed=meta.mixed??'quiet',sprintPlan=new SprintPlan(),counters=new PrimaryCounters();
 function capture(){
  const primary=s.ghostTime>0;const raw=s.balanceDecision;
  const mode=!primary?'absent':s.ghostDelay>0?'warning':s.stun>0?'stunned':s.attackRecovery.active?'recovery':s.distractionResponse.hesitation>0?'hesitation':s.lightFear.suppressed?'light':raw.mode;
  const enemies=[{id:'primary',kind:s.rules.threat,present:primary,position:point(s.ghost),gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),cue:s.memory,mode,reason:mode!==raw.mode?mode:raw.reason,target:raw.target,seen:raw.seen,blocked:raw.blocked,dangerous:primary&&s.stun<=0,search:s.pursuitSearch.remaining,recovery:s.attackRecovery.remaining,stun:s.stun,hesitation:s.distractionResponse.hesitation}];
  s.reserves.forEach((r,i)=>{const d=r.diagnostics;enemies.push({id:'reserve-'+i,kind:'patroller',present:!!r.position,position:point(r.position??{x:0,y:0}),gap:r.position?Math.hypot(s.player.x-r.position.x,s.player.y-r.position.y):9999,cue:r.clueClock,mode:r.position?d.mode:'absent',reason:d.reason,target:d.target,seen:d.seen,blocked:d.blocked,dangerous:!!r.position&&r.stun<=0,recovery:r.attackRecovery.remaining,stun:r.stun,hesitation:r.distractionResponse.hesitation});});
  if(s.weeper){const w=s.weeper;enemies.push({id:'weeper',kind:'weeper',present:true,position:point(w.position),gap:Math.hypot(s.player.x-w.position.x,s.player.y-w.position.y),cue:w.dangerous?1:0,mode:w.phase==='chasing'?'chase':w.phase,reason:'weeper-'+w.phase,target:w.dangerous?point(s.player):point(w.home),seen:w.noticed,blocked:false,dangerous:w.dangerous});}
  return {actorEvents:[...(s.balanceEvents??[])],time:s.state.elapsed,player:point(s.player),health:s.state.health,stamina:s.stamina.value,battery:s.state.battery,flashlightOn:s.flashlightOn,fuses:s.state.fuses,door:s.door,breach:s.doorBreach.progress,exitStartup:s.exitStartup,hidden:!!s.rogue.hidden,inventory:{F:s.flashes,R:s.decoys,Q:s.bandages},searches:{cabinets:s.rogue.stats.cachesOpened,empty:s.rogue.features.filter(f=>f.kind==='empty-task'&&s.rogue.opened.has(f.id)).length},enemies};
 }
 function inputForPolicy(){
  const t=s.state.elapsed;if(t>=nextReaction){nextReaction=t+config.reaction;observed=capture().enemies.filter(e=>e.present&&(e.mode!=='warning'||meta.weeperAware&&e.kind==='weeper')&&e.gap<260&&s.canSee(s.player,e.position)).sort((a,b)=>a.gap-b.gap);}
  const response=meta.weeperAware?weeperResponse(observed,{flashlightOn:s.flashlightOn,flashes:s.flashes,fuses:s.state.fuses,reserve:meta.reserve,items:meta.items,emergencyReady:t>=nextEmergency}):{quiet:false,turnOff:false,flash:false};
  if(response.quiet){lastQuietWeeper=point(response.weeper.position);quietSeenAt=t;}else if(response.weeper){lastQuietWeeper=null;}
  const remembered=meta.weeperAware&&lastQuietWeeper&&t-quietSeenAt<3?lastQuietWeeper:null;
  const quiet=quietHasPriority(!!remembered,observed,mixed);
  const enemy=observed.find(e=>!meta.weeperAware||e.kind!=='weeper'||e.dangerous);
  const counter=meta.counters!==false?counters.decide(t,observed,{battery:s.state.battery,allowLight:!quiet&&!response.weeper}):{listenerQuiet:false,aim:null,escape:false};

  let target,label;
  const goals={key:s.level.key,box0:s.level.boxes[0],box1:s.level.boxes[1],door:s.level.doorUse,box2:s.level.boxes[2],exit:s.level.exit};
  const done={key:s.key,box0:s.opened[0],box1:s.opened[1],door:s.door,box2:s.opened[2],exit:false};
  label=objectiveOrder(meta.route).find(id=>!done[id]);target=goals[label];
  const optional=optionalSearch.select({features:s.rogue.features,opened:s.rogue.opened,player:s.player,fuses:s.state.fuses,door:s.door,visible:p=>s.canSee(s.player,p),path:p=>patrolPath(s.player,p,s.solids(),s.level.bounds,feetAt)});
  if(optional){label='search:'+optional.id;target=optional.point;}
  if(label==='exit'){
   const wait=exitWait.select({player:s.player,exit:s.level.exit,remaining:s.exitStartup,threats:observed.filter(activeThreat),path:p=>patrolPath(s.player,p,s.solids(),s.level.bounds,feetAt),occluded:(a,b)=>!clearContact(a,b,s.solids())});
   if(wait){label='evade-exit';target=wait;}
  }
  const objectGoal=label==='key'||label.startsWith('box'),interactionRange=label==='key'?30:label.startsWith('box')?38:30;
  const clearInteraction=optional?s.canReachInteraction({x:target.x,y:target.y-28}):!objectGoal||s.canReachInteraction(target);
  const items=[];
  if(meta.weeperAware&&(response.weeper||quiet)){lightOffUntil=t+3;if(s.flashlightOn){items.push('T');dimmedForWeeper=true;}}
  else if(dimmedForWeeper&&t>=lightOffUntil){if(!s.flashlightOn)items.push('T');dimmedForWeeper=false;}
  if(counter.aim&&!s.flashlightOn&&!items.includes('T'))items.push('T');
  // Wait for the next observation before spending another item on the same light response.
  if(counter.aim)nextItem=Math.max(nextItem,t+config.reaction);
  // A lethal visible wind-up takes priority over healing or the policy's generic item wait.
  if(response.flash){items.push('F');nextEmergency=t+.8;nextItem=t+2.5;}
  else if(t>=nextItem){const lightControlled=meta.counters!==false&&enemy?.kind==='light-shy'&&(counter.aim||enemy.mode==='light');if(s.state.health<config.heal&&s.bandages>0){items.push('Q');nextItem=t+2;}else if(enemy&&!lightControlled&&(!meta.weeperAware||enemy.kind!=='weeper')&&enemy.gap<config.flash&&canSpendOffense(s.flashes,s.state.fuses,meta.reserve)&&meta.items!=='none'&&meta.items!=='decoy'){items.push('F');nextItem=t+2.5;}else if(enemy&&!lightControlled&&(!meta.weeperAware||enemy.kind!=='weeper')&&enemy.gap<config.decoy&&canSpendOffense(s.decoys,s.state.fuses,meta.reserve)&&meta.items!=='none'&&meta.items!=='flash'){items.push('R');nextItem=t+3;}}
  const gap=Math.hypot(target.x-s.player.x,target.y-s.player.y);
  if(label!=='evade-exit'&&gap<(optional?6:interactionRange)&&clearInteraction&&t>=nextInteraction){items.push('E');nextInteraction=t+.7;}
  const avoidance=remembered&&quiet?{x:remembered.x-70,y:remembered.y-70,width:140,height:140}:null;
  const threats=movement==='route'?observed.filter(e=>activeThreat(e)&&e.gap<180):[];
  const key=(avoidance?`${Math.round(remembered.x/24)},${Math.round(remembered.y/24)}`:'')+(threats.length?'|'+threats.map(e=>e.id).join(','):'');
  if(goalKey!==label||t>=routeAt||key!==avoidKey){
   let normal=patrolPath(s.player,target,s.solids(),s.level.bounds,feetAt);
   const reachableApproach=path=>path.length&&Math.hypot(path.at(-1).x-target.x,path.at(-1).y-target.y)<interactionRange&&(!objectGoal||canUseFrom(path.at(-1),target));
   if(objectGoal&&!reachableApproach(normal)){
    // The nearest grid point can be across a wall. Try actual interaction sides
    // instead of repeatedly pressing E through architecture.
    for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]){
     const radius=label==='key'?22:28,candidate=patrolPath(s.player,{x:target.x+dx*radius,y:target.y+dy*radius},s.solids(),s.level.bounds,feetAt);
     if(reachableApproach(candidate)){normal=candidate;break;}
    }
   }
   // Route around a visible threat without replacing the objective with "run away".
   // Skip zones containing our start or interaction point; those require local movement/items.
   const zones=threats.filter(e=>e.gap>65&&Math.hypot(e.position.x-target.x,e.position.y-target.y)>65).map(e=>({x:e.position.x-32,y:e.position.y-32,width:64,height:64}));
   if(avoidance)zones.push(avoidance);
   const bypass=zones.length?patrolPath(s.player,target,[...s.solids(),...zones],s.level.bounds,feetAt):normal;
   // Keep a complete route only; a blocked virtual zone must not trap the test policy.
   route=reachableApproach(bypass)?bypass:normal;
   routeAt=t+(threats.length?.8:avoidance?1:5);goalKey=label;avoidKey=key;
  }
  while(route.length&&Math.hypot(route[0].x-s.player.x,route[0].y-s.player.y)<3.5)route.shift();
  let next=route[0]??target;
  // Local evasive detour uses only the currently visible enemy, never its hidden position.
  if(movement==='legacy'&&enemy&&enemy.gap<65&&!items.includes('F')){const a=Math.atan2(s.player.y-enemy.position.y,s.player.x-enemy.position.x);const escape={x:s.player.x+Math.cos(a)*100,y:s.player.y+Math.sin(a)*100};const detour=patrolPath(s.player,escape,s.solids(),s.level.bounds,feetAt);next=detour.find(p=>Math.hypot(p.x-s.player.x,p.y-s.player.y)>6)??next;}
  const wantsSprint=!quiet&&!counter.listenerQuiet&&!counter.aim&&(counter.escape||!!enemy&&enemy.gap<config.sprint);
  const sprint=staminaMode==='pulse'?wantsSprint&&s.stamina.value>15:sprintPlan.decide(wantsSprint,s.stamina.value,s.stamina.canSprint);
  const speed=(sprint&&s.stamina.canSprint?tuning.sprintSpeed:tuning.walkSpeed)*.05;
  let keys=[],best=Infinity;
  for(const [dx,dy,held]of [[0,-1,['W']],[0,1,['S']],[-1,0,['A']],[1,0,['D']],[-1,-1,['A','W']],[1,-1,['D','W']],[-1,1,['A','S']],[1,1,['D','S']]]){
   const length=Math.hypot(dx,dy),at=moveWithCollision(s.player,dx/length*speed,dy/length*speed,s.solids());
   if(Math.hypot(at.x-s.player.x,at.y-s.player.y)<.1)continue;
   const clearance=remembered?Math.hypot(at.x-remembered.x,at.y-remembered.y):999;const score=Math.hypot(at.x-next.x,at.y-next.y)+(quiet?Math.max(0,60-clearance)*4:0);if(score<best){best=score;keys=held;}
  }
  if(counter.aim){const dx=counter.aim.x-s.player.x,dy=counter.aim.y-s.player.y,a=Math.atan2(dy,dx),directions=[['D'],['D','S'],['S'],['A','S'],['A'],['A','W'],['W'],['D','W']];keys=directions[(Math.round(a/(Math.PI/4))+8)%8];}
  else if(gap<(label==='door'||label==='evade-exit'||optional?6:objectGoal?interactionRange:26)&&clearInteraction)keys=[];
  return {keys,sprint,items,navigation:{goal:label,target:point(target),next:point(next),counter:counter.aim?'light-face':counter.escape?'light-escape':counter.listenerQuiet?'listener-quiet':null,weeper:response.flash?'emergency-flash':quiet?'quiet-bypass':remembered?'urgent-escape':response.weeper?.dangerous?'flee':null}};
 }
 function canUseFrom(from,target){return clearContact(from,target,[...s.morgueDrawer.solids,...s.level.walls,...s.level.props,...(s.door?[]:[s.level.door])]);}
 function advance(input){
  if(outcome)return;s.balanceEvents=[];const held=new Set(input.keys??[]);for(const k of ['W','A','S','D','UP','DOWN','LEFT','RIGHT','E'])s.keys[k].isDown=held.has(k);
  s.sprintInput.clear();if(input.sprint)s.sprintInput.down({key:'Shift',code:'ShiftLeft',shiftKey:true});
  for(const item of input.items??[])s.itemQueue.add(item);for(const r of s.reserves)r.diagnosticsEnabled=true;
  const before={F:s.flashes,R:s.decoys,Q:s.bandages};healedThisStep=0;gainedThisStep={F:0,R:0,Q:0};const original=Math.random;Math.random=random;
  try{s.update(step*50,50);s.cameras.update(step*50,50);if(render){const renderer=s.game.renderer;renderer.preRender();s.game.scene.render(renderer);renderer.postRender();}else s.cameras.main.preRender();}finally{Math.random=original;}
  const frame=terminalFrame??capture();terminalFrame=null;frame.healed=healedThisStep;frame.gained=gainedThisStep;frame.input=input;frame.used=Object.keys(before).filter(k=>frame.inventory[k]<before[k]+gainedThisStep[k]);trace.sample(frame);step++;return fingerprint(frame);
 }
 if(meta.scenario==='navigation'){const command=s.command.bind(s);s.command=(kind,...args)=>kind==='ghost'?undefined:command(kind,...args);s.weeper=undefined;s.updateReinforcement=()=>{};trace.event(0,'fixture',{scenario:'navigation',description:'monster-free route correctness; excluded from difficulty conclusions'});}
 // Only finale fixtures alter progression, clearly labeled and excluded from campaign results.
 if(meta.scenario==='finale'){s.key=true;s.opened=[true,true,true];s.state.fuses=3;s.locks.doorUnlocked=true;s.door=true;s.exitStartup=30;s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+28);s.command('ghost','world');trace.event(0,'fixture',{scenario:'finale',description:'all boxes open, exit countdown 30s; normal health and inventory'});}
 trace.sample(capture());
 return {trace,capture,advance,inputForPolicy,get done(){return !!outcome;},finish(){if(!outcome){outcome='timeout';trace.finish(outcome,s.state.elapsed);}return trace.export();}};
}
