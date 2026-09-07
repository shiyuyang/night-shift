import test from 'node:test';
import assert from 'node:assert/strict';
import {Tutorial,lessons} from '../src/runtime/tutorial.ts';
test('only first stage teaches; acknowledging is not completing a lesson',()=>{
 const t=new Tutorial();t.start(2);assert.equal(t.show('flash'),false);
 t.start(1);assert.equal(t.show('flash'),true);assert.equal(t.show('heal'),false);
 t.resume();assert.equal(t.needs('flash'),true);t.learn('flash');assert.equal(t.needs('flash'),false);
 t.skip();assert.equal(t.show('decoy'),false);
});
test('every first-stage run teaches again after completion or skipping',()=>{
 const t=new Tutorial();t.start(1);for(const id of Object.keys(lessons))t.learn(id);
 t.skip();t.start(1);for(const id of Object.keys(lessons))assert.equal(t.needs(id),true);
 assert.equal(t.show('health'),true);t.start(1);assert.equal(t.prompt,null);assert.equal(t.show('health'),true);
 t.start(2);assert.equal(t.show('health'),false);
});
test('old saved tutorial completion does not suppress a new first stage',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(Object.keys(lessons))}});
 try{const t=new Tutorial();t.start(1);assert.equal(t.show('health'),true);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
