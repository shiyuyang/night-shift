import os from 'node:os';
export function workerBudget({cpus=os.availableParallelism(),memory=process.availableMemory?.()??os.freemem(),override}={override:process.env.TEST_WORKERS}){
 if(override!==undefined){if(!/^[1-9]\d*$/.test(override)||!Number.isSafeInteger(Number(override)))throw Error('TEST_WORKERS must be a positive integer');return Number(override);}
 // Leave CPU and RAM for Vite/the browser. Approximate per-process allowance.
 return Math.max(1,Math.min(Math.floor(cpus*.75),Math.floor((memory-1024**3)/(512*1024**2))));
}
