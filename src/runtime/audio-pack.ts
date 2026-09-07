import packs from '../../game/audio-packs.json' with {type:'json'};
import {assetUrl} from './asset-url.ts';
interface Pack {file:string;bytes:number;sha256:string;entries:Record<string,{offset:number;length:number}>;}
/** Verify the entire transport before slicing; failed loads remain retryable. */
export async function decodeSoundEffects(context:Pick<AudioContext,'decodeAudioData'>,variants:Pack[]=[packs.opus,packs.mp3]) {
 let failure:unknown;
 for(const pack of variants){
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   let bytes:ArrayBuffer;
   try{
    const response=await fetch(assetUrl(pack.file),{signal:controller.signal});
    if(!response.ok)throw Error('Audio pack unavailable: '+pack.file);
    bytes=await response.arrayBuffer();
   }finally{clearTimeout(timer);}
   if(bytes.byteLength!==pack.bytes)throw Error('Truncated audio pack');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==pack.sha256)throw Error('Audio pack integrity mismatch');
   const decoded=await Promise.all(Object.entries(pack.entries).map(async([id,{offset,length}])=>{
    if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0||offset+length>bytes.byteLength)throw Error('Invalid audio pack entry: '+id);
    return [id,await context.decodeAudioData(bytes.slice(offset,offset+length))] as const;
   }));
   return new Map(decoded);
  }catch(error){failure=error;}
 }
 throw failure;
}
