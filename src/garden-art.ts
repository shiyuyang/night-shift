import type Phaser from 'phaser';
import type {Level} from './levels';
import type {Box} from './collision';
export const gardenKinds=['fountain','hedge','tree','gardenbench','wheelchair','planter'];
const rect=(g:Phaser.GameObjects.Graphics)=>(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
/** Modern Japanese hospital courtyard: wet concrete, clipped shrubs, gravel and spare planting. */
export function drawGardenGround(g:Phaser.GameObjects.Graphics,l:Level){
 const r=rect(g),b=l.bounds;r(b.x,b.y,b.width,b.height,0x25322f);
 // Fine gravel is concentrated in planting ground; wide concrete paths remain easy to read.
 for(let i=0;i<2600;i++){const x=b.x+(i*137)%b.width,y=b.y+(i*83+Math.floor(i/9)*19)%b.height;r(x,y,2,1,i%3===0?0x53605a:0x35423d);}
 for(const [id,p]of Object.entries(l.zones))if(id.endsWith('PathZone')){
  r(p.x-3,p.y-3,p.width+6,p.height+6,0x192a2c);r(p.x,p.y,p.width,p.height,0x485756);
  for(let x=p.x+32;x<p.x+p.width;x+=48)r(x,p.y,1,p.height,0x344543);
  for(let y=p.y+30;y<p.y+p.height;y+=48)r(p.x,y,p.width,1,0x344543);
 }
 for(const id of ['GatehouseZone','GreenhouseZone','ToolStoreZone']){const z=l.zones[id];r(z.x-14,z.y-16,z.width+28,z.height+32,0x3c4a49);}
 // Broken silhouettes and short reflected strips make water sit in the paving.
 for(const [x,y,w]of [[165,460,82],[355,285,45],[715,575,105],[885,288,75],[1070,457,96]]){
  for(let j=0;j<7;j++){const inset=(j*j*7)%19;r(x+inset,y+j*3,w-inset-(j*11)%24,3,j%3===0?0x293b3d:0x243638);}
  r(x+13,y+6,w/3,1,0x6b7f7c);r(x+w/2,y+12,w/5,1,0x526b6b);
 }
 for(const [id,p]of Object.entries(l.zones))if(id.endsWith('PathZone')){
  // Moss collects along joints and gutters; broad path centers stay readable.
  for(let i=0;i<Math.ceil((p.width+p.height)/12);i++){
   const horizontal=p.width>p.height,x=p.x+(horizontal?(i*31)%p.width:i%2?p.width-6:1),y=p.y+(horizontal?(i%2?p.height-6:1):(i*29)%p.height);
   r(x,y,4+i%5,2+i%3,0x2b3b32);r(x+2,y+2,3,2,0x465346);
  }
  for(let i=0;i<Math.floor(p.width*p.height/2200);i++){
   const x=p.x+8+(i*47)%Math.max(1,p.width-20),y=p.y+8+(i*37)%Math.max(1,p.height-20);
   for(let j=0;j<4;j++)r(x+j*3,y+j%2,4,2,0x303f3e);
  }
 }
 // Leaves catch beneath benches and against planting borders rather than scatter evenly.
 for(const p of l.props.filter(p=>['hedge','gardenbench','planter'].includes(p.kind)))for(let i=0;i<18;i++){
  const x=p.x+(i*17)%p.width,y=p.y+p.height+2+(i*7)%13;
  r(x,y,3+i%3,2,i%3===0?0x817356:0x514e3c);if(i%4===0)r(x+1,y+2,2,2,0x313d32);
 }
 for(let i=0;i<16;i++){const x=585+Math.sin(i*.22)*18,y=252+i*5;r(x,y,3,5,0x263634);r(x+9,y+3,3,5,0x2d3b38);}


}
export function drawGardenWall(g:Phaser.GameObjects.Graphics,b:Box,l:Level){
 const r=rect(g),glass=l.zones.GlassZone;
 const inGlass=b.x>=glass.x&&b.x+b.width<=glass.x+glass.width&&b.y<242;
 if(inGlass){
  r(b.x,b.y,b.width,b.height,0x708784);r(b.x+2,b.y+2,Math.max(1,b.width-4),Math.max(1,b.height-4),0x314b51);
  if(b.width>b.height){for(let x=b.x+10;x<b.x+b.width;x+=28){r(x,b.y,2,b.height,0x90a09b);r(x+3,b.y+3,8,2,0x657c80);}}
  else for(let y=b.y+12;y<b.y+b.height;y+=28){r(b.x,y,b.width,2,0x90a09b);r(b.x+3,y+3,2,10,0x657c80);}
 }else{
  r(b.x,b.y,b.width,b.height,0x243439);r(b.x+1,b.y+1,Math.max(1,b.width-2),Math.max(1,b.height-4),0x64726c);r(b.x,b.y+b.height-3,b.width,3,0x344546);
  for(let i=0;i<Math.floor(b.width/23);i++){const xx=b.x+7+i*23;r(xx,b.y+2,3,Math.max(2,b.height-4),0x46574f);r(xx+3,b.y+b.height-4,7,2,0x3a4b43);}
  if(b.width>100)for(let x=b.x+25;x<b.x+b.width;x+=48)r(x,b.y,1,b.height,0x465652);
 }
}
export function drawGardenProp(g:Phaser.GameObjects.Graphics,b:Box&{kind:string}){
 const r=rect(g),{x,y,width:w,height:h}=b;
 if(b.kind==='fountain'){
  // Drained rectangular basin: concrete coping, stepped interior, leaf-filled sump.
  r(x,y,w,h,0x1c2c30);r(x+2,y+2,w-4,h-5,0x839087);r(x+8,y+8,w-16,h-16,0x3e5153);
  r(x+14,y+14,w-28,h-30,0x202f34);r(x+19,y+19,w-38,h-42,0x2a3d40);
  for(let i=0;i<28;i++){const xx=x+20+(i*43)%(w-48),yy=y+23+(i*19)%(h-60);r(xx,yy,9+i%7,3,0x213332);if(i%3===0)r(xx+4,yy+3,5,2,0x415044);}
  for(let j=0;j<19;j++){const inset=(j*j*3)%12;r(x+49+inset,y+35+j*3,67-inset-j%4*3,3,0x192b30);}
  r(x+17,y+h-27,w-34,4,0x596b67);r(x+7,y+7,w-14,2,0xa0aaa0);
  r(x+w/2-18,y+h/2-9,36,22,0x172c32);for(let i=0;i<6;i++)r(x+w/2-15+i*5,y+h/2-7,2,18,0x647570);
  for(let i=0;i<12;i++)r(x+25+(i*31)%(w-50),y+30+(i*17)%(h-65),4,2,0x685e44);
 }else if(b.kind==='hedge'||b.kind==='planter'){
  r(x,y,w,h,0x263b34);r(x+2,y+2,w-4,h-4,b.kind==='planter'?0x728075:0x172e29);
  const inset=b.kind==='planter'?5:3;
  r(x+inset,y+inset,w-inset*2,h-inset*2,0x304c3d);
  for(let i=0;i<Math.floor(w*h/13);i++){
   const xx=x+inset+(i*47+Math.floor(i/7)*13)%Math.max(1,w-inset*2-4),yy=y+inset+(i*31+Math.floor(i/9)*17)%Math.max(1,h-inset*2-3);
   r(xx,yy,3,2,[0x526951,0x203e33,0x405e47,0x647956][i%4]);if(i%3===0)r(xx+2,yy-1,2,1,0x698168);
  }
 }else if(b.kind==='tree'){
  r(x+w/2-5,y+20,10,h-20,0x35423b);r(x+w/2-2,y+20,3,h-20,0x7a7862);
  // Sparse layered canopy; irregular clusters avoid the silhouette of a solid wall.
  for(const [dx,dy,ww,hh]of [[7,2,32,12],[0,15,42,13],[8,29,40,14],[2,42,32,12]]){
   r(x+dx,y+dy,Math.min(w-dx,ww),hh,0x223e35);r(x+dx+3,y+dy+2,Math.min(w-dx-4,ww-5),5,0x59705a);
   r(x+dx+8,y+dy+7,Math.min(w-dx-8,ww-12),3,0x3f5b46);
  }
 }else if(b.kind==='gardenbench'){
  r(x+5,y+10,4,h-10,0x142a2d);r(x+w-9,y+10,4,h-10,0x142a2d);
  for(let i=0;i<4;i++){r(x,y+i*5,w,4,0x728078);r(x+2,y+i*5,w-4,1,0x9da49a);}r(x+3,y+2,2,20,0x2d4648);r(x+w-5,y+2,2,20,0x2d4648);
 }else{
  r(x,y+10,5,h-10,0x182d33);r(x+w-5,y+10,5,h-10,0x182d33);r(x+1,y+12,2,h-15,0x9ba9a4);r(x+w-3,y+12,2,h-15,0x9ba9a4);
  r(x+7,y+4,w-14,11,0x657f7b);r(x+7,y+18,w-14,17,0x456162);r(x+9,y+35,w-18,3,0x9caeaa);r(x+3,y+16,w-6,3,0xa1ada4);
 }
}
export function drawGardenLamps(g:Phaser.GameObjects.Graphics,l:Level,strength:(id:string,fallback:number)=>number,time:number,bloodMoon=0){
 const r=rect(g);
 // Distant institutional facade: repeated dark windows, just two lit rooms.
 r(38,97,1200,10,0x17272d);
 for(let x=62,i=0;x<1220;x+=76,i++){r(x,75,38,17,0x14272f);r(x+2,77,34,12,i===4||i===10?0x88998c:0x324951);r(x+18,77,2,13,0x192c32);}
 for(const lamp of l.lamps){const on=strength(lamp.id,lamp.strength)>.15;
  r(lamp.x-4,lamp.y+8,8,4,0x192a2e);r(lamp.x-1,lamp.y-20,3,30,0x7c8b86);r(lamp.x-11,lamp.y-24,24,6,0x283d42);r(lamp.x-8,lamp.y-22,18,3,on?(bloodMoon>.5?0xe66a62:0xc3d3c6):0x4b6061);
 }
 // The blood moon is seen as a broken reflection in rainwater on the drained basin floor.
 const basin=l.props.find(p=>p.kind==='fountain');
 if(basin){
  const cx=basin.x+82,cy=basin.y+64;
  for(let j=-16;j<=16;j+=2){
   const half=Math.floor(Math.sqrt(16*16-j*j)),drift=Math.round(Math.sin(time*.8+j*.7)*2);
   if(j===-4||j===8)continue;
   r(cx-half+drift,cy+j,half*2,2,j%6===0?0x743539:0xa44d49);
   if(j>0)r(cx-half+drift+3,cy+j,Math.max(1,half-5),1,0x563034);
  }
  for(let i=0;i<4;i++)r(cx-13+i*3,cy+24+i*5,26-i*5,1,0x683638);
 }
 // Thin rain traces drift without obscuring doors or interaction markers.
 for(let i=0;i<24;i++){const x=70+(i*137+time*13)%1140,y=110+(i*83+time*60)%585;r(x,y,1,5,0x536e71);}
}
