import test from 'node:test';
import assert from 'node:assert/strict';
import {Reinforcement} from '../src/runtime/reinforcement.ts';
test('an irrelevant distant noise cannot make a visible-player interceptor turn away',()=>{
 const paths=[];
 for(const distraction of [undefined,{x:750,y:450}]){
  const r=new Reinforcement();r.spawn({x:100,y:150},{x:280,y:150});
  const input={player:{x:280,y:150},hidden:false,retreat:false,visible:()=>true,solids:[],bounds:{x:0,y:0,width:900,height:600},goal:{x:60,y:150}};
  r.tick(.05,input);const path=[];
  for(let i=0;i<80;i++){r.tick(.05,{...input,distraction});path.push({...r.position});assert.equal(r.clueClock,2.5);}
  paths.push(path);assert.ok(Math.hypot(r.position.x-280,r.position.y-150)<1);
 }
 assert.deepEqual(paths[0],paths[1]);
});
test('interceptor diagnostics retain coordinates without copying a Phaser target object',()=>{
 const r=new Reinforcement();r.diagnosticsEnabled=true;
 r.spawn({x:100,y:150},{x:280,y:150,callback(){}});
 r.tick(.05,{player:{x:800,y:500},hidden:true,retreat:false,visible:()=>false,solids:[],bounds:{x:0,y:0,width:900,height:600}});
 assert.deepEqual(structuredClone(r.diagnostics).target,{x:280,y:150});
});
