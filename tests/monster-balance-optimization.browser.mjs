import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='output/balance/optimization-mechanics';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:1,seed:0}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 for(const mode of ['primary-walk','primary-stand','reserve-walk','reserve-stand','door-decoy','machine','daily-gates']){
  await p.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await p.locator('#start:enabled').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
  const result=await p.evaluate(async mode=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs');const {Reinforcement}=await import('/src/runtime/reinforcement.ts');
   const s=window.__nightshiftScene,h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:'both',reserve:0,route:'key-first',weeperAware:true,counters:true},{render:true});
   s.round=3;s.rules={...s.rules,threat:'patroller'};s.weeper=undefined;s.rogue.features=[];s.state.fuses=1;s.state.health=100;s.state.elapsed=0;s.cooldown=999;s.flashlightOn=false;s.player.setPosition(500,414);s.ghost.setPosition(480,414);s.ghostTime=30;s.ghostDelay=0;s.stun=0;s.memory=3;s.lastKnown={x:500,y:414};s.route=[];s.routeTimer=0;s.protection=0;s.hit=0;s.sightLock.reset();s.pursuitSearch.reset();
   if(mode.startsWith('primary')||mode==='machine'||mode==='daily-gates')s.updateReinforcement=()=>{};
   if(mode.startsWith('reserve')){s.ghostTime=0;s.ghost.setPosition(50,50);s.reserves[0]=new Reinforcement();s.reserves[0].spawn({x:480,y:414},{x:500,y:414});}
   if(mode==='machine'){
    s.rules={...s.rules,threat:'listener'};s.rogue.features=[{id:'fixture-machine',kind:'machine',x:500,y:386,width:0,height:0,roll:0}];s.rogue.runningMachine='fixture-machine';s.rogue.machineEmission=1;s.rogue.machineTime=10;s.ghost.setPosition(100,414);s.memory=0;s.lastKnown={x:100,y:414};
    h.advance({keys:[],items:[]});const far={heard:s.distractionResponse.heard,target:s.distractionResponse.target};
    s.ghost.setPosition(400,386);h.advance({keys:[],items:[]});const near={heard:s.distractionResponse.heard,target:s.distractionResponse.target};
    h.advance({keys:[],items:[]});return {mode,far,near,repeat:s.distractionResponse.heard};
   }
   if(mode==='door-decoy'){
    s.state.fuses=3;s.opened=[true,true,true];s.exitStartup=30;s.boxBlink.used=true;s.door=false;s.rules={...s.rules,threat:'listener'};s.updateReinforcement=()=>{};
    const d=s.level.door;s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+28);s.lastKnown={x:s.player.x,y:s.player.y};s.ghost.setPosition(s.level.doorUse.x,s.level.door.y+s.level.door.height+60);s.lurePos={x:s.ghost.x+500,y:s.ghost.y};s.lure=8;s.lureSerial++;
    s.prepareDistractions(.05);s.updateDoor(.05);const far={accepted:s.distractionResponse.heard,door:!!s.doorTarget,target:s.doorTarget};
    s.lurePos={x:s.ghost.x,y:s.ghost.y};s.lureSerial++;s.prepareDistractions(.05);s.updateDoor(.05);return {mode,far,near:{accepted:s.distractionResponse.heard,door:!!s.doorTarget,target:s.distractionResponse.target}};
   }
   if(mode==='daily-gates'){
    s.ghost.setPosition(200,414);s.player.setPosition(800,414);s.memory=0;s.lastKnown={x:200,y:414};s.protection=999;
    for(let i=0;i<320;i++)h.advance({keys:[],items:[]});const early=s.dailyPatrol.elapsed;
    s.round=4;for(let i=0;i<320;i++)h.advance({keys:[],items:[]});const daily=s.dailyPatrol.elapsed,assignments=h.trace.events.filter(e=>e.type==='patrol-assignment');
    s.state.fuses=3;s.exitStartup=30;s.boxBlink.used=true;for(let i=0;i<30;i++)h.advance({keys:[],items:[]});return {mode,early,daily,finale:s.dailyPatrol.elapsed,assignments};
   }
   const samples=[],images=[];for(let i=0;i<50&&!h.done;i++){
    h.advance({keys:i>0&&mode.endsWith('walk')?['D']:[],sprint:false,items:[]});const actor=mode.startsWith('primary')?s.ghost:s.reserves[0].position,clock=mode.startsWith('primary')?s.attackRecovery:s.reserves[0].attackRecovery;
    if(mode==='primary-walk'&&[2,12].includes(i))images.push({step:i,data:s.game.canvas.toDataURL('image/png')});
    samples.push({t:s.state.elapsed,health:s.state.health,position:{x:actor.x,y:actor.y},gap:Math.hypot(actor.x-s.player.x,actor.y-s.player.y),recovery:clock.remaining,frame:mode.startsWith('primary')?s.ghost.frame.name:s.reserveSprites[0].frame.name});
   }
   return {mode,samples,images,groups:h.trace.groups};
  },mode);
  for(const shot of result.images??[])writeFileSync(out+`/recovery-${shot.step}.png`,Buffer.from(shot.data.split(',')[1],'base64'));delete result.images;results.push(result);
  if(mode.includes('-walk')||mode.includes('-stand')){
   assert.equal(result.samples[0].health,80);const start=result.samples[0].position;
   assert.ok(result.samples.filter(s=>s.t>=.1&&s.t<=.65).every(s=>Math.hypot(s.position.x-start.x,s.position.y-start.y)<.01),'attacker moves during recovery');
   assert.equal(new Set(result.samples.filter(s=>s.t>=.1&&s.t<=.65).map(s=>s.frame)).size,1);
   if(mode.endsWith('walk'))assert.ok(result.samples.find(s=>s.t>=.65).gap>55);
   else assert.ok(result.samples.at(-1).health<=60,'standing still must remain dangerous');
  }else if(mode==='machine'){assert.equal(result.far.heard,false);assert.equal(result.far.target,undefined);assert.equal(result.near.heard,true);assert.equal(result.repeat,false);}
  else if(mode==='door-decoy'){assert.equal(result.far.accepted,false);assert.equal(result.far.door,true);assert.equal(result.near.accepted,true);assert.equal(result.near.door,false);}
  else {assert.equal(result.early,0);assert.ok(result.daily>=15);assert.equal(result.finale,result.daily);assert.ok(result.assignments.length);}
  console.log('Optimization fixture passed:',mode);
  if(mode==='primary-walk')await p.screenshot({path:out+'/patroller-escape.png'});
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/report.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
