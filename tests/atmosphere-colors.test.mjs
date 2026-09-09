import test from 'node:test';
import assert from 'node:assert/strict';
import {AtmosphereColors,atmospherePalettes} from '../src/runtime/atmosphere-colors.ts';
const lamp={x:20,y:30,radius:250,strength:.98,color:'#d4c6a0',angle:0};
test('occasional colour completes and restores the original lamp; pause freezes it',()=>{
 const a=new AtmosphereColors(()=>0);
 for(let i=0;i<599;i++)a.tick(.1,true);
 assert.equal(a.amount,0);
 for(let i=0;i<35;i++)a.tick(.1,true);
 assert.equal(a.amount,1);
 const colored=a.light(lamp);assert.notEqual(colored.color,lamp.color);
 assert.equal(colored.radius,lamp.radius);assert.equal(colored.strength,lamp.strength);
 a.tick(0,false);assert.deepEqual(a.light(lamp),colored);
 for(let i=0;i<150;i++)a.tick(.1,true);
 assert.deepEqual(a.light(lamp),lamp);assert.ok(a.snapshot.wait>0);
});
test('interruption fades away even if the blocking event ends early',()=>{
 const a=new AtmosphereColors(()=>0);for(let i=0;i<640;i++)a.tick(.1,true);
 a.tick(.1,false);assert.ok(a.amount<1&&a.amount>0);
 for(let i=0;i<50;i++)a.tick(.1,true);
 assert.equal(a.amount,0);assert.deepEqual(a.light(lamp),lamp);
 for(let i=0;i<1000;i++)a.tick(.1,false);
 assert.equal(a.amount,0);
});
test('both palettes preserve geometry and never repeat in the same run',()=>{
 for(let i=0;i<atmospherePalettes.length;i++){
  const values=[0,0,i/atmospherePalettes.length],a=new AtmosphereColors(()=>values.shift()??0);
  for(let t=0;t<640;t++)a.tick(.1,true);
  assert.equal(a.snapshot.palette,atmospherePalettes[i].id);assert.equal(a.amount,1);
  for(const source of [lamp,{...lamp,angle:undefined}]){const l=a.light(source);assert.equal(l.radius,source.radius);assert.equal(l.strength,source.strength);assert.equal(l.angle,source.angle);}
  for(let t=0;t<20000;t++){a.tick(.1,true);if(t>140)assert.equal(a.amount,0);}
 }
});
test('unselected runs have no colour event, even after a long search',()=>{
 for(const roll of [.6,.8,.99]){
  const a=new AtmosphereColors(()=>roll);
  for(let t=0;t<20000;t++)a.tick(.1,true);
  assert.equal(a.snapshot.palette,null);assert.equal(a.amount,0);
 }
});

test('increased chance includes rolls between the old and new thresholds',()=>{
 const values=[.5,0,0],a=new AtmosphereColors(()=>values.shift()??0);
 for(let i=0;i<640;i++)a.tick(.1,true);
 assert.equal(a.amount,1);
});
