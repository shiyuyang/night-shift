/** Byte-preserving packs: each entry remains a complete independently decodable file. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sounds=read('game/audio-sfx.json'),packs={};
for(const [codec,key] of [['opus','opusFile'],['mp3','file']]){
 const chunks=[],entries={};let offset=0;
 for(const sound of sounds){
  if(entries[sound.id])throw Error('Duplicate sound: '+sound.id);
  const bytes=readFileSync(new URL('public'+sound[key],root));
  entries[sound.id]={offset,length:bytes.length};chunks.push(bytes);offset+=bytes.length;
 }
 const bytes=Buffer.concat(chunks),hash=sha(bytes),file=`/audio/sfx-${codec}-${hash.slice(0,16)}.bin`;
 writeFileSync(new URL('public'+file,root),bytes);
 packs[codec]={file,bytes:bytes.length,sha256:hash,entries};
}
writeFileSync(new URL('game/audio-packs.json',root),JSON.stringify(packs,null,2)+'\n');
for(const track of read('game/music.json')){
 const source=new URL('public'+track.opusFile,root);
 writeFileSync(new URL(source.href.replace(/\.opus$/,'.ogg')),readFileSync(source));
}
console.log(`Packed ${sounds.length} sound effects without transcoding; music Opus copied to cacheable .ogg URLs.`);
