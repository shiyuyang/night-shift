import test from 'node:test';import assert from 'node:assert/strict';
import {Weeper,weeperRules} from '../src/runtime/weeper.ts';
import {chooseWeeper,weeperExclusion} from '../src/runtime/weeper-placement.ts';
import {flashlightDrain,flashlightRemaining} from '../src/runtime/flashlight.ts';
import {makeLevel} from '../src/levels.ts';
import {monsterArchitecture,monsterFeetAt,overlaps} from '../src/collision.ts';
import {validatePlayableLevel} from '../src/runtime/level-validation.ts';
import {detectsPlayer,hearsPlayer} from '../src/run-rules.ts';
const input=(overrides={})=>({player:{x:145,y:150},hidden:false,angle:Math.PI,light:true,sprinting:false,noise:false,solids:[],architecture:[],bounds:{x:20,y:20,width:400,height:400},immune:false,...overrides});
test('silent visible player does not reveal position to listener; distant noise distinguishes pursuers',()=>{
 assert.equal(detectsPlayer('listener',40,true),false);
 for(const threat of ['patroller','light-shy']){assert.equal(detectsPlayer(threat,150,true),true);assert.equal(detectsPlayer(threat,150,false),false);}
 assert.equal(hearsPlayer('listener',220),true);assert.equal(hearsPlayer('light-shy',220),false);assert.equal(hearsPlayer('patroller',220),false);
 assert.equal(hearsPlayer('light-shy',150),true);assert.equal(hearsPlayer('patroller',150),false);assert.equal(hearsPlayer('patroller',60),true);
});
test('patient reacts to exposed disturbance at 100 units within 1.3 seconds, but still warns before attack',()=>{
 for(const disturbance of [{light:true},{light:false,sprinting:true},{light:false,noise:true}]){
  const w=new Weeper({x:100,y:150});w.grace=0;let time=0;
  while(w.phase!=='warning'&&time<1.3){assert.ok(!w.tick(.05,input({player:{x:200,y:150},...disturbance})).includes('hit'));time+=.05;}
  assert.equal(w.phase,'warning');assert.ok(w.clock>=.8);
 }
});
test('brief pauses in disturbance no longer erase anger; retreat eventually calms it',()=>{
 const w=new Weeper({x:100,y:150});w.grace=0;
 const near=input({player:{x:200,y:150}}),quiet=input({player:{x:200,y:150},light:false});
 for(let i=0;i<10;i++)w.tick(.05,near);const anger=w.anger;
 for(let i=0;i<10;i++)w.tick(.05,quiet);assert.equal(w.anger,anger);
 w.tick(0,quiet);assert.equal(w.anger,anger);
 for(let i=0;i<16&&w.phase!=='warning';i++)w.tick(.05,near);assert.equal(w.phase,'warning');
 const calm=new Weeper({x:100,y:150});calm.grace=0;calm.tick(.5,near);
 for(let i=0;i<100;i++)calm.tick(.05,input({player:{x:300,y:150},light:false}));assert.equal(calm.anger,0);assert.equal(calm.phase,'idle');
});
test('flashlight lasts 120 seconds, off stops drain, tutorial has more time',()=>{assert.ok(Math.abs(flashlightDrain(120,true,false)-100)<1e-8);assert.equal(flashlightDrain(300,false,false),0);assert.ok(Math.abs(flashlightDrain(180,true,true)-100)<1e-8);assert.equal(flashlightRemaining(100,false),120);assert.equal(flashlightRemaining(20,false),24);assert.equal(flashlightRemaining(0,false),0);});
test('standing commits the patient to hunting despite darkness, retreat, hiding or occlusion',()=>{
 const wall={x:150,y:60,width:12,height:240};
 for(const changes of [{light:false},{angle:0},{player:{x:350,y:150},light:false},{hidden:true,player:{x:100,y:250}},{player:{x:200,y:250},solids:[wall],architecture:[monsterArchitecture(wall)]}]){
  const w=new Weeper({x:100,y:150});w.grace=0;
  const near=input({player:{x:200,y:150}});
  while(w.frame!==5)w.tick(.05,near);
  assert.equal(w.phase,'alert');const anger=w.anger;
  const after=input({player:{x:200,y:150},...changes});
  w.tick(0,after);assert.equal(w.anger,anger);
  const events=[];
  for(let i=0;i<40&&!['dash','chasing'].includes(w.phase);i++)events.push(...w.tick(.05,after));
  assert.ok(['dash','chasing'].includes(w.phase));assert.equal(w.dangerous,true);assert.equal(events.filter(e=>e==='warning').length,1);
  if(changes.hidden||changes.solids||changes.player)assert.equal(w.phase,'chasing');
  else assert.equal(w.phase,'chasing');
 }
});
test('flash interrupts both committed rising and warning before a lunge can start',()=>{
 for(const phase of ['alert','warning']){
  const w=new Weeper({x:100,y:150});w.grace=0;
  const near=input({player:{x:200,y:150}});
  while(phase==='alert'?w.frame!==5:w.phase!=='warning')w.tick(.05,near);
  assert.deepEqual(w.tick(.05,{...near,flash:true}),['quiet','suppressed']);
  assert.equal(w.phase,'stunned');assert.equal(w.anger,0);
  for(let i=0;i<40;i++)assert.ok(!w.tick(.05,near).includes('dash'));
  assert.equal(w.phase,'stunned');
 }
});
test('patient warns before lunging; light through a wall cannot wake it',()=>{const w=new Weeper({x:100,y:150}),wall={x:120,y:60,width:12,height:240};for(let i=0;i<100;i++)w.tick(.05,input({solids:[wall],architecture:[monsterArchitecture(wall)]}));assert.equal(w.phase,'idle');for(let i=0;i<40&&w.phase!=='warning';i++)w.tick(.05,input());assert.equal(w.phase,'warning');assert.ok(w.clock>0);assert.ok(!w.tick(.05,input()).includes('hit'));});
test('light off and walking outside personal space safely passes patient',()=>{const w=new Weeper({x:100,y:150});for(let i=0;i<100;i++)w.tick(.05,input({player:{x:165,y:150},light:false}));assert.equal(w.phase,'idle');assert.equal(w.anger,0);});
test('flash beats a same-frame lethal impact, including a large frame delta',()=>{for(const dt of [.016,.05,.2]){const w=new Weeper({x:100,y:150});w.phase='dash';w.clock=.9;w.angle=0;const events=w.tick(dt,input({player:{x:116,y:150},flash:true}));assert.deepEqual(events,['quiet','suppressed']);assert.equal(w.phase,'stunned');assert.equal(w.clock,6);assert.equal(w.anger,0);}});
test('flash requires distance and line of sight; no aiming requirement',()=>{const w=new Weeper({x:100,y:150});w.phase='dash';assert.equal(w.flash({x:120,y:150},[{x:109,y:120,width:2,height:80}]),false);assert.equal(w.flash({x:400,y:150},[]),false);assert.equal(w.flash({x:120,y:150},[]),true);});
test('unanswered lunge kills but cannot cross a thin wall at low frame rates',()=>{const w=new Weeper({x:100,y:150});w.phase='dash';w.clock=.9;w.angle=0;assert.ok(w.tick(.4,input({player:{x:175,y:150}})).includes('hit'));
 const wall={x:135,y:90,width:4,height:140},blocked=new Weeper({x:100,y:150});blocked.phase='dash';blocked.clock=.9;blocked.angle=0;assert.ok(!blocked.tick(.4,input({player:{x:175,y:150},solids:[wall],architecture:[monsterArchitecture(wall)]})).includes('hit'));assert.ok(blocked.position.x<135);assert.ok(!overlaps(monsterFeetAt(blocked.position.x,blocked.position.y),wall));assert.equal(blocked.phase,'chasing');});
test('six seconds of suppression freezes on pause and returns physically rather than teleporting',()=>{const w=new Weeper({x:100,y:150});w.position={x:150,y:150};assert.ok(w.flash({x:180,y:150},[]));w.tick(0,input());assert.equal(w.clock,6);w.tick(5.9,input());assert.equal(w.phase,'stunned');w.tick(.2,input());assert.equal(w.phase,'returning');const before={...w.position};w.tick(.05,input());assert.ok(Math.hypot(w.position.x-before.x,w.position.y-before.y)<=48*.05+.001);});
test('fixed patient preserves bypass; roaming patients preserve base lock chain',()=>{let placements=0;for(let n=1;n<=9;n++)for(const seed of [1,2,10,42,99,8675309]){const l=makeLevel(n,seed),p=chooseWeeper(l,seed);if(n<weeperRules.firstRound)assert.equal(p,undefined);if(!p)continue;placements++;assert.ok(n===2||l.weeperSpawns.some(v=>v.x===p.x&&v.y===p.y));const f=(l.features??[]).map(v=>({x:v.x,y:v.y+8,width:v.width,height:v.height-8,kind:'crate'}));assert.equal(validatePlayableLevel({...l,props:[...l.props,...f,...(n===2?[{...weeperExclusion(p),kind:'crate'}]:[])]}).valid,true,`${n}/${seed}`);}assert.ok(placements>10,`placements ${placements}`);});

test('light-shy recoils then slows, beam flickering cannot reset the flinch cooldown',async()=>{
 const {LightFear}=await import('../src/runtime/light-fear.ts');const {lightSlows}=await import('../src/run-rules.ts');const f=new LightFear();
 assert.ok(f.tick(.016,true)<0);assert.equal(f.tick(.66,true),0);assert.equal(f.tick(.016,false),0);assert.equal(f.tick(.016,true),0);f.tick(7,false);assert.ok(f.tick(.016,true)<0);
 assert.equal(lightSlows(0,200,0,100),true);assert.equal(lightSlows(0,200,0,10),false);assert.equal(lightSlows(0,50,0,0),false);assert.equal(lightSlows(0,50,0,100,false),false);assert.equal(lightSlows(Math.PI,50,0,100),false);
});

test('patient stops crying before rising, holds a still tell and resumes only after calming',()=>{
 const w=new Weeper({x:100,y:150});w.grace=0;w.cryAt=0;
 assert.ok(w.tick(.05,input({player:{x:300,y:150},light:false})).includes('cry'));
 const cues=[];for(let i=0;i<13;i++)cues.push(...w.tick(.05,input()));
 assert.equal(w.phase,'alert');assert.ok(cues.includes('quiet'));assert.ok(w.hushed);assert.equal(w.frame,4);
 w.cryAt=0;assert.ok(!w.tick(.05,input()).includes('cry'));
 w.tick(4,input({player:{x:300,y:150},light:false}));assert.equal(w.phase,'idle');assert.equal(w.hushed,false);assert.ok(!w.tick(.1,input({player:{x:300,y:150},light:false})).includes('cry'));
});
test('flash gives a full escape window but patient remains watchful after recovering',()=>{
 const w=new Weeper({x:100,y:150});w.flash({x:150,y:150},[]);
 for(let i=0;i<59;i++)w.tick(.1,input());assert.equal(w.phase,'stunned');
 w.tick(.2,input());assert.equal(w.phase,'returning');w.tick(.1,input());assert.equal(w.phase,'idle');
 for(let i=0;i<42;i++)w.tick(.1,input({player:{x:165,y:150},light:false}));
 assert.ok(['warning','dash','stunned'].includes(w.phase),w.phase);
});

 test('quiet approach raises head without permanently silencing or attacking',()=>{
 const w=new Weeper({x:100,y:150});w.grace=0;
 assert.ok(w.tick(.1,input({player:{x:300,y:150},light:false})).includes('cry'));
 assert.ok(!w.tick(.1,input({player:{x:220,y:150},light:false})).includes('quiet'));
 w.tick(.3,input({player:{x:220,y:150},light:false}));assert.equal(w.frame,4);assert.equal(w.noticed,true);
 for(let i=0;i<100;i++)w.tick(.1,input({player:{x:220,y:150},light:false}));assert.equal(w.phase,'idle');assert.equal(w.anger,0);
 w.tick(.1,input({player:{x:300,y:150},light:false}));assert.equal(w.noticed,false);assert.equal(w.hushed,false);
 const wall={x:150,y:50,width:10,height:250};w.tick(.5,input({player:{x:220,y:150},solids:[wall]}));assert.equal(w.noticed,false);
 });

test('turning away preserves escape window without allowing repeated light to extend it',async()=>{
 const {LightFear}=await import('../src/runtime/light-fear.ts');const f=new LightFear();
 assert.equal(f.tick(.05,true),-.65);f.tick(.7,true);f.tick(.05,false);assert.equal(f.recovery,2);
 const remaining=f.recovery;f.tick(0,false);assert.equal(f.recovery,remaining);
 for(let i=0;i<30;i++)f.tick(.05,i%2===0);assert.ok(f.recovery<.6);assert.ok(f.recovery>0);
 f.tick(.3,false);assert.equal(f.loweringArms,true);assert.equal(f.tick(.3,false),1);assert.equal(f.suppressed,false);
 assert.equal(f.tick(.05,true),.28);assert.equal(f.suppressed,false);
 f.tick(7,false);assert.equal(f.tick(.05,true),-.65);
});
test('holding the beam slows but does not permanently pin or silence attacks',async()=>{
 const {LightFear}=await import('../src/runtime/light-fear.ts');const f=new LightFear();
 for(let i=0;i<200;i++)f.tick(.05,true);assert.equal(f.suppressed,false);assert.equal(f.tick(.05,true),.28);
 f.reset();assert.equal(f.recovery,0);assert.equal(f.cooldown,0);
});

test('a missed lunge resumes pursuit with no timeout; only flash releases the hunt',()=>{
 const w=new Weeper({x:100,y:150});w.phase='dash';w.clock=.1;w.angle=Math.PI;
 const distant=input({player:{x:380,y:150},light:false,immune:true});
 w.tick(.2,distant);assert.equal(w.phase,'chasing');
 let lunges=0;
 for(let i=0;i<1200;i++){
  const events=w.tick(.05,distant);if(events.includes('dash'))lunges++;
  assert.ok(['chasing','warning','dash'].includes(w.phase),w.phase);
 }
 assert.ok(lunges>=2,'keeps launching attacks after misses');
 assert.ok(w.flash(w.position,[]));assert.equal(w.phase,'stunned');
 w.tick(6.1,distant);assert.equal(w.phase,'returning');
});
test('pursuit routes around a wall and retries when a closed route opens',()=>{
 const wall={x:200,y:20,width:16,height:230};
 const w=new Weeper({x:100,y:150});w.phase='chasing';
 const target=input({player:{x:330,y:150},solids:[wall],architecture:[monsterArchitecture(wall)]});
 let lunged=false;
 for(let i=0;i<400;i++){
  const events=w.tick(.05,target);
  assert.ok(!overlaps(monsterFeetAt(w.position.x,w.position.y),wall));
  if(events.includes('dash')){lunged=true;break;}
 }
 assert.ok(lunged,'finds the route around the wall');
 const door={x:200,y:0,width:16,height:500},waiting=new Weeper({x:100,y:150});waiting.phase='chasing';
 for(let i=0;i<80;i++)waiting.tick(.25,{...target,hidden:true,solids:[door],architecture:[monsterArchitecture(door)]});
 assert.equal(waiting.phase,'chasing');assert.ok(waiting.position.x<200);
 let resumed=false;
 for(let i=0;i<200;i++)if(waiting.tick(.05,{...target,solids:[],architecture:[]}).includes('dash')){resumed=true;break;}
 assert.ok(resumed,'replans after the door opens');
});
