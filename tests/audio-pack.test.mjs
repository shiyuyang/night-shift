import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeSoundEffects} from '../src/runtime/audio-pack.ts';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const packs=read('game/audio-packs.json'),effects=read('game/audio-sfx.json');
const bytes=file=>readFileSync(new URL('../public'+file,import.meta.url));
test('every packed slice is byte-identical to the original complete encoded sound',()=>{
 for(const [codec,key] of [['opus','opusFile'],['mp3','file']]){
  const pack=packs[codec],data=bytes(pack.file);let end=0;
  assert.equal(data.length,pack.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),pack.sha256);
  assert.deepEqual(Object.keys(pack.entries).sort(),effects.map(e=>e.id).sort());
  for(const effect of effects){const entry=pack.entries[effect.id];assert.equal(entry.offset,end);assert.deepEqual(data.subarray(entry.offset,entry.offset+entry.length),bytes(effect[key]));end+=entry.length;}
  assert.equal(end,data.length);
 }
 for(const track of read('game/music.json'))assert.deepEqual(bytes(track.opusFile.replace(/\.opus$/,'.ogg')),bytes(track.opusFile));
});
test('one successful pack request supplies every effect; decoder failure falls back to one MP3 pack',async()=>{
 const original=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async file=>{calls.push(file);return new Response(bytes(file));};
  let rejectOpus=false;
  const context={async decodeAudioData(data){if(rejectOpus&&Buffer.from(data).subarray(0,4).toString()==='OggS')throw Error('unsupported codec');return {duration:1};}};
  assert.equal((await decodeSoundEffects(context)).size,effects.length);assert.deepEqual(calls,[packs.opus.file]);
  calls.length=0;rejectOpus=true;assert.equal((await decodeSoundEffects(context)).size,effects.length);assert.deepEqual(calls,[packs.opus.file,packs.mp3.file]);
 }finally{globalThis.fetch=original;}
});
test('corruption is rejected before decoding, and a failed request can be retried',async()=>{
 const original=globalThis.fetch;let corrupt=true,decoded=0;
 try{
  globalThis.fetch=async file=>{const data=Buffer.from(bytes(file));if(corrupt)data[0]^=255;return new Response(data);};
  const context={async decodeAudioData(){decoded++;return {duration:1};}};
  await assert.rejects(decodeSoundEffects(context,[packs.opus]),/integrity/);assert.equal(decoded,0);
  corrupt=false;assert.equal((await decodeSoundEffects(context,[packs.opus])).size,effects.length);
 }finally{globalThis.fetch=original;}
});
