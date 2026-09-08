import {writeFileSync} from 'node:fs';import {makeLevel} from '../src/levels.ts';import {chooseWeeper,weeperExclusion,weeperRoamPoints} from '../src/runtime/weeper-placement.ts';import {validatePlayableLevel} from '../src/runtime/level-validation.ts';import assert from 'node:assert/strict';
const result=[];const total=Number(process.env.REPAIR_SEEDS??100);
for(let r=1;r<=14;r++){
 let generated=0,skipped=0;const failures=[];
 for(let i=0;i<total;i++){
  const seed=(Math.imul(i+1,2654435761)^Math.imul(i+19,1103515245))>>>0,l=makeLevel(r,seed),w=chooseWeeper(l,seed),roll=((Math.imul(seed^r,1664525)+1013904223)>>>0)/4294967296;
  const expected=r>=2&&(r<=3||roll<=.85);
  if(expected&&!w)failures.push({seed,reason:'missing'});
  if(!w){skipped++;continue;}generated++;
  if(r===2){assert.deepEqual(w,l.weeperFixed);assert.equal(weeperRoamPoints(l,w).length,0);assert.ok(validatePlayableLevel({...l,props:[...l.props,...(l.features??[]).map(f=>({...f,kind:'crate'})),{...weeperExclusion(w),kind:'crate'}]}).valid);}
  else assert.ok(weeperRoamPoints(l,w).length>0);
 }
 result.push({round:r,total,generated,skipped,failures});console.log(JSON.stringify(result.at(-1)));writeFileSync('output/repair/spawns.json',JSON.stringify(result,null,2)+'\n');
}
assert.ok(result.every(r=>r.failures.length===0),'Missing patients; see output/repair/spawns.json');
