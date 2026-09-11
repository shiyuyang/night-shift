import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';

// Isolated encounters in the authored ward, using the production scene, input,
// collision, stamina and items. These are mechanism tests, not campaign wins.
const out=resolve(process.env.FOCUS_OUT??'output/balance/listener-light-focus/mechanics');
const finale=process.env.FOCUS_STAGE==='finale';
mkdirSync(out,{recursive:true});
const sources=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','game','scripts/balance'],{encoding:'utf8'}).trim().split('\n').sort();
sources.push('tests/listener-light-focus.browser.mjs');
const hash=createHash('sha256');
for(const file of sources){const data=readFileSync(file),target=resolve(out,'source',file);hash.update(file).update(data);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data);}
const sourceFingerprint=hash.digest('hex'),results=[],failures=[];
const cases=[
 ['listener','quiet-far',4],['listener','walk-near',1],['listener','sprint',3],
 ['listener','sprint-then-quiet',4.5],['listener','flash-walk',4],['listener','flash-sprint',3],
 ['listener','decoy',9],['listener','wall',0],['listener','far-decoy',.5],
 ['light-shy','bare-escape',3],['light-shy','light-escape',3],['light-shy','empty-battery',3],
 ['light-shy','hold-light',5.5],['light-shy','toggle-light',5.5],
 ['light-shy','flash-walk',4],['light-shy','decoy',2],
 ['light-shy','range-full',.05],['light-shy','range-low',.05],['light-shy','wall',0],['light-shy','far-decoy',.5],
];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('night-shift-language-v1','zh-Hans');
  localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));
  localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:1,seed:0}));
 });
 for(const [kind,mode,seconds] of cases){
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');
  await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const result=await page.evaluate(async({kind,mode,seconds,finale})=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs');
   const {monsterFeetAt,overlaps}=await import('/src/collision.ts');
   const {patrolPath}=await import('/src/patrol.ts');
   const s=window.__nightshiftScene;
   const h=createHarness(s,{scenario:'campaign',night:1,seed:0,policy:'ordinary',items:'both',reserve:0,route:'key-first',weeperAware:true,counters:true});
   s.round=6;s.rules={...s.rules,threat:kind};s.weeper=undefined;s.rogue.features=[];s.updateReinforcement=()=>{};
   s.state.fuses=1;s.state.health=100;s.state.elapsed=0;s.cooldown=999;s.flashlightOn=false;s.state.battery=100;
   if(finale){s.state.fuses=3;s.opened=[true,true,true];s.door=true;s.exitStartup=10;s.boxBlink.used=true;}
   s.player.setPosition(500,414);
   const far=['quiet-far','sprint','sprint-then-quiet'].includes(mode);
   s.ghost.setPosition(far?380:kind==='listener'?460:420,414);s.ghostTime=30;s.ghostDelay=0;
   s.stun=0;s.protection=0;s.hit=0;s.lure=0;s.memory=far||mode==='walk-near'?0:3;
   s.lastKnown={x:s.memory?500:s.ghost.x,y:414};s.route=[];s.routeTimer=0;s.sightLock.reset();s.pursuitSearch.reset();
   if(mode==='wall'){
    const solids=s.monsterSolids(),bounds=s.level.bounds;
    const free=p=>p.x>bounds.x+20&&p.x<bounds.x+bounds.width-20&&p.y>bounds.y+20&&p.y<bounds.y+bounds.height-20&&!solids.some(w=>overlaps(monsterFeetAt(p.x,p.y),w));
    let pair;
    for(const wall of solids){
     const candidates=wall.height>wall.width?
      Array.from({length:Math.ceil(wall.height/30)},(_,i)=>[{x:wall.x-30,y:wall.y+i*30},{x:wall.x+wall.width+30,y:wall.y+i*30}]):
      Array.from({length:Math.ceil(wall.width/30)},(_,i)=>[{x:wall.x+i*30,y:wall.y-40},{x:wall.x+i*30,y:wall.y+wall.height+25}]);
     for(const [a,b] of candidates){if(!free(a)||!free(b)||Math.hypot(a.x-b.x,a.y-b.y)>180||s.canSee(a,b))continue;
      const path=patrolPath(a,b,solids,bounds,monsterFeetAt);let length=0,previous=a;for(const point of path){length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
      if(path.length&&Math.hypot(path.at(-1).x-b.x,path.at(-1).y-b.y)<30&&length>300){pair={a,b,length};break;}
     }if(pair)break;
    }
    if(!pair)throw Error('No legal occluded wall fixture');
    s.player.setPosition(pair.b.x,pair.b.y);s.ghost.setPosition(pair.a.x,pair.a.y);s.memory=0;s.lastKnown={...pair.a};
    const observations=[];
    for(const source of ['walk','sprint','event']){s.hear(3,source==='walk',source==='sprint');observations.push({source,...s.balanceCue,clue:{...s.lastKnown}});}
    s.memory=0;s.lastKnown={...pair.a};s.flashlightOn=true;s.angle=Math.atan2(pair.a.y-pair.b.y,pair.a.x-pair.b.x);
    const flashes=s.flashes;h.advance({keys:[],sprint:false,items:['F']});
    h.advance({keys:[],sprint:false,items:['R']});
    return {kind,mode,pair,observations,decoyHeard:s.distractionResponse.heard,stun:s.stun,lightRecovery:s.lightFear.recovery,flashesSpent:flashes-s.flashes,health:s.state.health};
   }
   if(mode==='empty-battery')s.state.battery=0;
   if(mode.startsWith('range-')){s.ghost.setPosition(280,414);if(mode==='range-low')s.state.battery=10;}
   let normalEventAccepted=null;
   if(mode==='far-decoy'){s.player.setPosition(800,414);s.ghost.setPosition(300,414);s.memory=0;s.lastKnown={x:300,y:414};s.hear(3);normalEventAccepted=s.balanceCue.accepted;}
   const samples=[],inputs=[],hashes=[];let refresh=null;
   for(let i=0;i<Math.round(seconds*20)&&!h.done;i++){
    let keys=['D'],sprint=false,items=[];
    if(mode==='sprint'||mode==='flash-sprint'||mode==='sprint-then-quiet'&&i<12)sprint=true;
    if(mode.startsWith('flash-')&&i===0)items=['F'];
    if(mode==='decoy'){if(i===0)items=['R'];if(i>=40)keys=[];}
    if(mode==='far-decoy'){keys=[];if(i===0)items=['R'];}
    if(['light-escape','empty-battery','hold-light','toggle-light','range-full','range-low'].includes(mode)){
     if(i===0){keys=['A'];items=['T'];}
     else if(mode==='hold-light'||mode==='toggle-light'||mode.startsWith('range-'))keys=[];
     else sprint=true;
     if(mode==='toggle-light'&&i>0&&i%4===0)items=['T'];
    }
    if(mode==='bare-escape')sprint=i>0;
    const input={keys,sprint,items};inputs.push(input);hashes.push(h.advance(input));
    samples.push({time:s.state.elapsed,health:s.state.health,player:{x:s.player.x,y:s.player.y},ghost:{x:s.ghost.x,y:s.ghost.y},gap:Math.hypot(s.player.x-s.ghost.x,s.player.y-s.ghost.y),stamina:s.stamina.value,memory:s.memory,clue:{...s.lastKnown},mode:s.balanceDecision.mode,target:s.balanceDecision.target,stun:s.stun,hesitation:s.distractionResponse.hesitation,lightRecovery:s.lightFear.recovery,lightCooldown:s.lightFear.cooldown,lure:s.lure});
   }
   if(kind==='listener'&&mode==='decoy'){
    s.hear(3);refresh={accepted:s.balanceCue.accepted,clue:{...s.lastKnown},player:{x:s.player.x,y:s.player.y}};
    h.advance({keys:[],sprint:false,items:[]});refresh.mode=s.balanceDecision.mode;
   }
   return {kind,mode,seconds,speed:s.pursuitSpeed,health:s.state.health,inventory:{F:s.flashes,R:s.decoys},samples,inputs,hashes,events:h.trace.events,refresh,normalEventAccepted};
  },{kind,mode,seconds,finale});
  results.push(result);
  console.log(kind,mode,JSON.stringify(result.samples?{health:result.health,endGap:result.samples.at(-1).gap,heard:result.events.filter(e=>e.type==='cue'&&e.accepted).length}:result));
 }
 const get=(kind,mode)=>results.find(r=>r.kind===kind&&r.mode===mode);
 const check=(name,fn)=>{try{fn();}catch(e){failures.push({name,error:e.message});}};
 const heard=(r,source)=>r.events.filter(e=>e.type==='cue'&&e.accepted&&(!source||e.source===source));
 check('listener quiet walking and normal nearby footsteps',()=>{
  const far=get('listener','quiet-far'),near=get('listener','walk-near');assert.equal(heard(far).length,0);assert.equal(far.health,100);assert.ok(heard(near,'walk').length>0);
 });
 check('listener noisy pursuit loses the moving player after quiet separation',()=>{
  const running=get('listener','sprint'),quiet=get('listener','sprint-then-quiet');assert.ok(heard(running,'sprint').length>0);assert.ok(heard(quiet,'sprint').length>0);assert.equal(heard(quiet,'walk').length,0);assert.equal(quiet.samples.at(-1).memory,0);assert.ok(Math.hypot(quiet.samples.at(-1).player.x-quiet.samples.at(-1).clue.x,quiet.samples.at(-1).player.y-quiet.samples.at(-1).clue.y)>150);
 });
 check('listener flash provides a real walk escape and only temporary deafness',()=>{
  const quiet=get('listener','flash-walk'),run=get('listener','flash-sprint');assert.equal(quiet.inventory.F,3);assert.equal(quiet.health,100);assert.ok(quiet.samples.at(-1).gap>150);assert.equal(heard(quiet).length,0);
  // Movement noise is processed before F in its activation frame; F must erase
  // that cue, then reject sounds until its actual stun ends.
  assert.equal(run.samples[0].memory,0);assert.ok(run.samples[0].stun>0);assert.equal(heard(run).some(e=>e.time>.051&&e.time<1),false);assert.ok(heard(run,'sprint').some(e=>e.time>=1));
 });
 check('listener decoy diverts the actor then fresh sound reacquires',()=>{
  const r=get('listener','decoy'),held=r.samples.filter(s=>s.time>=2&&s.time<7.8);assert.ok(held.length>50);assert.ok(held.every(s=>s.mode==='distraction'));assert.equal(r.health,100);assert.equal(r.refresh.accepted,true);assert.deepEqual(r.refresh.clue,r.refresh.player);assert.equal(r.refresh.mode,'chase');
 });
 check('walls preserve auditory and visual differences and block flash',()=>{
  for(const kind of ['listener','light-shy']){const r=get(kind,'wall');assert.equal(r.observations[0].accepted,false);for(const sample of r.observations.slice(1))assert.equal(sample.accepted,kind==='listener');assert.equal(r.stun,0);assert.equal(r.lightRecovery,0);assert.equal(r.flashesSpent,1);assert.equal(r.decoyHeard,kind==='listener');assert.equal(r.health,100);}
 });
 check('light recoil grants turn-and-run distance with normal stamina',()=>{
  const light=get('light-shy','light-escape'),bare=get('light-shy','bare-escape'),empty=get('light-shy','empty-battery');assert.ok(light.samples[1].lightRecovery>2.5);assert.ok(light.samples.at(-1).gap>bare.samples.at(-1).gap+150);assert.equal(light.health,100);assert.ok(light.samples.at(-1).stamina<100);assert.ok(empty.samples.every(s=>s.lightRecovery===0));
 });
 check('holding or toggling light cannot indefinitely extend first suppression',()=>{
  for(const mode of ['hold-light','toggle-light']){const r=get('light-shy',mode);assert.ok(r.samples[0].lightRecovery>3);assert.ok(r.samples.filter(s=>s.time>3.5).every(s=>s.lightRecovery===0));assert.ok(Math.hypot(r.samples.at(-1).ghost.x-r.samples[70].ghost.x,r.samples.at(-1).ghost.y-r.samples[70].ghost.y)>20);}
 });
 check('light-shy flash and decoy have distinct usable durations',()=>{
  const flash=get('light-shy','flash-walk'),decoy=get('light-shy','decoy');assert.equal(flash.health,100);assert.ok(flash.samples.find(s=>s.time>=3.5).stun>0);assert.ok(decoy.samples[0].hesitation>0);assert.equal(decoy.samples.find(s=>s.time>=.8).hesitation,0);assert.ok(Math.hypot(decoy.samples.at(-1).ghost.x-decoy.samples[16].ghost.x,decoy.samples.at(-1).ghost.y-decoy.samples[16].ghost.y)>20);
 });
 check('low battery reduces effective reach in the real scene',()=>{assert.ok(get('light-shy','range-full').samples[0].lightRecovery>0);assert.equal(get('light-shy','range-low').samples[0].lightRecovery,0);});
 check('far decoys cannot redirect an unheard monster',()=>{for(const kind of ['listener','light-shy']){const r=get(kind,'far-decoy');assert.equal(r.normalEventAccepted,false);assert.ok(r.samples.every(s=>s.mode!=='distraction'&&s.hesitation===0));}});
 assert.deepEqual(errors,[]);
 const finalHash=createHash('sha256');for(const file of sources)finalHash.update(file).update(readFileSync(file));assert.equal(finalHash.digest('hex'),sourceFingerprint,'Source changed during focus tests');
 const findings=results.filter(r=>r.mode==='far-decoy'&&!r.normalEventAccepted&&r.samples.some(s=>s.mode==='distraction')).map(r=>({kind:r.kind,issue:'decoy-bypasses-normal-hearing-range',initialGap:500,target:r.samples[0].target}));
 writeFileSync(resolve(out,'report.json'),JSON.stringify({fixture:true,stage:finale?'final-ten-seconds':'daily',description:'Authored ward, scripted inputs, ordinary health/stamina/items. Other actors disabled. Not campaign difficulty or human win rate. Includes decoy reception distance and wall contracts.',sourceFingerprint,results,failures,findings},null,2));
 assert.deepEqual(failures,[]);console.log('Listener/light-shy focus passed:',cases.length,'encounters, 10 behavioral checks.');
}finally{await browser.close();}
