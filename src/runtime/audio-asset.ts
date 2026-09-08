import {assetUrl} from './asset-url.ts';
/** Chrome runtime uses Opus only; failed loads remain retryable through audio initialization. */
export async function decodeAudioAsset(context:Pick<AudioContext,'decodeAudioData'>,file:string){
 const response=await fetch(assetUrl(file),{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Audio unavailable: '+file);
 return context.decodeAudioData(await response.arrayBuffer());
}
