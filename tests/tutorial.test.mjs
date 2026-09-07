import test from 'node:test';
import assert from 'node:assert/strict';
import {Tutorial,lessons,isMonsterLesson,MONSTER_LESSONS_KEY} from '../src/runtime/tutorial.ts';
test('only first stage teaches; acknowledging is not completing a lesson',()=>{
 const t=new Tutorial();t.start(2);assert.equal(t.show('flash'),false);
 t.start(1);assert.equal(t.show('flash'),true);assert.equal(t.show('heal'),false);
 t.resume();assert.equal(t.needs('flash'),true);t.learn('flash');assert.equal(t.needs('flash'),false);
 t.skip();assert.equal(t.show('decoy'),false);
});
test('every first-stage run teaches again after completion or skipping',()=>{
 const t=new Tutorial();t.start(1);for(const id of Object.keys(lessons).filter(id=>!isMonsterLesson(id)))t.learn(id);
 t.skip();t.start(1);for(const id of Object.keys(lessons).filter(id=>!isMonsterLesson(id)))assert.equal(t.needs(id),true);
 assert.equal(t.show('health'),true);t.start(1);assert.equal(t.prompt,null);assert.equal(t.show('health'),true);
 t.start(2);assert.equal(t.show('health'),false);
});
test('old saved tutorial completion does not suppress a new first stage',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(Object.keys(lessons).filter(id=>!isMonsterLesson(id)))}});
 try{const t=new Tutorial();t.start(1);assert.equal(t.show('health'),true);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('monster lessons teach on later rounds, persist only after confirmation and survive reload',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const t=new Tutorial(storage);t.start(3);assert.equal(t.show('monster-weeper'),true);assert.equal(data.has(MONSTER_LESSONS_KEY),false);
 t.start(3);assert.equal(t.show('monster-weeper'),true);t.resume();assert.equal(t.needs('monster-weeper'),false);
 const reloaded=new Tutorial(storage);reloaded.start(4);assert.equal(reloaded.show('monster-weeper'),false);assert.equal(reloaded.show('monster-listener'),true);
});
test('unavailable or corrupt storage does not prevent first encounter teaching',()=>{
 for(const storage of [{getItem:()=>'{',setItem:()=>{}},{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}]){
 const t=new Tutorial(storage);t.start(2);assert.equal(t.show('monster-light-shy'),true);t.resume();t.start(3);assert.equal(t.show('monster-light-shy'),false);
 }
});
