import type {Box,Position} from './collision';
import {shadowHull} from './lighting';
export interface Lamp extends Position {radius:number;strength:number;color:string;colorStrength?:number;angle?:number}
/** Exact ray/AABB entry, including parallel rays and a source inside a wall. */
export function rayDistance(source:Position,dx:number,dy:number,box:Box,max:number){
 let entry=0,exit=max;
 for(const [origin,direction,min,size] of [[source.x,dx,box.x,box.width],[source.y,dy,box.y,box.height]]){
  if(Math.abs(direction)<1e-8){if(origin<min||origin>min+size)return max;continue;}
  const a=(min-origin)/direction,b=(min+size-origin)/direction;entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(entry>exit)return max;
 }
 return entry;
}
export function beamFalloff(relativeAngle:number){const a=Math.abs(Math.atan2(Math.sin(relativeAngle),Math.cos(relativeAngle)));const x=Math.max(0,Math.min(1,(.62-a)/.36));return x*x*(3-2*x);}
export class LightRenderer {
 private layer=document.createElement('canvas');private beam=document.createElement('canvas');
 constructor(){this.layer.width=480;this.layer.height=288;this.beam.width=256;this.beam.height=256;const ctx=this.beam.getContext('2d')!,data=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=(x-128)/128,dy=(y-128)/128,r=Math.hypot(dx,dy),radial=Math.max(0,1-r);const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=255;data.data[i+3]=255*Math.pow(radial,.85)*beamFalloff(Math.atan2(dy,dx));}ctx.putImageData(data,0,0);
 }
 render(ctx:CanvasRenderingContext2D,lamps:Lamp[],walls:Box[],props:Box[],player:Position,blackout:boolean){
 if(this.layer.width!==ctx.canvas.width||this.layer.height!==ctx.canvas.height){this.layer.width=ctx.canvas.width;this.layer.height=ctx.canvas.height;}
 ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalCompositeOperation='source-over';ctx.fillStyle=blackout?'rgba(3,6,10,.97)':'rgba(4,8,13,.94)';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
 const layer=this.layer.getContext('2d')!;
 for(const light of lamps){
  layer.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);layer.save();layer.globalCompositeOperation='source-over';
  const angles=Array.from({length:96},(_,i)=>i*Math.PI*2/96);
  for(const b of walls)for(const [x,y] of [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]){const a=Math.atan2(y-light.y,x-light.x);angles.push(...[a-.0001,a,a+.0001].map(v=>(v+Math.PI*2)%(Math.PI*2)));}angles.sort((a,b)=>a-b);
  layer.beginPath();angles.forEach((a,i)=>{const dx=Math.cos(a),dy=Math.sin(a);let d=light.radius;for(const b of walls)d=Math.min(d,rayDistance(light,dx,dy,b,d));const x=(light.x+dx*d)/2,y=(light.y+dy*d)/2;i?layer.lineTo(x,y):layer.moveTo(x,y);});layer.closePath();layer.clip();
  if(light.angle!==undefined){layer.translate(light.x/2,light.y/2);layer.rotate(light.angle);layer.drawImage(this.beam,-light.radius/2,-light.radius/2,light.radius,light.radius);layer.setTransform(1,0,0,1,0,0);}
  else{const g=layer.createRadialGradient(light.x/2,light.y/2,0,light.x/2,light.y/2,light.radius/2);g.addColorStop(0,'#fff');g.addColorStop(.22,'#ffffffcf');g.addColorStop(.6,'#ffffff45');g.addColorStop(1,'#ffffff00');layer.fillStyle=g;layer.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);}
  // Each source loses its own light behind furniture; other lamps can still fill the shadow.
  layer.globalCompositeOperation='destination-out';
  for(const b of props){if(light.x>=b.x&&light.x<=b.x+b.width&&light.y>=b.y&&light.y<=b.y+b.height)continue;if(Math.hypot(b.x+b.width/2-light.x,b.y+b.height/2-light.y)>light.radius+60)continue;
   for(const [length,alpha] of [[light.radius,.32],[light.radius*.65,.36],[light.radius*.3,.4]]){const hull=shadowHull(b,light,length);layer.beginPath();hull.forEach((p,i)=>i?layer.lineTo(p.x/2,p.y/2):layer.moveTo(p.x/2,p.y/2));layer.closePath();layer.rect(b.x/2,b.y/2,b.width/2,b.height/2);layer.fillStyle=`rgba(0,0,0,${alpha})`;layer.fill('evenodd');}
  }
  layer.restore();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=light.strength;ctx.drawImage(this.layer,0,0);
  layer.globalCompositeOperation='source-in';layer.fillStyle=light.color;layer.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=light.colorStrength??.035;ctx.drawImage(this.layer,0,0);ctx.globalAlpha=1;
 }
 // Small contact shadows anchor props without painting opaque long wedges over other lights.
 ctx.globalCompositeOperation='source-over';for(const b of props){const g=ctx.createLinearGradient(0,(b.y+b.height)/2,0,(b.y+b.height+8)/2);g.addColorStop(0,'rgba(0,3,6,.3)');g.addColorStop(1,'rgba(0,3,6,0)');ctx.fillStyle=g;ctx.fillRect(b.x/2,(b.y+b.height)/2,b.width/2,4);}
 // Preserve the sprite itself; the surrounding floor is lit by the occluded lamps above.
 ctx.globalCompositeOperation='destination-out';const local=ctx.createRadialGradient(player.x/2,(player.y-5)/2,3,player.x/2,(player.y-5)/2,16);local.addColorStop(0,'rgba(0,0,0,.38)');local.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=local;ctx.fillRect(player.x/2-16,(player.y-5)/2-16,32,32);ctx.globalCompositeOperation='source-over';
 }
}
