// Profile separately from builds, tests or another browser workload. CPU percentages
// are per-core process CPU time, not GPU utilization or whole-machine Task Manager %.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]??'output/idle-profile/latest',seconds=Number(process.env.PROFILE_SECONDS??10);
assert.ok(Number.isFinite(seconds)&&seconds>0,'PROFILE_SECONDS must be positive');
mkdirSync(out,{recursive:true});
const sourceFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','game'],{encoding:'utf8'}).trim().split('\n');
const source=Object.fromEntries(sourceFiles.map(file=>[file,readFileSync(file,'utf8')]));
writeFileSync(`${out}/source.patch`,execFileSync('git',['diff','HEAD','--','src','game'],{encoding:'utf8'}));
const browser=await chromium.launch({channel:'chrome',headless:true});
const browserCdp=await browser.newBrowserCDPSession(),reports=[];
const cpu=async()=>Object.fromEntries((await browserCdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>[p.id,{type:p.type,time:p.cpuTime}]));
try{
 for(const state of ['title','playing','paused','tutorial']){
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:3,seed:0}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=idle');await page.locator('#start:enabled').waitFor();
  if(state!=='title'){
   await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
   if(state==='paused')await page.keyboard.press('Escape');
   if(state==='tutorial')await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.prompt='monster-patroller';s.sync();});
  }
  await page.waitForTimeout(2500);
  const valid=await page.evaluate(state=>{const s=window.__nightshiftScene;return state==='title'?!s.active:state==='playing'?s.active&&!s.paused&&!s.tutorial.prompt:state==='paused'?s.active&&s.paused:s.active&&s.tutorial.prompt==='monster-patroller';},state);
  assert.ok(valid,'Profile fixture did not enter '+state);
  await page.evaluate(()=>{
   const s=window.__nightshiftScene,stats={};window.__idleStats=stats;window.__idleFrames=0;s.game.events.on('postrender',()=>window.__idleFrames++);
   for(const key of ['update','draw','light','sync','showGifts','drawBodyFeedback']){const original=s[key];s[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const stat=stats[key]??={count:0,ms:0,max:0};const ms=performance.now()-t;stat.count++;stat.ms+=ms;stat.max=Math.max(stat.max,ms);}};}
  });
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
  const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value])),processBefore=await cpu();
  const started=performance.now();await cdp.send('Profiler.start');await page.waitForTimeout(seconds*1000);const {profile}=await cdp.send('Profiler.stop');
  const elapsed=(performance.now()-started)/1000,processAfter=await cpu(),after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const scene=await page.evaluate(()=>{const s=window.__nightshiftScene;return {stats:window.__idleStats,renderedFrames:window.__idleFrames,enginePaused:s.game.isPaused,loopRunning:s.game.loop.running,ui:document.body.dataset.ui,paused:s.paused,active:s.active,tutorial:s.tutorial.prompt,elapsed:s.state.elapsed,health:s.state.health,fps:s.game.loop.actualFps,renderer:s.game.renderer.type,canvas:{width:s.game.canvas.width,height:s.game.canvas.height},animations:document.getAnimations().filter(a=>a.playState==='running').length};});
  const processes={};for(const [id,p]of Object.entries(processAfter)){if(processBefore[id])processes[p.type]=(processes[p.type]??0)+(p.time-processBefore[id].time)/elapsed*100;}
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),hot=new Map();for(let i=0;i<(profile.samples?.length??0);i++){const f=nodes.get(profile.samples[i]).callFrame,key=f.functionName+' '+f.url;hot.set(key,(hot.get(key)??0)+(profile.timeDeltas[i]??0));}
  const report={state,seconds:elapsed,processCpuPercentOfOneCore:processes,mainThread:Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,after[k]-before[k]])),scene,errors,hot:Array.from(hot,([name,us])=>({name,ms:us/1000})).sort((a,b)=>b.ms-a.ms).slice(0,18)};
  assert.deepEqual(errors,[]);reports.push(report);writeFileSync(`${out}/${state}.cpuprofile`,JSON.stringify(profile));writeFileSync(`${out}/${state}.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/${state}.png`});console.log(JSON.stringify(report));
  await context.close();
 }
 for(const [file,text] of Object.entries(source))assert.equal(readFileSync(file,'utf8'),text,'Source changed during profiling: '+file);
 writeFileSync(`${out}/summary.json`,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),reports},null,2));
}finally{await browser.close();}
