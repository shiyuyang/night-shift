import test from 'node:test';import assert from 'node:assert/strict';
import {workerBudget} from '../scripts/test-budget.mjs';
import {layoutCases,runLayoutPool,summarizeLayouts} from '../scripts/layout-pool.mjs';
const workerURL=new URL('./helpers/pool-fixture.mjs',import.meta.url);
test('CPU budget scales to 32 logical CPUs, honors memory and validates override',()=>{
 assert.equal(workerBudget({cpus:32,memory:24*1024**3,override:undefined}),24);
 assert.equal(workerBudget({cpus:32,memory:2*1024**3,override:undefined}),2);
 assert.equal(workerBudget({cpus:1,memory:0,override:undefined}),1);
 assert.equal(workerBudget({cpus:32,memory:0,override:'16'}),16);
 for(const override of ['0','-1','1.5','NaN',''])assert.throws(()=>workerBudget({override}));
});
test('all 1400 seed/night pairs are scheduled exactly once and aggregate globally',async()=>{
 const cases=layoutCases();assert.equal(cases.length,1400);assert.equal(new Set(cases.map(c=>JSON.stringify(c))).size,1400);
 const results=await runLayoutPool({cases,workers:3,batchSize:37,workerURL});assert.deepEqual(results.map(({seed,round})=>({seed,round})),cases);
 assert.deepEqual(summarizeLayouts(results),{generated:1400,fallback:0,uniqueLayouts:1400});
 assert.throws(()=>summarizeLayouts(results.map(r=>({...r,layout:'same'}))));
 assert.throws(()=>summarizeLayouts(results.map((r,i)=>({...r,fallback:i<6?1:0}))));
});
test('serial and parallel pools return identical samples regardless of batch boundaries',async()=>{
 const cases=layoutCases({seed:42});
 const serial=await runLayoutPool({cases,workers:1,batchSize:2,workerURL}),parallel=await runLayoutPool({cases,workers:4,batchSize:3,workerURL});
 assert.deepEqual(serial,parallel);assert.deepEqual(layoutCases({seed:0,round:5}),[{seed:0,round:5}]);
 assert.throws(()=>layoutCases({round:1}));assert.throws(()=>layoutCases({seed:-1}));
});
test('worker crashes fail promptly with the active seed and night',async()=>{
 await assert.rejects(runLayoutPool({cases:[{seed:999,round:5}],workers:1,workerURL}),/exited 7.*999.*5/);
});
test('stalled workers time out and are terminated',async()=>{
 await assert.rejects(runLayoutPool({cases:[{seed:998,round:5}],workers:1,workerURL,timeoutMs:200}),/timed out.*998.*5/);
});
test('assertion reports preserve the failed sample and reproduction command',async()=>{
 await assert.rejects(runLayoutPool({cases:[{seed:996,round:5}],workers:1,workerURL}),/night=5 seed=996[\s\S]*--seed 996 --night 5 --workers 1[\s\S]*fixture assertion/);
});
test('duplicate results cannot silently replace missing samples',async()=>{
 await assert.rejects(runLayoutPool({cases:[{seed:995,round:5},{seed:995,round:6}],workers:1,workerURL}),/duplicate sample/);
});
test('SIGTERM cancels the active pool without waiting for its timeout',{timeout:5000},async()=>{
 const {fork}=await import('node:child_process');
 const child=fork(new URL('./helpers/pool-signal.mjs',import.meta.url),[],{execArgv:[],stdio:['ignore','ignore','inherit','ipc']});
 let message;
 try{const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('message',m=>{if(m.ready)child.kill('SIGTERM');if(m.error)message=m.error;});child.on('exit',resolve);});
 assert.equal(code,2);assert.match(message,/interrupted \(SIGTERM\)/);
 }finally{child.kill();}
});
