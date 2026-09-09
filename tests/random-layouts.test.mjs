import test from 'node:test';import {runLayoutPool,summarizeLayouts} from '../scripts/layout-pool.mjs';import {workerBudget} from '../scripts/test-budget.mjs';
test('1400 generated layouts preserve the entire key chain, locked room and monster access',async()=>{
 const workers=workerBudget();console.log('Layout workers:',workers);let last=0;
 const results=await runLayoutPool({workers,onProgress:({completed,total})=>{if(Date.now()-last>15000||completed===total){console.log('Layouts:',completed+'/'+total);last=Date.now();}}});
 console.log(summarizeLayouts(results));
});
