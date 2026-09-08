import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync} from 'node:fs';
const effects=JSON.parse(readFileSync(new URL('../game/audio-sfx.json',import.meta.url)));
test('every runtime sound effect has generated provenance and a local MP3 asset',()=>{assert.equal(new Set(effects.map(e=>e.id)).size,effects.length);for(const effect of effects){const path=new URL('../public'+effect.file,import.meta.url),metadata=JSON.parse(readFileSync(new URL(path.href.replace(/\.mp3$/,'.json')))),bytes=readFileSync(path);assert.equal(metadata.provider,'ElevenLabs');assert.equal(metadata.model,'eleven_text_to_sound_v2');assert.ok(statSync(path).size>1000);assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255&&(bytes[1]&224)===224);assert.ok(effect.gain>0&&effect.gain<=1);}});

const music=JSON.parse(readFileSync(new URL('../game/music.json',import.meta.url)));
test('three map themes and the power climax have local ElevenLabs music',()=>{for(const theme of [0,1,2])assert.equal(music.filter(m=>m.theme===theme).length,2);for(const track of music){const path=new URL('../public'+track.file,import.meta.url),metadata=JSON.parse(readFileSync(new URL(path.href.replace(/\.mp3$/,'.json'))));assert.equal(metadata.provider,'ElevenLabs');assert.equal(metadata.model,'music_v1');assert.ok(statSync(path).size>10000);}});
test('music changes by scene and power playback seeks correctly after pause or mute',async()=>{
 const {Ambience}=await import('../src/ambience.ts');
 const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},cancelScheduledValues(){}});
 const gain=()=>({gain:param(),connect(){return this},disconnect(){}});
 const sources=[];const ctx={currentTime:10,createGain:gain,createBufferSource(){const source={connect(){return this},disconnect(){},start(t,offset){this.offset=offset},stop(){this.stopped=true}};sources.push(source);return source}};
 const a=new Ambience();a.context=ctx;a.master=gain();a.powerBuffer={duration:30};a.layers=music.filter(m=>m.id!=='power').map(m=>({id:m.id,gain:gain()}));a.enabled=true;a.setRunning(true);
 a.setScene(1,0,0);assert.ok(a.layers.find(l=>l.id==='warehouse').gain.gain.value>.5);assert.equal(a.layers.find(l=>l.id==='ward').gain.gain.value,0);
 a.setScene(-2,0,0);assert.ok(a.layers.find(l=>l.id==='menu').gain.gain.value>.5);
 a.setScene(0,0,0,4);assert.ok(a.layers.find(l=>l.id==='ward-alt').gain.gain.value>.5);assert.equal(a.layers.find(l=>l.id==='ward').gain.gain.value,0);
 a.setScene(2,1,30);assert.equal(sources.length,1);assert.equal(sources[0].offset,0);
 ctx.currentTime=12;a.setScene(2,1,28);assert.equal(sources.length,1);
 a.setRunning(false);assert.ok(sources[0].stopped);ctx.currentTime=30;a.setRunning(true);assert.equal(sources.at(-1).offset,2);
 await a.setEnabled(false);assert.ok(sources.at(-1).stopped);
 a.enabled=true;a.setRunning(true);assert.equal(sources.at(-1).offset,2);
 a.setScene(0,0,0);assert.ok(sources.at(-1).stopped);assert.equal(a.powerVoice,undefined);
});

test('Opus delivery reports decode failure without requesting another codec',async()=>{
 const {decodeAudioAsset}=await import('../src/runtime/audio-asset.ts'),original=globalThis.fetch,calls=[];
 try{globalThis.fetch=async url=>{calls.push(url);return {ok:true,arrayBuffer:async()=>new Uint8Array([url.endsWith('.opus')?1:2]).buffer};};
 const ctx={async decodeAudioData(bytes){if(new Uint8Array(bytes)[0]===1)throw Error('unsupported');return {duration:8};}};
 await assert.rejects(decodeAudioAsset(ctx,'/test.opus'),/unsupported/);assert.deepEqual(calls,['/test.opus']);calls.length=0;
 await decodeAudioAsset({async decodeAudioData(){return {duration:8};}},'/test.opus');assert.deepEqual(calls,['/test.opus']);
 }finally{globalThis.fetch=original;}
});

test('music loudness compensation brings source tracks to a consistent reference',()=>{
 for(const track of music)assert.ok(Math.abs(track.measuredLufs+20*Math.log10(track.mixGain)+21.5)<.01,track.id);
});
test('patient cues duck only music, overlap retains priority, and stop or pause releases it',async()=>{
 const {Ambience}=await import('../src/ambience.ts'),sources=[];
 const param=()=>({value:0,setTargetAtTime(value,time,constant){Object.assign(this,{value,time,constant});}});
 const gain=()=>({gain:param(),connect(target){this.destination=target;return target},disconnect(){}});
 const ctx={currentTime:5,createGain:gain,createStereoPanner(){return {...gain(),pan:param()};},createBufferSource(){const source={playbackRate:param(),connect(target){this.destination=target;return target},start(){},stop(){this.stopped=true},disconnect(){}};sources.push(source);return source;}};
 const a=new Ambience();a.context=ctx;a.master=gain();a.musicBus=gain();a.enabled=true;a.setRunning(true);
 for(const id of ['patient-cry','patient-rise','patient-lunge','step'])a.effects.set(id,{});
 a.cue('patient-cry');assert.equal(a.musicBus.gain.value,.2);assert.equal(a.musicBus.gain.constant,.035);assert.equal(sources[0].destination.destination.destination,a.master);
 a.cue('step');a.cue('patient-rise');sources[0].onended();assert.equal(a.musicBus.gain.value,.2);sources[2].onended();assert.equal(a.musicBus.gain.value,1);assert.equal(a.musicBus.gain.constant,1.1);
 a.cue('patient-cry');a.cue('patient-stop');assert.equal(a.musicBus.gain.value,1);assert.ok(sources.at(-1).stopped);
 a.cue('patient-cry');a.setRunning(false);assert.equal(a.musicBus.gain.value,1);assert.equal(a.patientVoices.size,0);a.setRunning(true);assert.equal(a.musicDucked,false);a.cue('patient-lunge');assert.equal(a.musicBus.gain.value,.2);assert.equal(a.musicBus.gain.constant,.01);a.cue('patient-stop');
});

test('every level plays both scene themes as searching escalates, without cycling on each fuse',async()=>{
 const {Ambience}=await import('../src/ambience.ts');const gain=()=>({gain:{value:0,setTargetAtTime(v){this.value=v;}}});const a=new Ambience();a.context={currentTime:0};a.layers=music.filter(m=>m.id!=='power').map(m=>({id:m.id,gain:gain()}));
 const audible=()=>a.layers.filter(l=>l.gain.gain.value>0).map(l=>l.id);
 for(let night=1;night<=6;night++){const theme=(night-1)%3;a.setScene(theme,0,0,night,0);const first=audible();assert.equal(first.length,1);a.setScene(theme,0,0,night,1);const second=audible();assert.equal(second.length,1);assert.notEqual(first[0],second[0]);a.setScene(theme,0,0,night,2);assert.deepEqual(audible(),second);}
 a.setScene(-2,0,0);assert.deepEqual(audible(),['menu']);
});

test('retry rotates the opening track, preserves the choice while paused and survives reload',async()=>{
 const {Ambience}=await import('../src/ambience.ts'),original=globalThis.localStorage,storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const setup=()=>{const a=new Ambience();a.context={currentTime:0};a.layers=music.filter(m=>m.id!=='power').map(m=>({id:m.id,gain:{gain:{value:0,setTargetAtTime(v){this.value=v;}}}}));return a;};
 const audible=a=>a.layers.find(l=>l.id!=='pursuit'&&l.gain.gain.value>0)?.id;
 try{const a=setup();for(const theme of [0,1,2]){a.beginRun(theme,theme+1);const first=audible(a);a.setScene(theme,0,0,theme+1,0);assert.equal(audible(a),first);a.beginRun(theme,theme+1);const second=audible(a);assert.notEqual(second,first);a.setScene(theme,0,0,theme+1,1);assert.equal(audible(a),first);const reload=setup();reload.beginRun(theme,theme+1);assert.equal(audible(reload),first);}}
 finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});

test('only selected music is scheduled and a newly selected theme starts at its opening',async()=>{
 const {Ambience}=await import('../src/ambience.ts');const sources=[];
 const gain=()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){return this},disconnect(){}});
 const ctx={state:'running',currentTime:10,createGain:gain,createBufferSource(){const s={connect(){return this},disconnect(){},start(t,offset=0){this.started=t;this.offset=offset},stop(t){this.stopped=t}};sources.push(s);return s;}};
 const a=new Ambience();a.context=ctx;a.layers=music.filter(m=>m.id!=='power').map(m=>({id:m.id,buffer:{duration:40,id:m.id},gain:gain(),nextStart:Infinity}));
 a.setScene(0,0,0,1,0);assert.deepEqual(sources.map(s=>s.buffer.id),['ward']);
 ctx.currentTime=12;a.setScene(0,0,0,1,0);assert.equal(sources.length,1);
 a.setScene(1,0,0,1,0);assert.equal(sources.length,2);assert.equal(sources[1].buffer.id,'warehouse');assert.equal(sources[1].offset,0);assert.equal(sources[0].stopped,15);
 ctx.currentTime=13;a.setScene(0,0,0,1,0);assert.equal(sources.length,3);assert.equal(sources[2].buffer.id,'ward');assert.equal(sources[2].offset,0);assert.ok(sources[0].stopped<13.1);
});

test('clinical stages select existing scene beds instead of falling back to menu music',async()=>{
 const {musicTheme}=await import('../src/ambience.ts');
 assert.equal(musicTheme(3),0);assert.equal(musicTheme(4),2);assert.equal(musicTheme(-2),-2);
});
