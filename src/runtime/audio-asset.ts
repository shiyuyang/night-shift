/** Prefer small Opus delivery; retry MP3 on unsupported decoding or a failed request. */
export async function decodeAudioAsset(context:Pick<AudioContext,'decodeAudioData'>,file:string,opusFile?:string){
 let failure:unknown;
 for(const url of opusFile?[opusFile,file]:[file]){
  try{const response=await fetch(url);if(!response.ok)throw Error('Audio unavailable: '+url);return await context.decodeAudioData(await response.arrayBuffer());}catch(error){failure=error;}
 }
 throw failure;
}
