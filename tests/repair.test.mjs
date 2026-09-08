import test from 'node:test';import assert from 'node:assert/strict';
import {Weeper} from '../src/runtime/weeper.ts';import {DoorBreach} from '../src/runtime/door-breach.ts';import {chooseFinaleEntry} from '../src/runtime/pursuit.ts';import {SceneAudio} from '../src/runtime/scene-audio.ts';import {tuning} from '../src/runtime/pacing.ts';
const state=p=>({player:p,hidden:false,angle:0,light:false,sprinting:false,noise:false,solids:[],architecture:[],bounds:{x:0,y:0,width:6000,height:600},immune:false});
test('ordinary walking cannot indefinitely cancel a committed lunge',()=>{
 const w=new Weeper({x:100,y:150});w.phase='chasing';const p={x:205,y:150};let hit=false,dash=false;
 for(let i=0;i<1200;i++){p.x+=83*.05;const events=w.tick(.05,state(p));dash ||=events.includes('dash');if(events.includes('hit')){hit=true;break;}}
 assert.ok(dash&&hit);
});
test('quiet proximity does not pin a roaming patient or silence it forever',()=>{
 const w=new Weeper({x:100,y:150},[{x:100,y:350}]);let moved=false,cry=false;
 for(let i=0;i<600;i++){const events=w.tick(.05,state({x:230,y:150}));cry ||=events.includes('cry');moved ||=w.roaming;}
 assert.ok(moved&&cry);assert.equal(w.anger,0);
});
test('door battering has warning beats, freezes on pause and is interrupted before breaking',()=>{
 const d=new DoorBreach();assert.equal(d.tick(.1,false),undefined);assert.equal(d.tick(.1,true),'door-batter');d.tick(0,true);assert.equal(d.progress,.1);d.tick(3,true);d.tick(.1,false);assert.equal(d.progress,0);
 d.tick(4.9,true);assert.equal(d.broken,false);assert.equal(d.tick(.2,true),'door-breach');assert.equal(d.broken,true);assert.equal(d.tick(30,true),undefined);
});
test('finale plans a forward intersection including warning, never visible or adjacent spawns',()=>{
 const r=chooseFinaleEntry([{x:500,y:350},{x:50,y:150},{x:400,y:150}],{x:100,y:150},{x:1000,y:150},[],{x:0,y:0,width:1200,height:600},117,p=>p.y===150);
 assert.ok(r);assert.deepEqual(r.position,{x:500,y:350});assert.ok(r.target.x>280);assert.equal(tuning.exitStartup,30);
});
test('room foley waits for the actual furnishing and yields to critical encounters',()=>{
 const a=new SceneAudio(),l={theme:0,props:[{kind:'bed',x:150,y:150,width:40,height:70}]},p={x:140,y:200};assert.equal(a.tick(6,l,p,0,true),undefined);assert.equal(a.tick(.1,l,{x:900,y:200},0,false),undefined);assert.equal(a.tick(.1,l,p,0,false).id,'ward-bed-call');assert.equal(a.tick(20,l,p,0,false),undefined);
});
