import './shade-scare.css';
import type {MonsterDeathKind} from '../runtime/death-presentation';
type ScareKind=MonsterDeathKind|'shade';
const poses:Record<ScareKind,{entry:string;reveal:string;close:string}>={
 shade:{entry:'scale(.65)',reveal:'scale(1.04)',close:'scale(1.09)'},
 listener:{entry:'scale(.8) translateX(-18%) rotate(-6deg)',reveal:'scale(1.04) translateX(-3%) rotate(-3deg)',close:'scale(1.13) translateX(2%)'},
 'light-shy':{entry:'scale(.76) translateY(8%)',reveal:'scale(1.04)',close:'scale(1.15) translateY(-3%)'},
 patroller:{entry:'scale(.78) translateX(17%) rotate(8deg)',reveal:'scale(1.06) rotate(-3deg)',close:'scale(1.16) translateY(-4%) rotate(-7deg)'},
 weeper:{entry:'scale(.7) translateY(20%) rotate(5deg)',reveal:'scale(1.08) translateY(1%)',close:'scale(1.18) translateY(-3%)'},
};
/** Freeze the actual room; all portraits share the shade's low-resolution cold palette. */
export class ShadeScare{
 private host=document.createElement('div');private room=document.createElement('canvas');private face=document.createElement('canvas');private animations:Animation[]=[];private version=0;private captureRoom=false;private prepared?:HTMLImageElement|HTMLCanvasElement;
 private result?:HTMLElement;private resultVisibility='';private resultInert=false;
 constructor(parent:HTMLElement){this.host.className='shade-contact-scare';this.host.hidden=true;this.host.setAttribute('aria-hidden','true');this.room.className='shade-scare-room';this.face.className='shade-scare-face';this.face.width=256;this.face.height=170;this.host.append(this.room,this.face);parent.append(this.host);}
 clear(completed=false){this.version++;this.animations.forEach(a=>a.cancel());this.animations=[];this.captureRoom=false;this.host.hidden=true;if(this.result){this.result.style.visibility=this.resultVisibility;this.result.inert=this.resultInert;if(completed&&!this.result.hidden)this.result.querySelector<HTMLElement>('#result-retry')?.focus({preventScroll:true});this.result=undefined;}}
 drawFrame(){
  if(!this.captureRoom)return;const source=document.querySelector<HTMLCanvasElement>('#game canvas');if(!source)return;
  this.room.width=source.width;this.room.height=source.height;this.room.getContext('2d')!.drawImage(source,0,0);this.captureRoom=false;
 }
 show(source:HTMLImageElement|HTMLCanvasElement,kind:ScareKind='shade'){
  this.clear();const version=this.version;this.host.dataset.kind=kind;
  if(this.prepared!==source){
   const ctx=this.face.getContext('2d')!;ctx.clearRect(0,0,this.face.width,this.face.height);ctx.imageSmoothingEnabled=true;
   ctx.drawImage(source,0,0,this.face.width,this.face.height);
   const pixels=ctx.getImageData(0,0,this.face.width,this.face.height);
   for(let i=0;i<pixels.data.length;i+=4){const l=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2],v=Math.round(l/22)*22;pixels.data[i]=v*.87;pixels.data[i+1]=v*.95;pixels.data[i+2]=v*.89;}
   ctx.putImageData(pixels,0,0);this.prepared=source;
  }
  this.result=this.host.parentElement?.querySelector<HTMLElement>('#result-screen')??undefined;
  if(this.result){this.resultVisibility=this.result.style.visibility;this.resultInert=this.result.inert;this.result.inert=true;this.result.style.visibility='hidden';}
  this.captureRoom=true;this.host.hidden=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,pose=poses[kind],duration=1100;
  const face=this.face.animate(reduced?[{opacity:.65},{opacity:0}]:[
   {opacity:0,transform:pose.entry,offset:0},
   {opacity:.32,transform:pose.entry,offset:.065},
   {opacity:.08,transform:pose.entry,offset:.115},
   {opacity:.82,transform:pose.reveal,offset:.17},
   {opacity:.72,transform:pose.close,offset:.38},
   {opacity:0,transform:pose.close,offset:.55},{opacity:0,offset:1}
  ],{duration,fill:'forwards',easing:'linear'});
  const room=this.room.animate(reduced?[{opacity:1},{opacity:0}]:[{opacity:1,offset:0},{opacity:.45,offset:.065},{opacity:.65,offset:.115},{opacity:kind==='shade'?.18:.035,offset:.17},{opacity:kind==='shade'?.12:.02,offset:.38},{opacity:0,offset:.55},{opacity:0,offset:1}],{duration,fill:'forwards'});
  const veil=this.host.animate([{opacity:1,offset:0},{opacity:1,offset:.76},{opacity:0,offset:1}],{duration,fill:'forwards'});
  this.animations=[face,room,veil];void veil.finished.then(()=>{if(this.version===version)this.clear(true);}).catch(()=>{});
 }
}
