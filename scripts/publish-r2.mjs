/** Upload an immutable media release; remote verification is explicit opt-in. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {r2Manifest} from './r2-manifest.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../deploy/r2.json',import.meta.url),'utf8'));
const built=spawnSync('npm',['run','build:deploy'],{cwd:root,stdio:'inherit',env:{...process.env,VITE_ASSET_BASE_URL:''}});
if(built.status!==0)process.exit(1);
const manifest=r2Manifest(),keyPrefix=`${config.prefix}/${manifest.version}`;
const assetBaseUrl=`https://${config.domain}/${keyPrefix}/`;
const mime={webp:'image/webp',ogg:'audio/ogg',mp3:'audio/mpeg',bin:'application/octet-stream',woff2:'font/woff2',txt:'text/plain; charset=utf-8'};
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
async function upload(item){
 const args=[wrangler,'r2','object','put',`${config.bucket}/${keyPrefix}/${item.file}`,'--file',`${root}/dist/${item.file}`,'--remote','--content-type',mime[item.file.split('.').at(-1)],'--cache-control','public, max-age=31536000, immutable'];
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,CLOUDFLARE_ACCOUNT_ID:config.accountId}});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(item.file+' upload failed: '+output)));});
 console.log('Uploaded',item.file);
}
// Disjoint immutable keys can be uploaded concurrently.
const queue=[...manifest.files];await Promise.all(Array.from({length:4},async()=>{while(queue.length)await upload(queue.shift());}));
const verify=process.argv.includes('--verify');
const checks=[];
if(verify)for(const item of manifest.files){
 let failure;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const response=await fetch(assetBaseUrl+item.file,{headers:{Origin:'https://api.liveinteractivegame.com'},signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length!==item.bytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Hash mismatch');
   if(response.headers.get('access-control-allow-origin')!=='*')throw Error('CORS missing');
   if(!response.headers.get('cache-control')?.includes('immutable'))throw Error('Cache policy missing');
   checks.push({file:item.file,cache:response.headers.get('cf-cache-status'),ray:response.headers.get('cf-ray')});failure=undefined;break;
  }catch(error){failure=error;if(attempt<3)await new Promise(r=>setTimeout(r,3000*(attempt+1)));}
 }
 if(failure)throw Error('Public verification failed for '+item.file+': '+failure);
}
const release={...config,...manifest,assetBaseUrl,publishedAt:new Date().toISOString(),...(verify?{verifiedAt:new Date().toISOString()}:{})};
mkdirSync('/tmp/night-shift-r2',{recursive:true});
writeFileSync(new URL('../deploy/r2-release.json',import.meta.url),JSON.stringify(release,null,2)+'\n');
writeFileSync('/tmp/night-shift-r2/upload-checks.json',JSON.stringify({verification:verify?'passed':'skipped',checks},null,2));
console.log(verify?`Verified ${checks.length} R2 objects by public GET and SHA-256: ${assetBaseUrl}`:`Uploaded ${manifest.files.length} R2 objects; remote verification skipped: ${assetBaseUrl}`);
