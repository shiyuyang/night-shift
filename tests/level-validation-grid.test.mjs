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
