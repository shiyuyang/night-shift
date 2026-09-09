import {runLayoutPool} from '../../scripts/layout-pool.mjs';
const pending=runLayoutPool({cases:[{seed:998,round:5}],workers:1,workerURL:new URL('./pool-fixture.mjs',import.meta.url),timeoutMs:10000});
process.send({ready:true});
try{await pending;process.exitCode=1;}catch(error){process.send({error:error.message});process.exitCode=2;}finally{process.disconnect();}
