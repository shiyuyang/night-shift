import assert from 'node:assert/strict';
import {makeLevel} from '../../src/levels.ts';
import {validatePlayableLevel} from '../../src/runtime/level-validation.ts';
import {assertOpeningSearch,assertContainerPlacement} from './layout-assertions.mjs';
import {featureSafetyBox} from '../../src/runtime/rogue-content.ts';
import {difficultyForNight} from '../../src/runtime/difficulty.ts';
const bases=new Map();
process.on('message',job=>{
 const results=[];
 for(const {seed,round} of job.cases){
  try{
   const level=makeLevel(round,seed);
   assert.equal(validatePlayableLevel(level).valid,true,JSON.stringify({round,seed}));
   assertOpeningSearch(level);
   assertContainerPlacement(level);
   const content={...level,props:[...level.props,...level.features.map(f=>({...featureSafetyBox(f),kind:'crate'}))]};
   const contentValidation=validatePlayableLevel(content);
   assert.ok(contentValidation.valid,JSON.stringify({round,seed,errors:contentValidation.errors}));
   const caches=level.features.filter(f=>f.kind==='cache'),empty=level.features.filter(f=>f.kind==='empty-task'),d=difficultyForNight(round);
   assert.ok(caches.length>=4&&caches.length<=6,'supply cabinet count');assert.equal(caches.filter(f=>f.hasLoot).length,2);
   assert.ok(empty.length>=d.emptyTaskMin&&empty.length<=d.emptyTaskMax,'empty task count');
   if(!bases.has(round))bases.set(round,makeLevel(round));
   const base=bases.get(round);
   assert.deepEqual(level.walls,base.walls);assert.deepEqual(level.props,base.props);
   assert.ok(Math.hypot(level.boxes[2].x-(level.door.x+level.door.width/2),level.boxes[2].y-(level.door.y+level.door.height/2))>=90);
   results.push({seed,round,fallback:Number(level.generation.fallback),layout:JSON.stringify([level.key,level.boxes])});
  }catch(error){process.send({id:job.id,error:{seed,round,message:error.message,stack:error.stack}});return;}
 }
 process.send({id:job.id,results});
});
