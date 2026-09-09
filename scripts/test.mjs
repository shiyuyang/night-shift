import {spawn} from 'node:child_process';import {workerBudget} from './test-budget.mjs';import {unitTestFiles} from './unit-test-files.mjs';
const start=performance.now();let child;
const stop=signal=>{if(child){if(process.platform==='win32')child.kill(signal);else{try{process.kill(-child.pid,signal);}catch{}}}process.exitCode=signal==='SIGINT'?130:143;};
process.once('SIGINT',()=>stop('SIGINT'));process.once('SIGTERM',()=>stop('SIGTERM'));
function run(args,env){return new Promise((resolve,reject)=>{child=spawn(process.execPath,args,{stdio:'inherit',env,detached:process.platform!=='win32'});child.once('error',reject);child.once('exit',(code,signal)=>{child=undefined;if(code!==0||signal)reject(Error('Test phase failed: '+(signal??code)));else resolve();});});}
try{
 const workers=workerBudget(),env={...process.env,TEST_WORKERS:String(workers)};
 console.log('Test worker budget:',workers,'(override with TEST_WORKERS).');
 await run(['--test','--test-concurrency='+workers,...unitTestFiles],env);
 if(process.exitCode)throw Error('Tests interrupted');
 await run(['--test','--test-isolation=none','tests/random-layouts.test.mjs'],env);
 console.log('All test phases passed in',((performance.now()-start)/1000).toFixed(1),'seconds.');
}catch(error){console.error(error.message);process.exitCode ||=1;}
