import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {workerBudget} from './test-budget.mjs';
export const layoutRounds=[2,3,4,5,6,7,8];
export function layoutCases({seed,round}={}){
 if(seed!==undefined&&(!Number.isInteger(seed)||seed<0||seed>0xffffffff))throw Error('Seed must be a uint32');
 if(round!==undefined&&!layoutRounds.includes(round))throw Error('Night must be between 2 and 8');
 return (seed===undefined?Array.from({length:200},(_,i)=>i):[seed]).flatMap(seed=>(round===undefined?layoutRounds:[round]).map(round=>({seed,round})));
}
export function runLayoutPool({cases=layoutCases(),workers=workerBudget(),batchSize=14,timeoutMs=300000,workerURL=new URL('../tests/helpers/layout-worker.mjs',import.meta.url),onProgress=()=>{}}={}){
 if(!Number.isInteger(workers)||workers<1||!Number.isInteger(batchSize)||batchSize<1||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Invalid pool limits');
 const expected=new Set(cases.map(c=>c.seed+':'+c.round));
 if(expected.size!==cases.length||!cases.length)throw Error('Cases must be nonempty and unique');
 const jobs=[];for(let i=0;i<cases.length;i+=batchSize)jobs.push({id:jobs.length,cases:cases.slice(i,i+batchSize)});
 return new Promise((resolve,reject)=>{
  const states=[],results=[],seen=new Set();let next=0,finished=0,settled=false;
  const cleanup=()=>{process.off('SIGINT',interrupt);process.off('SIGTERM',terminate);for(const s of states){clearTimeout(s.timer);s.child.kill();}};
  const fail=error=>{if(settled)return;settled=true;cleanup();reject(error);};
  const interrupt=()=>fail(Error('Layout sweep interrupted (SIGINT)'));
  const terminate=()=>fail(Error('Layout sweep interrupted (SIGTERM)'));
  process.once('SIGINT',interrupt);process.once('SIGTERM',terminate);
  const dispatch=s=>{
   if(next===jobs.length){s.job=null;return;}
   s.job=jobs[next++];s.timer=setTimeout(()=>fail(Error('Layout batch timed out: '+JSON.stringify(s.job.cases))),timeoutMs);
   try{s.child.send(s.job,error=>{if(error)fail(error);});}catch(error){fail(error);}
  };
  for(let i=0;i<Math.min(workers,jobs.length);i++){
   if(settled)break;
   const child=fork(workerURL,[],{execArgv:[],stdio:['ignore','inherit','inherit','ipc']});
   const s={child,job:null,timer:null};states.push(s);
   child.on('error',fail);
   child.on('exit',(code,signal)=>{if(!settled)fail(Error('Layout worker exited '+(signal??code)+'; active cases: '+JSON.stringify(s.job?.cases)));});
   child.on('message',message=>{
    if(settled)return;
    try{
     assert.equal(message.id,s.job?.id,'Unexpected layout batch result');
     if(message.error){const e=message.error;throw Error('Layout failed: night='+e.round+' seed='+e.seed+'\nReproduce: npm run test:layouts -- --seed '+e.seed+' --night '+e.round+' --workers 1\n'+e.stack);}
     assert.equal(message.results.length,s.job.cases.length,'Incomplete batch');
     const jobKeys=new Set(s.job.cases.map(c=>c.seed+':'+c.round));
     for(const result of message.results){const key=result.seed+':'+result.round;assert.ok(jobKeys.has(key)&&!seen.has(key),'Unexpected or duplicate sample '+key);seen.add(key);results.push(result);}
     clearTimeout(s.timer);finished++;onProgress({completed:results.length,total:cases.length,workers:states.length});
     if(finished===jobs.length){assert.equal(seen.size,expected.size);settled=true;cleanup();resolve(results.sort((a,b)=>a.seed-b.seed||a.round-b.round));}
     else dispatch(s);
    }catch(error){fail(error);}
   });
   dispatch(s);
  }
 });
}
export function summarizeLayouts(results,{full=true}={}){
 const fallback=results.reduce((n,r)=>n+r.fallback,0),uniqueLayouts=new Set(results.map(r=>r.layout)).size;
 if(full){assert.equal(results.length,1400);assert.ok(fallback<6,'too many fallbacks: '+fallback);assert.ok(uniqueLayouts>150,'low diversity: '+uniqueLayouts);}
 return {generated:results.length,fallback,uniqueLayouts};
}
