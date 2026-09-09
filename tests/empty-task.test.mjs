import test from 'node:test';import assert from 'node:assert/strict';
import {makeLevel} from '../src/levels.ts';import {RogueRun} from '../src/runtime/rogue-run.ts';import {center,featureSafetyBox} from '../src/runtime/rogue-content.ts';import {reachablePositions,validatePlayableLevel} from '../src/runtime/level-validation.ts';
test('empty task boxes preserve progression, cabinet fronts and tutorial ordering',()=>{
 for(let round=1;round<=7;round++)for(let seed=0;seed<8;seed++){
  const l=makeLevel(round,seed),extras=l.features.filter(f=>f.kind==='empty-task');
  assert.ok(extras.length>=(round<=2?1:2)&&extras.length<=(round<=2?1:round===3?2:3),JSON.stringify({round,seed,count:extras.length}));
  assert.equal(l.boxes.length,3);assert.equal(l.features.filter(f=>f.kind==='cache'&&f.hasLoot).length,2);
  const testLevel={...l,props:[...l.props,...l.features.map(f=>({...featureSafetyBox(f),kind:'crate'}))]};
  assert.ok(validatePlayableLevel(testLevel).valid,JSON.stringify({round,seed}));
  const open=reachablePositions(testLevel,true),closed=reachablePositions(testLevel,false);
  for(const f of l.features){const c=center(f);assert.ok((f.kind==='empty-task'?open:closed).some(p=>Math.hypot(p.x-c.x,p.y-c.y-28)<8));if(f.kind==='empty-task'){assert.ok(l.boxes.every(b=>Math.hypot(b.x-c.x,b.y-c.y)>=120));if(round===1)assert.ok(!closed.some(p=>Math.hypot(p.x-c.x,p.y-c.y)<16));}}
 }
});
test('unlocked empty task opens once, sounds like a box and cannot yield or consume items',()=>{
 const f={id:'empty-task-0',kind:'empty-task',x:100,y:100,width:26,height:20,roll:0,reward:'flash',hasLoot:false},r=new RogueRun([f]),p={x:113,y:150},inventory={flash:0,decoy:0,bandage:0};
 const events=r.interact(p,false,inventory);assert.ok(r.opened.has(f.id));assert.ok(events.some(e=>e.type==='box-search'));assert.ok(events.some(e=>e.type==='sound'&&e.id==='pickup'));assert.equal(events.some(e=>e.type==='loot'),false);assert.deepEqual(inventory,{flash:0,decoy:0,bandage:0});assert.deepEqual(r.interact(p,false),[]);assert.equal(r.stats.cachesOpened,0);
});
