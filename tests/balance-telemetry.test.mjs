import test from 'node:test';import assert from 'node:assert/strict';
import {Telemetry,percentile,summarize} from '../scripts/balance/telemetry.mjs';
import {compareRuns} from '../scripts/balance/report.mjs';
import {OptionalSearchPlan} from '../scripts/balance/search-policy.mjs';
import {ExitWaitPlan} from '../scripts/balance/exit-wait.mjs';
const frame=(time,extra={})=>({time,health:100,fuses:0,used:[],enemies:[{id:'primary',kind:'listener',present:true,position:{x:time*10,y:0},gap:100,cue:1,mode:'chase',reason:'sound',target:{x:500,y:0},seen:false,dangerous:true}],...extra});
test('diagnostic history is bounded by time and count and snapshots are independent',()=>{const t=new Telemetry({});for(let i=0;i<1000;i++){t.event(i/10,'noise');t.sample(frame(i/10));}assert.ok(t.frames[0].time>=69.9-1e-8);assert.ok(t.frames.length<=301);assert.ok(t.events.length<=2400);const copy=t.export();copy.frames[0].health=0;assert.equal(t.frames[0].health,100);});
test('a short item stun is not an escape while the monster retains a valid cue',()=>{const t=new Telemetry({});t.sample(frame(0));for(let i=1;i<5;i++)t.sample(frame(i,{enemies:[{...frame(i).enemies[0],mode:'stunned'}]}));assert.equal(t.groups.daily.escapes.length,0);assert.equal(t.export().censoredChases.length,1);for(let i=5;i<8;i++)t.sample(frame(i,{enemies:[{...frame(i).enemies[0],cue:0,mode:'search',dangerous:false}]}));assert.equal(t.groups.daily.escapes.length,1);t.sample(frame(10));assert.equal(t.groups.daily.reencounters.length,1);});
test('stationary pursuit exports pre-anomaly history; an intentional pause does not',()=>{for(const mode of ['chase','stunned']){const t=new Telemetry({});for(let i=0;i<5;i++)t.sample(frame(i,{enemies:[{...frame(0).enemies[0],mode}]}));assert.equal(t.anomalies.length,mode==='chase'?1:0);if(t.anomalies.length)assert.ok(t.anomalies[0].frames.length>=4);}});
test('daily and finale damage are separate and timeout is not a win',()=>{const t=new Telemetry({});t.sample(frame(0));t.sample(frame(1,{health:80}));t.sample(frame(2,{health:60,fuses:3}));t.finish('timeout',2);assert.equal(t.groups.daily.damage,20);assert.equal(t.groups.finale.damage,20);const report=summarize([{meta:{scenario:'campaign',night:3,policy:'ordinary'},trace:t.export()}]);assert.equal(report['campaign/3/ordinary/finale'].wins,0);assert.equal(report['campaign/3/ordinary/finale'].timeouts,1);assert.equal(percentile([],.5),null);});
test('paired comparisons reject missing, duplicate, or incompatible runs',()=>{const t=new Telemetry({});t.sample(frame(0));t.finish('timeout',1);const run={meta:{scenario:'campaign',night:3,seed:0,policy:'ordinary',split:'calibration',policyVersion:1,seconds:60},trace:t.export()};assert.equal(compareRuns([run],[run]).length,1);assert.throws(()=>compareRuns([run],[]),/pair sets/);assert.throws(()=>compareRuns([run],[run,run]),/Duplicate/);assert.throws(()=>compareRuns([run],[{...run,meta:{...run.meta,seconds:30}}]),/Incompatible/);});
test('item observation windows and stage boundaries retain censoring',()=>{const t=new Telemetry({});t.sample(frame(0));t.sample(frame(1,{used:['F']}));t.sample(frame(2,{fuses:3}));assert.equal(t.censoredEpisodes.length,1);t.sample(frame(4,{fuses:3,health:80}));assert.equal(t.itemWindows.length,1);assert.equal(t.itemWindows[0].damage,20);assert.equal(t.itemWindows[0].kind,'listener');t.sample(frame(5,{fuses:3,used:['R']}));assert.equal(t.export().censoredItems.length,1);});
test('a stuck input policy is flagged separately from the monster',()=>{const t=new Telemetry({});for(let i=0;i<8;i++)t.sample(frame(i,{player:{x:0,y:0},input:{keys:[],navigation:{goal:'door',target:{x:20,y:0}}}}));assert.ok(t.anomalies.some(a=>a.kind==='policy-stalled'));});
import {canSpendOffense,objectiveOrder} from '../scripts/balance/policy.mjs';
import {RecoveryWindows} from '../scripts/balance/recovery.mjs';
test('reserve policy saves one of each offensive item until finale without imposing a carry cap',()=>{
 assert.equal(canSpendOffense(1,2,1),false);assert.equal(canSpendOffense(2,2,1),true);assert.equal(canSpendOffense(1000,2,1),true);assert.equal(canSpendOffense(1,3,1),true);assert.equal(canSpendOffense(0,3,1),false);assert.equal(canSpendOffense(1,2,0),true);
 assert.deepEqual(objectiveOrder('key-first').slice(0,2),['key','box0']);assert.deepEqual(objectiveOrder('box-first').slice(0,2),['box0','key']);
});
test('switching pursuers never counts as player-wide recovery, and the full quiet interval is measured',()=>{
 const r=new RecoveryWindows(),enemy={...frame(0).enemies[0]};
 r.sample(frame(0,{enemies:[enemy]}));r.sample(frame(1,{enemies:[{...enemy,cue:0,dangerous:false},{...enemy,id:'reserve'}]}));r.sample(frame(4,{enemies:[{...enemy,id:'reserve'}]}));assert.equal(r.export(4).windows.length,0);
 const quiet=t=>frame(t,{enemies:[{...enemy,cue:0,dangerous:false}]});r.sample(quiet(5));r.sample(quiet(7));assert.equal(r.export(7).open.duration,2);r.sample(frame(7.05));assert.ok(Math.abs(r.windows[0].duration-2.05)<1e-8);assert.equal(r.windows[0].censored,false);
});
test('nearby danger and stun retaining a clue do not qualify as full recovery',()=>{
 const r=new RecoveryWindows();r.sample(frame(0));r.sample(frame(1,{enemies:[{...frame(1).enemies[0],mode:'stunned'}]}));assert.equal(r.export(4).open,null);r.sample(frame(5,{enemies:[{...frame(5).enemies[0],cue:0,mode:'patrol'}]}));assert.equal(r.export(9).open,null);
});
test('reports cannot compare different metric definitions',()=>{
 const t=new Telemetry({});t.sample(frame(0));t.finish('timeout',1);const run={meta:{scenario:'campaign',night:1,seed:0,policy:'ordinary',split:'calibration',policyVersion:2,seconds:60},trace:t.export()};assert.throws(()=>compareRuns([{...run,trace:{...run.trace,metricsVersion:1}}],[run]),/Incompatible/);
});
import {weeperResponse} from '../scripts/balance/policy.mjs';
import {SprintPlan,quietHasPriority,RouteLoops,PrimaryCounters} from '../scripts/balance/policy.mjs';
import {Stamina} from '../src/runtime/pacing.ts';
const responseOptions={flashlightOn:true,flashes:2,fuses:0,reserve:0,items:'both'};
test('quiet weeper calls for darkness and walking; visible wind-up gets a flash before generic item choices',()=>{
 const idle={kind:'weeper',mode:'idle',dangerous:false,gap:130,position:{x:10,y:10}};
 assert.deepEqual(weeperResponse([idle],responseOptions),{weeper:idle,quiet:true,turnOff:true,flash:false});
 for(const mode of ['warning','chase','dash']){const r=weeperResponse([{...idle,mode,dangerous:true}],responseOptions);assert.equal(r.flash,true);assert.equal(r.quiet,false);}
 assert.deepEqual(weeperResponse([{...idle,mode:'stunned'}],responseOptions),{weeper:{...idle,mode:'stunned'},quiet:false,turnOff:true,flash:false});
});
test('weeper response cannot use hidden observations, unavailable flashes, or repeat a just-issued interrupt',()=>{
 const awake={kind:'weeper',mode:'dash',dangerous:true,gap:90};
 assert.equal(weeperResponse([],responseOptions).flash,false);
 for(const extra of [{flashes:0},{items:'none'},{items:'decoy'},{flashes:1,reserve:1},{emergencyReady:false}])assert.equal(weeperResponse([awake],{...responseOptions,...extra}).flash,false);
 assert.equal(weeperResponse([{...awake,gap:200}],responseOptions).flash,false);
 assert.equal(weeperResponse([awake],{...responseOptions,flashes:1,reserve:1,fuses:3}).flash,true);
});
test('burst policy permits real stamina recovery between sustained sprints',()=>{
 const stamina=new Stamina(),plan=new SprintPlan(),bursts=[];let start=null,peakBetween=0;
 for(let i=0;i<400;i++){
  const sprint=plan.decide(true,stamina.value,stamina.canSprint);
  if(sprint&&start===null){assert.ok(stamina.value>=60);start=i;}
  if(!sprint&&start!==null){bursts.push((i-start)*.05);start=null;}
  if(!sprint)peakBetween=Math.max(peakBetween,stamina.value);
  stamina.tick(.05,sprint);
 }
 assert.ok(bursts.length>=2);assert.ok(bursts.every(seconds=>seconds>=1.4));assert.ok(peakBetween>55);assert.equal(stamina.exhausted,false);
});
test('quiet weeper does not suppress flight from another active close threat',()=>{
 const quiet={kind:'weeper',mode:'idle',dangerous:false,gap:100},pursuer={kind:'patroller',mode:'chase',dangerous:true,gap:45};
 assert.equal(quietHasPriority(true,[quiet],'urgent'),true);
 assert.equal(quietHasPriority(true,[quiet,pursuer],'urgent'),false);
 assert.equal(quietHasPriority(true,[quiet,pursuer],'quiet'),true);
 assert.equal(quietHasPriority(true,[quiet,{...pursuer,mode:'stunned'}],'urgent'),true);
 assert.equal(quietHasPriority(true,[quiet,{...pursuer,gap:180}],'urgent'),true);
});
test('moving route loops are flagged while normal travel and nearby exit waiting are not',()=>{
 for(const scenario of ['loop','travel','waiting']){
  const t=new Telemetry({});
  for(let i=0;i<=40;i++){
   const x=scenario==='travel'?i*20:i%20<=10?(i%20)*20:(20-i%20)*20;
   t.sample(frame(i*.5,{player:{x,y:0},enemies:scenario==='waiting'?[]:frame(0).enemies,exitStartup:scenario==='waiting'?30:0,input:{navigation:{goal:scenario==='waiting'?'exit':'door',target:scenario==='waiting'?{x,y:0}:{x:600,y:0}}}}));
  }
  assert.equal(t.anomalies.some(a=>a.kind==='policy-route-loop'),scenario==='loop');
 }
 const loops=new RouteLoops();
 for(let i=0;i<500;i++)loops.sample(frame(i,{player:{x:i*10,y:0},input:{navigation:{goal:'door',target:{x:9000,y:0}}}}));
 assert.ok(loops.history.length<=41);
});
test('waiting for exit power only exempts a policy already at the exit',()=>{
 for(const x of [0,500]){
  const t=new Telemetry({});for(let i=0;i<8;i++)t.sample(frame(i,{enemies:[],fuses:3,exitStartup:20,player:{x,y:0},input:{navigation:{goal:'exit',target:{x:0,y:0}}}}));
  assert.equal(t.anomalies.some(a=>a.kind==='policy-stalled'),x===500);
 }
});
test('light counter uses a brief facing input and its own cooldown; darkness takes precedence near weepers',()=>{
 const c=new PrimaryCounters(),enemy={kind:'light-shy',mode:'chase',dangerous:true,gap:120,position:{x:20,y:0}};
 assert.ok(c.decide(0,[enemy],{battery:100}).aim);assert.equal(c.decide(.2,[enemy],{battery:100}).aim,null);assert.equal(c.decide(.2,[enemy],{battery:100}).escape,true);
 assert.equal(c.decide(5,[enemy],{battery:100}).aim,null);assert.ok(c.decide(6.3,[enemy],{battery:100}).aim);
 assert.equal(new PrimaryCounters().decide(0,[enemy],{battery:100,allowLight:false}).aim,null);
 assert.equal(new PrimaryCounters().decide(0,[enemy],{battery:0}).aim,null);
 assert.equal(new PrimaryCounters().decide(0,[],{battery:100}).aim,null);
});
test('listener quiet walking needs distance and cannot override another close danger',()=>{
 const c=new PrimaryCounters(),enemy={kind:'listener',mode:'chase',dangerous:true,gap:120};
 assert.equal(c.decide(0,[enemy],{battery:100}).listenerQuiet,true);
 assert.equal(c.decide(0,[{...enemy,gap:50}],{battery:100}).listenerQuiet,false);
 assert.equal(c.decide(0,[enemy,{...enemy,kind:'patroller',gap:40}],{battery:100}).listenerQuiet,false);
});
test('healing cannot conceal same-frame damage or damage during an item observation window',()=>{
 const t=new Telemetry({});t.sample(frame(0,{health:40}));t.sample(frame(1,{health:40,used:['F']}));
 t.sample(frame(2,{health:60,healed:40,used:['Q']}));assert.equal(t.groups.daily.damage,20);
 t.sample(frame(4,{health:60}));assert.equal(t.itemWindows[0].damage,20);
});
test('nearby controlled monsters are recorded separately, and the countdown excludes time after power-on',()=>{
 const t=new Telemetry({}),enemy={...frame(0).enemies[0],mode:'light'};
 t.sample(frame(0,{fuses:3,exitStartup:2,enemies:[enemy]}));t.sample(frame(1,{fuses:3,exitStartup:1,enemies:[enemy]}));
 assert.equal(t.groups.finale.threatSeconds,0);assert.equal(t.groups.finale.controlledSeconds,1);
 t.sample(frame(2,{fuses:3,exitStartup:0}));t.sample(frame(3,{fuses:3,exitStartup:0,health:80}));
 assert.equal(t.groups.finale.alarm.seconds,2);assert.equal(t.groups.finale.alarm.damage,0);assert.equal(t.groups.finale.damage,20);
});
test('optional searches honor progression, accessible fronts, and never prefer hidden rewards',()=>{
 const features=[{id:'empty',kind:'cache',x:20,y:0,width:20,height:20,hasLoot:false},{id:'full',kind:'cache',x:80,y:0,width:20,height:20,hasLoot:true},{id:'locked',kind:'empty-task',x:200,y:0,width:20,height:20}];
 const input={features,opened:new Set(),player:{x:0,y:0},fuses:1,door:false,visible:()=>true,path:p=>p.x>200?[]:[p]};
 const p=new OptionalSearchPlan('all');assert.equal(p.select({...input,fuses:0}),null);assert.equal(p.select(input).id,'empty');
 input.opened.add('empty');assert.equal(p.select(input).id,'full');input.opened.add('full');assert.equal(p.select(input),null);
 assert.equal(p.select({...input,door:true,path:p=>[p]}).id,'locked');assert.equal(p.select({...input,fuses:3}),null);
 assert.equal(new OptionalSearchPlan('nearby').select({...input,visible:()=>false}),null);
});
test('search and loot accounting stays separate from progression and consumption',()=>{
 const t=new Telemetry({});t.sample(frame(0,{searches:{cabinets:0,empty:0}}));
 t.sample(frame(1,{searches:{cabinets:1,empty:0},gained:{F:1},used:['F']}));
 t.sample(frame(2,{searches:{cabinets:1,empty:1}}));t.sample(frame(3,{searches:{cabinets:1,empty:1}}));
 assert.deepEqual(t.groups.daily.searches,{cabinets:1,empty:1,loot:{F:1,R:0,Q:0}});assert.equal(t.groups.daily.items.F,1);assert.equal(t.groups.finale,undefined);
});
test('exit waiting chooses a reachable escape and releases it when power arrives',()=>{
 const plan=new ExitWaitPlan(),input={player:{x:100,y:100},exit:{x:100,y:100},remaining:20,threats:[{position:{x:150,y:100},gap:50}],path:p=>[p],occluded:()=>false};
 const next=plan.select(input);assert.ok(next&&next.x<100,'move away from the pursuer instead of standing on the exit');
 assert.equal(plan.select({...input,remaining:0}),null);assert.equal(new ExitWaitPlan().select({...input,threats:[]}),null);
});
test('standing under attack at an unpowered exit is a policy stall, not an exemption',()=>{
 const t=new Telemetry({});for(let i=0;i<8;i++)t.sample(frame(i,{fuses:3,exitStartup:20,player:{x:0,y:0},input:{navigation:{goal:'exit',target:{x:0,y:0}}}}));
 assert.ok(t.anomalies.some(a=>a.kind==='policy-stalled'));
});

import {searchCoverageIssues} from '../scripts/balance/search-policy.mjs';
test('full navigation searches fail when a container or guaranteed reward was silently skipped',()=>{
 const trace={result:{outcome:'won'},content:{cabinets:5,empty:2,rewards:2},groups:{daily:{searches:{cabinets:5,empty:2,loot:{F:1,R:0,Q:1}}}}};
 assert.deepEqual(searchCoverageIssues(trace),[]);
 const missing=structuredClone(trace);missing.groups.daily.searches.cabinets=4;missing.groups.daily.searches.loot.Q=0;
 assert.deepEqual(searchCoverageIssues(missing),['cabinets: reached 4, expected 5','loot: reached 1, expected 2']);
 trace.result.outcome='timeout';assert.deepEqual(searchCoverageIssues(trace),['Full search did not finish']);
});

test('actual actor attribution survives same-frame healing and multi-target flash without inventing full escape',()=>{
 const t=new Telemetry({});t.sample(frame(0));t.sample(frame(.1,{health:100,healed:20,actorEvents:[{type:'damage-source',id:'reserve-0',kind:'patroller',amount:20},{type:'control-hit',id:'primary',kind:'listener',sourceId:'flash-1',effect:'flash'},{type:'control-hit',id:'reserve-0',kind:'patroller',sourceId:'flash-1',effect:'flash'}]}));
 assert.equal(t.groups.daily.damageByActor['reserve-0'],20);assert.deepEqual(t.groups.daily.controlHits.map(h=>h.id),['primary','reserve-0']);
 t.sample(frame(.6,{enemies:[{...frame(.6).enemies[0],mode:'recovery'}]}));assert.ok(t.groups.daily.attackRecoverySeconds>=.5);assert.equal(t.recovery.export(.6).open,null);assert.equal(t.groups.daily.escapes.length,0);
});
