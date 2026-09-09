process.on('message',job=>{
 if(job.cases.some(c=>c.seed===999))process.exit(7);
 if(job.cases.some(c=>c.seed===998))return;
 if(job.cases.some(c=>c.seed===996)){process.send({id:job.id,error:{seed:996,round:5,stack:'fixture assertion'}});return;}
 if(job.cases.some(c=>c.seed===995)){process.send({id:job.id,results:[job.cases[0],job.cases[0]]});return;}
 process.send({id:job.id,results:job.cases.map(c=>({...c,fallback:0,layout:JSON.stringify(c)}))});
});
