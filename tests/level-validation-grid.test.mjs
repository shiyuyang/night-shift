import test from 'node:test';
import assert from 'node:assert/strict';
import {feetAt,monsterFeetAt} from '../src/collision.ts';
import {reachablePositions} from '../src/runtime/level-validation.ts';
import {reachablePositions as reference} from './helpers/reference-reachability.mjs';

test('rasterized reachability preserves exact positions and traversal order',()=>{
 let state=12345;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
 for(let sample=0;sample<100;sample++){
  const origin=sample%2?0:-17.5;
  const box=()=>({x:origin+random()*150,y:origin+random()*120,width:1+random()*25,height:1+random()*30});
  const level={bounds:{x:origin,y:origin,width:160,height:144},spawn:{x:origin+80+(sample%3)*.25,y:origin+72},walls:Array.from({length:8},box),props:Array.from({length:5},box),boxes:[{x:origin+120,y:origin+110}],door:box()};
  for(const open of [false,true])for(const footprint of [feetAt,monsterFeetAt,(x,y)=>({x:x-3,y:y+4,width:x>60?12:8,height:6})]){
   assert.deepEqual(reachablePositions(level,open,footprint),reference(level,open,footprint),`sample=${sample}, open=${open}`);
  }
 }
});

test('touching edges, closed doors, and geometry edits retain exact collision behavior',()=>{
 const level={bounds:{x:0,y:0,width:96,height:96},spawn:{x:48,y:40},walls:[],props:[],boxes:[],door:{x:55,y:0,width:1,height:96}};
 for(const footprint of [feetAt,monsterFeetAt])for(const open of [false,true]){
  assert.deepEqual(reachablePositions(level,open,footprint),reference(level,open,footprint));
 }
 level.props.push({x:41,y:48,width:14,height:8});
 assert.deepEqual(reachablePositions(level,true),[]);
 level.props.length=0;
 assert.deepEqual(reachablePositions(level,true),reference(level,true));
});

test('packed escape BFS matches the original shortest distance on sparse and connected grids',async()=>{
 const {escapeRouteLength}=await import('../src/runtime/level-validation.ts');
 const {escapeRouteLength:referenceEscape}=await import('./helpers/reference-reachability.mjs');
 let state=6789;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
 for(let sample=0;sample<80;sample++){
  const offset=sample%3===0?.5:-32,points=[];
  for(let y=0;y<20;y++)for(let x=0;x<30;x++)if(random()>.2)points.push({x:offset+x*8,y:offset+y*8});
  const level={exit:{x:offset,y:offset+sample%20*8},boxes:[{},{},{x:offset+232,y:offset+sample%17*8}]};
  assert.equal(escapeRouteLength(level,points),referenceEscape(level,points),`sample=${sample}`);
 }
 const level={exit:{x:0,y:0},boxes:[{},{},{x:240,y:0}]};
 for(const points of [[],[{x:0,y:0},{x:240,y:0}],Array.from({length:31},(_,i)=>({x:i*8,y:0})),[{x:0,y:0},{x:0,y:0},{x:1,y:0},{x:9,y:0}], [{x:0,y:0},{x:80_000_000,y:0}]]){
  assert.equal(escapeRouteLength(level,points),referenceEscape(level,points));
 }
});

test('local point queries preserve strict distance thresholds and sparse/empty behavior',async()=>{
 const {positionQuery}=await import('../src/runtime/position-query.ts');
 const points=Array.from({length:600},(_,i)=>({x:(i%30)*8-80.5,y:Math.floor(i/30)*8-32.25}));
 for(const set of [[],points,[{x:0,y:0},{x:80_000_000,y:80_000_000}],[{x:0,y:0},{x:32,y:32}]]){
  const near=positionQuery(set);
  for(let i=0;i<200;i++)for(const radius of [0,8,16,30,37,38,44,Infinity]){
   const p={x:i*1.5-130,y:(i%50)*5-60};
   assert.equal(near(p,radius),set.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius));
  }
 }
 const near=positionQuery([{x:0,y:0},{x:64,y:0}]);
 assert.equal(near({x:32,y:0},32),false);
 assert.equal(near({x:32,y:0},32.000001),true);
});

test('candidate analysis reuses original-geometry queries without leaking across candidates',async()=>{
 const {makeLevel}=await import('../src/levels.ts');
 const {analyzePlayableLevel,validatePlayableLevel}=await import('../src/runtime/level-validation.ts');
 for(const round of [2,6]){
  const level=makeLevel(round),analysis=analyzePlayableLevel(level);
  assert.deepEqual({valid:analysis.valid,errors:analysis.errors},validatePlayableLevel(level));
  for(const [open,near] of [[false,analysis.closedNear],[true,analysis.openNear]]){
   const points=reference(level,open);
   for(const p of [level.spawn,level.key,level.exit,...level.boxes,...level.monsterSpawns])for(const radius of [8,30,38,44]){
    assert.equal(near(p,radius),points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius));
   }
  }
  assert.equal(analysis.closedNear(level.spawn,1),true);
  level.props.push({...feetAt(level.spawn.x,level.spawn.y),kind:'crate'});
  const blocked=analyzePlayableLevel(level);
  assert.equal(blocked.valid,false);
  assert.equal(blocked.closedNear(level.spawn,1),false);
  assert.equal(analysis.closedNear(level.spawn,1),true);
 }
});

test('direct grid validation preserves complete error lists including drawer recursion',async()=>{
 const {makeLevel}=await import('../src/levels.ts');
 const {validatePlayableLevel}=await import('../src/runtime/level-validation.ts');
 const {referenceValidation}=await import('./helpers/reference-reachability.mjs');
 for(let round=1;round<=8;round++){
  const level=makeLevel(round,3);
  const sealed={...level,props:[...level.props,{...feetAt(level.spawn.x,level.spawn.y),kind:'crate'}]};
  const short={...level,exit:{x:level.boxes[2].x,y:level.boxes[2].y+28}};
  for(const candidate of [level,sealed,short])assert.deepEqual(validatePlayableLevel(candidate),referenceValidation(candidate),`round=${round}`);
 }
});
