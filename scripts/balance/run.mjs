import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {resolve,dirname} from 'node:path';
import {policyVersion} from './policy.mjs';
import {metricsVersion} from './recovery.mjs';
import {compareRuns,markdown} from './report.mjs';
import {searchCoverageIssues} from './search-policy.mjs';
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){if(!args[i].startsWith('--'))throw Error('Expected option: '+args[i]);const name=args[i].slice(2);if(['render','strict','allow-version-mismatch'].includes(name))opts[name]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value '+name);opts[name]=args[++i];}}
for(const key of Object.keys(opts))if(!['render','strict','allow-version-mismatch','nights','seeds','policies','seconds','scenario','items','out','replay','compare','split','reserve','route','weeper-aware','movement','stamina','mixed','counters','searches'].includes(key))throw Error('Unknown option '+key);
const list=(value,fallback)=>String(value??fallback).split(',');const integers=(value,fallback,max)=>list(value,fallback).map(v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>max)throw Error('Invalid number '+v);return n;});
const root=process.cwd(),out=resolve(opts.out??'output/balance/latest');mkdirSync(out,{recursive:true});
const sourceFiles=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','game','scripts/balance'],{encoding:'utf8'}).trim().split('\n').sort();
const tracked=sourceFiles();
// Include the harness even on an uncommitted first run.
for(const file of ['scripts/balance/run.mjs','scripts/balance/browser-harness.mjs','scripts/balance/telemetry.mjs','scripts/balance/report.mjs','scripts/balance/vite.config.mjs','scripts/balance/policy.mjs','scripts/balance/recovery.mjs'])if(!tracked.includes(file))tracked.push(file);
const hash=createHash('sha256');for(const file of tracked.sort()){hash.update(file);hash.update(readFileSync(file));}
const code={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fingerprint:hash.digest('hex'),dirty:!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim()};
// Keep dirty source recoverable after a later tuning pass. A hash by itself is
// insufficient to reconstruct the code that produced a baseline replay.
for(const file of [...tracked,'package.json','package-lock.json']){const target=resolve(out,'source',file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(file));}
writeFileSync(resolve(out,'source-files.json'),JSON.stringify({code,files:tracked},null,2));
const replay=opts.replay?JSON.parse(readFileSync(opts.replay,'utf8')):null;
if(replay&&replay.meta.code.fingerprint!==code.fingerprint&&!opts['allow-version-mismatch'])throw Error('Replay code fingerprint differs; use the original checkout, or --allow-version-mismatch for a diagnostic divergence run');
const scenarios=list(opts.scenario,'campaign');if(scenarios.some(s=>!['campaign','finale','navigation'].includes(s)))throw Error('Unknown scenario');
const policies=list(opts.policies,'ordinary');if(policies.some(p=>!['conservative','ordinary','practiced'].includes(p)))throw Error('Unknown policy');
const seconds=Number(opts.seconds??180);if(!Number.isFinite(seconds)||seconds<=0||seconds>600)throw Error('seconds must be 0 < n <= 600');
const nights=integers(opts.nights,'1,3,5,7',1000000);if(nights.includes(0))throw Error('night starts at 1');
const split=opts.split??'calibration';if(!['calibration','holdout'].includes(split))throw Error('Invalid split');
const seeds=integers(opts.seeds,split==='holdout'?'101,137':'0',4294967295);if(split==='holdout'&&seeds.some(s=>s<100)||split==='calibration'&&seeds.some(s=>s>=100))throw Error('Reserve seeds >=100 for holdout, seeds <100 for calibration');
const items=opts.items??'both';if(!['both','none','flash','decoy'].includes(items))throw Error('Invalid items');
const reserve=Number(opts.reserve??0);if(![0,1].includes(reserve))throw Error('reserve must be 0 or 1');const route=opts.route??'key-first';if(!['key-first','box-first'].includes(route))throw Error('Unknown route');
const aware=opts['weeper-aware']??'on';if(!['on','off'].includes(aware))throw Error('weeper-aware must be on or off');const weeperAware=aware==='on';
const movement=opts.movement??'route',staminaMode=opts.stamina??'burst',mixed=opts.mixed??'quiet';
if(!['legacy','route'].includes(movement)||!['pulse','burst'].includes(staminaMode)||!['quiet','urgent'].includes(mixed))throw Error('Invalid movement, stamina, or mixed policy');
const counterSetting=opts.counters??'on';if(!['on','off'].includes(counterSetting))throw Error('counters must be on or off');const counters=counterSetting==='on';
const searches=opts.searches??'off';if(!['off','nearby','all'].includes(searches))throw Error('Invalid searches policy');
const cases=replay?[replay.meta]:scenarios.flatMap(scenario=>nights.flatMap(night=>seeds.flatMap(seed=>policies.map(policy=>({scenario,night,seed,policy,split,items,seconds,policyVersion,metricsVersion,reserve,route,weeperAware,movement,staminaMode,mixed,counters,searches,layoutKind:night===1?'fixed':'seeded',code})))));
let server,browser;const runs=[];
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await browser?.close();server?.kill('SIGTERM');process.exit(130);});
try{
 const net=createServer();await new Promise(r=>net.listen(0,'127.0.0.1',r));const port=net.address().port;await new Promise(r=>net.close(r));
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/balance/vite.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
 let serverOutput='';server.stdout.on('data',b=>serverOutput+=b);server.stderr.on('data',b=>serverOutput+=b);
 const base=`http://127.0.0.1:${port}`;let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(serverOutput);try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('Vite startup timeout');
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const meta of cases){
  console.log('Starting',meta.scenario,meta.night,meta.seed,meta.policy);
  const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const caseTimer=setTimeout(()=>context.close().catch(()=>{}),120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(({night,seed})=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:Math.max(7,night)}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night,seed}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));},meta);
   await page.goto(base+'/?playtest=balance&balance=1');await page.locator('#start:enabled').waitFor();
   // The saved current night opens its actual ledger page, including endless nights.
   await page.locator(`[data-night="${meta.night}"]`).click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
   const actual=await page.evaluate(()=>({night:window.__nightshiftScene.round,seed:window.__nightshiftScene.mapSeed}));
   if(actual.night!==meta.night||actual.seed!==meta.seed)throw Error('Scene did not start the requested night/seed: '+JSON.stringify(actual));
   await page.evaluate(async({meta,render})=>{const {createHarness}=await import('/scripts/balance/browser-harness.mjs');window.__balance=createHarness(window.__nightshiftScene,meta,{render});}, {meta,render:!!opts.render});
   const tape=[],hashes=[];const limit=replay?replay.tape.length:Math.ceil(meta.seconds*20);
   for(let i=0;i<limit;i+=100){const batch=await page.evaluate(({inputs,count})=>{const h=window.__balance,frames=[];for(let j=0;j<count&&!h.done;j++){const input=inputs?inputs[j]:h.inputForPolicy();frames.push({input,hash:h.advance(input)});}return {frames,done:h.done};},{inputs:replay?replay.tape.slice(i,i+100):null,count:Math.min(100,limit-i)});
    for(const frame of batch.frames){tape.push(frame.input);hashes.push(frame.hash);}if(batch.done)break;
   }
   const trace=await page.evaluate(()=>window.__balance.finish());if(errors.length)throw Error(errors.join('\n'));
   if(replay){const index=hashes.findIndex((h,i)=>h!==replay.hashes[i]);if(index>=0||hashes.length!==replay.hashes.length){writeFileSync(resolve(out,'divergence.json'),JSON.stringify({meta,step:index>=0?index:hashes.length,trace,hashes},null,2));throw Error(`Replay diverged at step ${index>=0?index:hashes.length}; inspect ${resolve(out,'divergence.json')}`);};console.log('Replay identical:',hashes.length,'steps');}
   const name=[meta.scenario,meta.night,meta.seed,meta.policy,meta.items,meta.route,'reserve'+meta.reserve,meta.weeperAware?'aware':'generic',meta.movement,meta.staminaMode,meta.mixed,meta.counters===false?'basic':'counters','search-'+(meta.searches??'off')].filter(v=>v!==undefined&&v!==null).join('-');const file=resolve(out,name+'.json');writeFileSync(file,JSON.stringify({schema:1,meta,tape,hashes,trace}));runs.push({meta,trace,replay:file});trace.anomalies.forEach((diagnostic,i)=>writeFileSync(resolve(out,name+'-anomaly-'+i+'.json'),JSON.stringify({meta,replay:file,diagnostic},null,2)));
   console.log(name,trace.result.outcome,trace.result.time.toFixed(1)+'s','flags='+trace.anomalies.length);
   if(meta.scenario==='navigation'&&meta.searches==='all'){const issues=searchCoverageIssues(trace);if(issues.length)throw Error('Optional container coverage failed: '+issues.join('; '));}
  }finally{clearTimeout(caseTimer);await context.close();}
 }
 if(JSON.stringify(sourceFiles())!==JSON.stringify(tracked))throw Error('Source file list changed while benchmark was running; discard mixed-version results and retry');
 const finalHash=createHash('sha256');for(const file of tracked){finalHash.update(file);finalHash.update(readFileSync(file));}if(finalHash.digest('hex')!==code.fingerprint)throw Error('Source changed while benchmark was running; discard mixed-version results and retry');
 const report={schema:1,code,environment:{node:process.version,platform:process.platform,browser:browser.version(),viewport:{width:1280,height:800},fixedStepMs:50,concurrency:1},runs};if(opts.compare)report.comparison=compareRuns(JSON.parse(readFileSync(opts.compare,'utf8')).runs,runs);
 writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));writeFileSync(resolve(out,'report.md'),markdown(report));console.log('Report:',resolve(out,'report.md'));
 if(opts.strict&&runs.some(r=>r.trace.anomalies.length))process.exitCode=1;
}finally{await browser?.close();server?.kill('SIGTERM');}
