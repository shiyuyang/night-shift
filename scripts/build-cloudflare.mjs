/** Publish only code here; media must already be uploaded to R2. */
import {readFileSync,writeFileSync,mkdirSync,rmSync,copyFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {r2Manifest} from './r2-manifest.mjs';
const release=JSON.parse(readFileSync('deploy/r2-release.json'));
const env={...process.env,GAME_BASE_PATH:'/night-shift/',VITE_ASSET_BASE_URL:release.assetBaseUrl};
execFileSync('npm',['run','build'],{env,stdio:'inherit'});
const current=r2Manifest();
assert.equal(current.version,release.version,'Media changed; run npm run assets:publish');
assert.deepEqual(current.files,release.files,'Media changed; run npm run assets:publish');
const report=JSON.parse(readFileSync('dist/delivery-report.json'));
const files=report.files.filter(f=>f.file==='index.html'||/^assets\/[\w-]+\.(js|css)$/.test(f.file));
assert.equal(files.filter(f=>f.file.endsWith('.html')).length,1);
assert.ok(files.some(f=>f.file.endsWith('.js')),'Missing JavaScript build output');
assert.equal(files.filter(f=>f.file.endsWith('.css')).length,1);
rmSync('dist-cloudflare',{recursive:true,force:true});
for(const {file} of files){const target='dist-cloudflare/night-shift/'+file;mkdirSync(dirname(target),{recursive:true});copyFileSync('dist/'+file,target);}
writeFileSync('dist-cloudflare/_headers',`/night-shift/*
  X-Content-Type-Options: nosniff
  X-Night-Shift-Hosting: cloudflare-static
/night-shift/
  Cache-Control: no-cache
/night-shift/index.html
  Cache-Control: no-cache
/night-shift/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
writeFileSync('dist-cloudflare-manifest.json',JSON.stringify({builtAt:new Date().toISOString(),assetBaseUrl:release.assetBaseUrl,files},null,2)+'\n');
console.log('Cloudflare delivery: '+files.length+' HTML/JS/CSS files; media remains in R2.');
