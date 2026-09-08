import {t,stageName,canvasFont} from '../i18n';
import {assetUrl} from '../runtime/asset-url';
import type {Level} from '../levels';
const scenes=['ward','warehouse','plant'] as const;
const images=new Map<string,Promise<HTMLImageElement>>();
function loadImage(file:string){
 let pending=images.get(file);
 if(!pending){pending=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(file);reject(new Error('Archive image unavailable'));};image.crossOrigin="anonymous";image.src=assetUrl(file);});images.set(file,pending);}
 return pending;
}
/** Authored location stills, rendered on the same fixed pixel grid as the archive. */
export function drawSurvey(canvas:HTMLCanvasElement,level:Level){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 // Clinical archive stills use authored geometry, without revealing randomized loot.
 if(level.theme>=3){
  canvas.dataset.scene=level.theme===3?'outpatient':level.theme===4?'surgery':level.theme===5?'morgue':'garden';canvas.dataset.loaded='true';
  canvas.setAttribute('aria-label',t('survey.alt',{name:stageName(level.theme)}));
  ctx.fillStyle='#142122';ctx.fillRect(0,0,240,144);ctx.save();ctx.scale(240/level.width,144/level.height);
  ctx.fillStyle=level.theme===3?'#44463e':'#344b4c';ctx.fillRect(level.bounds.x,level.bounds.y,level.bounds.width,level.bounds.height);
  ctx.fillStyle='#7a8980';for(const b of level.walls)ctx.fillRect(b.x,b.y,b.width,b.height);
  for(const b of level.props){ctx.fillStyle=b.kind==='seating'?'#91aaa0':b.kind==='operatingtable'?'#a4c6b6':'#607a71';ctx.fillRect(b.x,b.y,b.width,b.height);}
  ctx.restore();ctx.fillStyle='#07101030';for(let y=3;y<144;y+=4)ctx.fillRect(0,y,240,1);return;
 }
 const theme=scenes[level.theme]??scenes[0],file=`/assets/archive-${theme}-v1.q95.webp`;
 canvas.dataset.scene=theme;canvas.dataset.loaded='false';
 canvas.setAttribute('aria-label',t('survey.alt',{name:stageName(level.theme)}));
 ctx.fillStyle='#182322';ctx.fillRect(0,0,240,144);
 void loadImage(file).then(image=>{
  // A slow previous request must not overwrite a more recently selected scene.
  if(canvas.dataset.scene!==theme)return;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,240,144);
  // Subtle screen texture, drawn in internal pixels so it scales with the still.
  ctx.fillStyle='#07101018';for(let y=3;y<144;y+=4)ctx.fillRect(0,y,240,1);
  canvas.dataset.loaded='true';
 }).catch(()=>{
  if(canvas.dataset.scene!==theme)return;
  ctx.fillStyle='#adb193';ctx.font='12px '+canvasFont()+', NightPixel, sans-serif';ctx.fillText(t('survey.error'),12,76);canvas.dataset.loaded='error';
 });
}
