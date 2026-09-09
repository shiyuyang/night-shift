import {layoutCases,runLayoutPool,summarizeLayouts} from './layout-pool.mjs';import {workerBudget} from './test-budget.mjs';
const options={};const names={'--seed':'seed','--night':'round','--workers':'workers'};
try{
 for(let i=2;i<process.argv.length;i+=2){const name=names[process.argv[i]],value=process.argv[i+1];if(!name||value===undefined||!/^\d+$/.test(value))throw Error('Usage: npm run test:layouts -- [--seed N] [--night 2..8] [--workers N]');options[name]=Number(value);}
 const workers=options.workers??workerBudget(),cases=layoutCases(options),start=performance.now();let last=0;
 console.log('Layout sweep:',cases.length,'samples,',workers,'workers');
 const results=await runLayoutPool({cases,workers,onProgress:({completed,total})=>{if(Date.now()-last>15000||completed===total){console.log('Layouts:',completed+'/'+total);last=Date.now();}}});
 console.log({...summarizeLayouts(results,{full:options.seed===undefined&&options.round===undefined}),seconds:((performance.now()-start)/1000).toFixed(1)});
}catch(error){console.error(error.stack);process.exitCode=1;}
