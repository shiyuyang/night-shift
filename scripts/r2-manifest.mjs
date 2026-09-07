import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {deliveryFiles} from './prepare-delivery.mjs';
export function r2Manifest(){
 const files=deliveryFiles().map(file=>{const bytes=readFileSync(new URL('../public/'+file,import.meta.url));return {file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
 return {version:createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,16),files};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(r2Manifest()));
