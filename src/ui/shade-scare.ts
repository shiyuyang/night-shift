import './shade-scare.css';
/** Freeze the actual rendered room, then let the apparition emerge from its failing light. */
export class ShadeScare{
 private host=document.createElement('div');private room=document.createElement('canvas');private face=document.createElement('canvas');private animations:Animation[]=[];private version=0;private captureRoom=false;private prepared?:HTMLImageElement|HTMLCanvasElement;
 constructor(parent:HTMLElement){this.host.className='shade-contact-scare';this.host.hidden=true;this.host.setAttribute('aria-hidden','true');this.room.className='shade-scare-room';this.face.className='shade-scare-face';this.face.width=256;this.face.height=170;this.host.append(this.room,this.face);parent.append(this.host);}
 clear(){this.version++;this.animations.forEach(a=>a.cancel());this.animations=[];this.captureRoom=false;this.host.hidden=true;}
 drawFrame(){
  if(!this.captureRoom)return;const source=document.querySelector<HTMLCanvasElement>('#game canvas');if(!source)return;
  this.room.width=source.width;this.room.height=source.height;this.room.getContext('2d')!.drawImage(source,0,0);this.captureRoom=false;
 }
 show(source:HTMLImageElement|HTMLCanvasElement){
  this.clear();const version=this.version;
  if(this.prepared!==source){
   const ctx=this.face.getContext('2d')!;ctx.clearRect(0,0,this.face.width,this.face.height);ctx.imageSmoothingEnabled=true;
   ctx.drawImage(source,0,0,this.face.width,this.face.height);
   // Twelve cold hospital tones and a small logical canvas match the scene's pixel treatment.
   const pixels=ctx.getImageData(0,0,this.face.width,this.face.height);
   for(let i=0;i<pixels.data.length;i+=4){const l=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2],v=Math.round(l/22)*22;pixels.data[i]=v*.87;pixels.data[i+1]=v*.95;pixels.data[i+2]=v*.89;}
   ctx.putImageData(pixels,0,0);this.prepared=source;
  }
  this.captureRoom=true;this.host.hidden=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const face=this.face.animate(reduced?[{opacity:.65},{opacity:0}]:[
   {opacity:0,transform:'scale(.65)',offset:0},
   {opacity:.32,transform:'scale(.88) translateX(-.5%)',offset:.065},
   {opacity:.08,transform:'scale(.94) translateX(.6%)',offset:.115},
   {opacity:.82,transform:'scale(1.04)',offset:.17},
   {opacity:.72,transform:'scale(1.09)',offset:.38},
   {opacity:0,transform:'scale(1.1)',offset:.55},{opacity:0,offset:1}
  ],{duration:1100,fill:'forwards',easing:'linear'});
  const room=this.room.animate([{opacity:1,offset:0},{opacity:.45,offset:.065},{opacity:.65,offset:.115},{opacity:.18,offset:.17},{opacity:.12,offset:.38},{opacity:0,offset:.55},{opacity:0,offset:1}],{duration:1100,fill:'forwards'});
  const veil=this.host.animate([{opacity:1,offset:0},{opacity:1,offset:.76},{opacity:0,offset:1}],{duration:1100,fill:'forwards'});
  this.animations=[face,room,veil];void veil.finished.then(()=>{if(this.version===version)this.clear();}).catch(()=>{});
 }
}
