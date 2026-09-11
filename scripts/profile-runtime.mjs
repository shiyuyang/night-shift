// Replay one fixed simulation step per RAF, with actual rendering and Chrome CPU sampling.
// Update timings exclude the offline policy, telemetry hashing and asynchronous GPU work.
import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {basename} from 'node:path';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),replays=[];let out='output/runtime-profile/latest';
for(let i=0;i<args.length;i++){if(args[i]==='--replay'&&args[i+1])replays.push(args[++i]);else if(args[i]==='--out'&&args[i+1])out=args[++i];else throw Error('Expected --replay FILE or --out DIR');}
if(!replays.length)throw Error('Pass at least one balance replay with --replay FILE');
mkdirSync(out,{recursive:true});
const code={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),patch:execFileSync('git',['diff','HEAD'],{encoding:'utf8'})};
writeFileSync(out+'/source.patch',code.patch);
const sourceFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','game','scripts/balance'],{encoding:'utf8'}).trim().split('\n');
const source=Object.fromEntries(sourceFiles.map(file=>[file,readFileSync(file,'utf8')]));writeFileSync(out+'/source.json',JSON.stringify(source));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const replay of replays){
  const tape=JSON.parse(readFileSync(replay)),night=tape.meta.night,name=basename(replay,'.json');
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({night,seed})=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:Math.max(7,night)}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night,seed}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));},{night,seed:tape.meta.seed});
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=balance&balance=1');await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  await page.evaluate(async({meta,tape})=>{
   const {createHarness}=await import('/scripts/balance/browser-harness.mjs');const s=window.__nightshiftScene;
   if(s.round!==meta.night||s.mapSeed!==meta.seed)throw Error('wrong scene');
   const h=createHarness(s,meta,{render:true}),frames=[],calls={};let current=null;
   function wrap(owner,key,label=key){const original=owner[key];owner[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-t;(calls[label]??=[]).push(ms);if(current)(current.work[label]??=[]).push(ms);}};}
   for(const key of ['update','command','interact','prepareDistractions','updateDoor','updateExitPatrolPoints','updateWeeper','updateReinforcement','light','draw'])wrap(s,key);
   wrap(s.dailyPatrol,'tick','dailyPatrol');wrap(s.pursuitSearch,'tick','pursuitSearch');wrap(s.boxBlink,'request','boxBlink');
   window.__profile={s,h,frames,calls,tape,step:0,last:0};
   window.__profile.run=()=>new Promise((resolve,reject)=>{function frame(time){try{const q=window.__profile;if(h.done||q.step>=tape.length){resolve();return;}const start=performance.now();current={step:q.step,elapsed:s.state.elapsed,dt:q.last?time-q.last:0,fuses:s.state.fuses,work:{}};q.last=time;
    const hash=h.advance(tape[q.step++]);current.ms=performance.now()-start;current.hash=hash;frames.push(current);current=null;requestAnimationFrame(frame);
   }catch(error){current=null;reject(error);}}requestAnimationFrame(frame);});
  },{meta:tape.meta,tape:tape.tape});
  const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
  await page.evaluate(()=>window.__profile.run());
  const {profile}=await cdp.send('Profiler.stop');writeFileSync(`${out}/${name}.cpuprofile`,JSON.stringify(profile));
  const result=await page.evaluate(()=>{const q=window.__profile;return {frames:q.frames,calls:q.calls};});
  const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]??0;
  const stats=a=>({count:a.length,p50:percentile(a,.5),p95:percentile(a,.95),p99:percentile(a,.99),max:Math.max(...a),total:a.reduce((x,y)=>x+y,0)});
  const hashes=result.frames.map(f=>f.hash),same=hashes.length===tape.hashes.length&&hashes.every((h,i)=>h===tape.hashes[i]);
  const summary={night,seed:tape.meta.seed,replay,commit:code.commit,browser:browser.version(),node:process.version,platform:process.platform,fixedStepMs:50,render:true,errors,replayIdentical:same,update:stats(result.calls.update),renderedFrame:stats(result.frames.map(f=>f.ms)),raf:stats(result.frames.slice(1).map(f=>f.dt)),methods:Object.fromEntries(Object.entries(result.calls).map(([k,v])=>[k,stats(v)])),longFrames:result.frames.filter(f=>f.work.update?.[0]>16.7).map(f=>({...f,work:Object.fromEntries(Object.entries(f.work).map(([k,v])=>[k,+v.reduce((a,b)=>a+b,0).toFixed(2)]))})).sort((a,b)=>b.ms-a.ms).slice(0,12)};
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),totals=new Map();for(let i=0;i<(profile.samples?.length??0);i++){const n=nodes.get(profile.samples[i]),key=n.callFrame.functionName+' '+n.callFrame.url;totals.set(key,(totals.get(key)??0)+(profile.timeDeltas[i]??0));}
  summary.cpu=Array.from(totals,([functionName,us])=>({functionName,ms:us/1000})).sort((a,b)=>b.ms-a.ms).slice(0,20);
  writeFileSync(`${out}/${name}.json`,JSON.stringify({summary,...result},null,2));console.log(JSON.stringify({night,seed:tape.meta.seed,replayIdentical:same,update:summary.update,renderedFrame:summary.renderedFrame,raf:summary.raf,out}));
  assert.deepEqual(errors,[]);assert.equal(same,true,'Runtime replay diverged; inspect the per-step hashes before interpreting performance');await context.close();
 }
for(const [file,text]of Object.entries(source))assert.equal(readFileSync(file,'utf8'),text,'Source changed during profiling: '+file);
}finally{await browser.close();}
