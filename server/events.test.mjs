import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, createGate } from './events.mjs';
test('normalizes supported events and rejects untrusted inputs',()=>{
 assert.deepEqual(validateEvent({id:'gift-1',command:'ghost'}).viewer,'神秘观众');
 for(const value of [null,{}, {id:'x',command:'eval'}, {id:'../x',command:'ghost'}, {id:'x',command:'ghost',viewer:'x'.repeat(41)}])assert.throws(()=>validateEvent(value));
});
test('deduplicates retries and limits bursts without consuming rejected ids',()=>{
 const gate=createGate();
 assert.equal(gate({id:'one'},1000),'accepted');
 assert.equal(gate({id:'one'},2000),'duplicate');
 assert.equal(gate({id:'two'},1100),'limited');
 assert.equal(gate({id:'two'},1800),'accepted');
 assert.equal(gate({id:'one'},302000),'accepted');
});

test('shared command catalog is four buffs and four debuffs; retired commands reject',async()=>{const {default:catalog}=await import('../game/commands.json',{with:{type:'json'}});assert.equal(catalog.filter(c=>c.kind==='buff').length,4);assert.equal(catalog.filter(c=>c.kind==='debuff').length,4);for(const command of ['alarm','drain'])assert.equal(validateEvent({id:'test',command}).command,command);for(const command of ['lure','battery'])assert.throws(()=>validateEvent({id:'test',command}));});
