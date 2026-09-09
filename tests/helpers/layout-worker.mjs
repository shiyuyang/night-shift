import assert from 'node:assert/strict';
import {makeLevel} from '../../src/levels.ts';
import {validatePlayableLevel} from '../../src/runtime/level-validation.ts';
import {assertOpeningSearch} from './layout-assertions.mjs';
const bases=new Map();
process.on('message',job=>{
 const results=[];
 for(const {seed,round} of job.cases){
  try{
   const level=makeLevel(round,seed);
   assert.equal(validatePlayableLevel(level).valid,true,JSON.stringify({round,seed}));
   assertOpeningSearch(level);
   if(!bases.has(round))bases.set(round,makeLevel(round));
   const base=bases.get(round);
   assert.deepEqual(level.walls,base.walls);assert.deepEqual(level.props,base.props);
   assert.ok(Math.hypot(level.boxes[2].x-(level.door.x+level.door.width/2),level.boxes[2].y-(level.door.y+level.door.height/2))>=90);
   results.push({seed,round,fallback:Number(level.generation.fallback),layout:JSON.stringify([level.key,level.boxes])});
  }catch(error){process.send({id:job.id,error:{seed,round,message:error.message,stack:error.stack}});return;}
 }
 process.send({id:job.id,results});
});
