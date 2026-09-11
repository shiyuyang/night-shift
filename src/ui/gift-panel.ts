import {t,escapeHtml as esc,canvasFont,isolate,getLocale} from '../i18n';
import type {GiftView,GiftEntry,GiftKind} from '../runtime/live-gifts';
import './gift-panel.css';
import {giftSignalBeat} from './gift-signal';
import {shadeRules} from '../runtime/gift-shade';
const glyph:Record<GiftKind,string>={battery:'▰',flash:'✴',heal:'＋',failure:'ϟ',warp:'↝',shade:'◈'};
const name=(kind:GiftKind)=>t(`gift.${kind}`);
const count=(n:number)=>t('gift.quantity',{count:n});
const time=(n:number)=>t('gift.remaining',{seconds:Math.ceil(n)});
function portrait(e:GiftEntry){const safe=e.avatar&&/^https?:\/\//.test(e.avatar)?e.avatar:'';return `<span class="gift-photo"><span aria-hidden="true">${esc([...e.viewer][0]??'?')}</span>${safe?`<img src="${esc(safe)}" alt="" referrerpolicy="no-referrer">`:''}</span>`;}
function identity(e:GiftEntry){return `${portrait(e)}<bdi class="gift-name" title="${esc(e.viewer)}">${esc(e.viewer)}</bdi>`;}
export class GiftPanel {
 private frameFx:{warp:number;tear:number;shade?:{x:number;y:number}}={warp:-1,tear:0};
 private host=document.createElement('aside');private fx=document.createElement('canvas');private signature='';private serial=0;private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(parent:HTMLElement){this.host.className='gift-panel';this.fx.className='gift-screen-fx';this.fx.setAttribute('aria-hidden','true');const stage=document.createElement('div');stage.className='gift-overlay-stage';stage.append(this.host);parent.append(stage,this.fx);this.host.addEventListener('load',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!img.naturalWidth)return;const canvas=document.createElement('canvas');canvas.width=18;canvas.height=20;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d')!;const scale=Math.max(18/img.naturalWidth,20/img.naturalHeight);ctx.drawImage(img,(18-img.naturalWidth*scale)/2,(20-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);img.replaceWith(canvas);},true);this.host.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement){const slot=img.parentElement!;img.remove();slot.textContent='◈';}},true);}
 render(view:GiftView,fx:{warp:number;tear:number;reserve:number;shade?:{x:number;y:number};player?:{x:number;y:number}}){
  this.host.style.fontFamily=canvasFont()+', system-ui, sans-serif';this.host.dir=document.documentElement.dir;
  const signature=JSON.stringify([getLocale(),view.notice,view.active&&[view.active.entry,Math.ceil(view.active.remaining)],Math.ceil(view.shade),view.shadeOwner,view.queue,view.pending,Math.ceil(view.wait),view.reason,Math.ceil(fx.reserve)]);
  if(signature!==this.signature){this.signature=signature;
   const n=view.notice;let html='';
   if(n){const buff=['battery','flash','heal'].includes(n.kind),status=n.status==='added'?t('gift.added',{seconds:n.value}):t(`gift.${n.status}`);
    html+=`<section class="gift-receipt ${buff?'is-aid':'is-prank'}" role="status"><header><i></i>${esc(t('gift.record'))}<span>${esc(count(n.count))}</span></header><div class="gift-sender">${identity(n)}</div><div class="gift-action"><span aria-hidden="true">${glyph[n.kind]}</span><strong>${esc(name(n.kind))}</strong><em>${esc(status)}</em></div><div class="gift-receipt-rule"></div></section>`;
   }
   if(view.active||view.shade>0||fx.reserve>0){html+=`<section class="gift-live"><h3>${esc(t('gift.active'))}${view.reason==='paused'?`<span>${esc(t('gift.paused'))}</span>`:''}</h3>`;
    const row=(e:GiftEntry,remaining:number)=>`<div class="gift-live-row"><div><b>${esc(name(e.kind))}</b><bdi>${esc(e.viewer)}</bdi></div><time>${esc(time(remaining))}</time></div>`;
    if(view.shade>0&&view.shadeOwner)html+=row(view.shadeOwner,view.shade);
    if(view.active)html+=row(view.active.entry,view.active.remaining);
    if(fx.reserve>0)html+=`<p class="gift-reserve">${esc(t('gift.reserve',{amount:Math.ceil(fx.reserve)}))}</p>`;
    html+='</section>';
   }
   if(view.pending){html+=`<section class="gift-wait"><h3>${esc(t('gift.pending'))}<span>${esc(count(view.pending))}</span></h3>`;
    for(const e of view.queue)html+=`<div class="gift-queue-row"><div><bdi>${esc(e.viewer)}</bdi><span>${esc(name(e.kind))}</span></div><strong>${esc(count(e.count))}</strong></div>`;
    const more=view.pending-view.queue.reduce((sum,e)=>sum+e.count,0);if(more>0)html+=`<p>${esc(t('gift.more',{count:more}))}</p>`;
    if(view.reason)html+=`<footer>${esc(t(`gift.${view.reason}`))}${view.wait>0?` · ${esc(time(view.wait))}`:''}</footer>`;
    html+='</section>';
   }
   this.host.innerHTML=html;this.host.hidden=!html;
   if(n&&this.serial!==n.serial){this.serial=n.serial;this.host.querySelector('.gift-receipt')?.animate([{transform:'translateY(-5px)'},{transform:'translateY(0)'}],{duration:220});}
  }
  const canvas=document.querySelector<HTMLCanvasElement>('#game canvas');
  if(canvas&&fx.player){
   const rect=canvas.getBoundingClientRect(),scale=rect.width/1280,x=rect.left+fx.player.x*rect.width,y=rect.top+fx.player.y*rect.height;
   for(const section of Array.from(this.host.querySelectorAll<HTMLElement>('section'))){
    const box=section.getBoundingClientRect();
    const distance=Math.hypot(Math.max(box.left-x,0,x-box.right),Math.max(box.top-y,0,y-box.bottom));
    section.style.opacity=String(.16+.84*Math.min(1,Math.max(0,(distance/scale-32)/80)));
   }
  }
  this.frameFx=fx;
  if(fx.warp<0&&fx.tear<=0)this.fx.hidden=true;
 }
 drawFrame(){this.drawFx(this.frameFx);}
 private drawFx(fx:{warp:number;tear:number;shade?:{x:number;y:number}}){
  const canvas=this.fx;canvas.hidden=fx.warp<0&&fx.tear<=0;if(canvas.hidden)return;
  const source=document.querySelector<HTMLCanvasElement>('#game canvas');if(!source)return;
  const width=source.width,height=source.height;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,width,height);const warp=fx.warp>=0,phase=warp?fx.warp:fx.tear;
  if(warp&&phase>.55&&phase<1.35){ctx.fillStyle='#020605';ctx.fillRect(0,0,width,height);return;}
  const reduced=this.reducedMotion.matches;
  const progress=warp?(phase<.55?phase/.55:(phase-1.35)/.65):1-fx.tear/shadeRules.flickerSeconds;
  const beat=reduced?.15:giftSignalBeat(Math.max(0,Math.min(1,progress)));
  if(beat===0)return;
  // Like the title screen, the light drops before three narrow image slices slip.
  ctx.fillStyle=`rgba(2,6,7,${beat*.48})`;ctx.fillRect(0,0,width,height);
  if(reduced)return;
  const center=fx.shade?.y??.5,scale=width/1280,reverse=progress>.625?-1:1;
  for(let i=0;i<3;i++){
   const y=Math.max(0,Math.min(height-1,(center+[-.055,-.015,.028][i])*height));
   const h=Math.min(height-y,Math.max(2,[.008,.015,.005][i]*height));
   const dx=[5,-7,3][i]*scale*reverse;
   ctx.globalAlpha=beat;ctx.drawImage(source,0,y,width,h,dx,y,width,h);
   ctx.fillStyle='rgba(125,145,137,.09)';ctx.fillRect(0,y,width,1);
  }
  ctx.globalAlpha=1;

 }
}
