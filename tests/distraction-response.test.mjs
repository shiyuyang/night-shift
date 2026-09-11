import test from 'node:test';import assert from 'node:assert/strict';import {DistractionResponse} from '../src/runtime/distraction-response.ts';
const p={x:100,y:100},source={x:260,y:100};
test('listener follows noise; light-shy rejects it while the player is visible',()=>{const d=new DistractionResponse();assert.deepEqual(d.tick(.1,'listener',source,true,p),source);assert.deepEqual(d.tick(.1,'light-shy',source,false,p),source);assert.equal(d.tick(.1,'light-shy',source,true,p),undefined);assert.equal(d.changed,true);});
test('patrol checks briefly within a bounded radius then returns, ignoring a continuing lure',()=>{const d=new DistractionResponse();assert.deepEqual(d.tick(.1,'patroller',source,false,p),{x:220,y:100});assert.deepEqual(d.tick(1.9,'patroller',source,false,{x:220,y:100}),{x:220,y:100});assert.deepEqual(d.tick(.11,'patroller',source,false,{x:220,y:100}),p);assert.equal(d.tick(.1,'patroller',source,false,p),undefined);for(let i=0;i<100;i++)assert.equal(d.tick(.1,'patroller',source,false,p),undefined);d.tick(.1,'patroller',undefined,false,p);assert.ok(d.tick(.1,'patroller',source,false,p));});
test('far sounds do not pull patrols away, and pause preserves the investigation',()=>{const d=new DistractionResponse();assert.equal(d.tick(.1,'patroller',{x:500,y:100},false,p),undefined);d.tick(.1,'patroller',undefined,false,p);const goal=d.tick(.1,'patroller',source,false,p);for(let i=0;i<50;i++)assert.deepEqual(d.tick(0,'patroller',source,false,p),goal);assert.deepEqual(d.tick(1,'patroller',source,false,p),goal);});
test('a patrol pursuing a visible player hesitates once per decoy, without following it',()=>{const d=new DistractionResponse();assert.equal(d.tick(.05,'patroller',source,true,p),undefined);assert.equal(d.hesitation,.65);for(let i=0;i<30;i++)d.tick(.05,'patroller',source,true,p);assert.equal(d.hesitation,0);});
test('light-shy investigation is brief even while the sound continues',()=>{const d=new DistractionResponse();assert.ok(d.tick(.05,'light-shy',source,false,p));for(let i=0;i<60;i++)d.tick(.05,'light-shy',source,false,p);assert.equal(d.tick(.05,'light-shy',source,false,p),undefined);});
test('light-shy hesitates briefly on a nearby new decoy even with visual contact',()=>{const d=new DistractionResponse();assert.equal(d.tick(.05,'light-shy',source,true,p),undefined);assert.equal(d.hesitation,.65);for(let i=0;i<30;i++)d.tick(.05,'light-shy',source,true,p);assert.equal(d.hesitation,0);});
test('fresh sight cancels both investigation and return, without rearming the same lure',()=>{
 for(const returning of [false,true]){
  const d=new DistractionResponse();d.tick(.1,'patroller',source,false,p);
  if(returning)d.tick(2.1,'patroller',source,false,{x:220,y:100});
  assert.equal(d.tick(.1,'patroller',source,true,{x:220,y:100}),undefined);
  assert.equal(d.returning,false);assert.equal(d.changed,true);
  assert.equal(d.tick(.1,'patroller',source,false,{x:220,y:100}),undefined);
 }
});

test('each species must hear an emission before it can alter pursuit, and can enter range later',()=>{
 for(const threat of ['listener','light-shy','patroller']){
  const d=new DistractionResponse(),far={x:600,y:100},near={x:200,y:100};
  assert.equal(d.tick(.05,threat,far,false,p,{id:'a',remaining:5}),undefined);assert.equal(d.heard,false);
  assert.ok(d.tick(.05,threat,far,false,{x:500,y:100},{id:'a',remaining:3}));assert.equal(d.heard,true);
  d.tick(.05,threat,far,false,near,{id:'a',remaining:2.9});assert.equal(d.heard,false);assert.ok(d.target);
  d.tick(.05,threat,far,false,near,{id:'a',remaining:0});assert.equal(d.heard,false);
  if(threat!=='patroller')assert.equal(d.target,undefined);
 }
});
test('occlusion and deafness reject new emissions without consuming them, same-position new emissions rearm',()=>{
 for(const threat of ['listener','light-shy','patroller']){
  const d=new DistractionResponse();
  d.tick(.05,threat,source,true,p,{id:'a',remaining:8,audible:false});assert.equal(d.heard,false);
  d.tick(.05,threat,source,true,p,{id:'a',remaining:7,deaf:true});assert.equal(d.heard,false);
  d.tick(.05,threat,source,true,p,{id:'a',remaining:6});assert.equal(d.heard,true);
  for(let i=0;i<130;i++)d.tick(.05,threat,source,true,p,{id:'a',remaining:1});assert.equal(d.heard,false);assert.equal(d.hesitation,0);
  d.tick(.05,threat,source,true,p,{id:'b',remaining:8});assert.equal(d.heard,true);
  if(threat!=='listener')assert.equal(d.hesitation,.65);
 }
});
test('latched positions contain only coordinates and a late listener never exceeds source expiry',()=>{
 const d=new DistractionResponse(),emitter={x:250,y:100,scene:()=>{}};
 assert.deepEqual(d.tick(.1,'listener',emitter,false,p,{id:'a',remaining:.2}),{x:250,y:100});emitter.x=500;
 assert.deepEqual(d.tick(.1,'listener',emitter,false,p,{id:'a',remaining:.1}),{x:250,y:100});
 assert.equal(d.tick(.1,'listener',emitter,false,p,{id:'a',remaining:0}),undefined);
});
