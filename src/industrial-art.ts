import type Phaser from 'phaser';
import type {Box} from './collision';

/** Racks and engine housings occupy their authored footprint; no scaled bed/crate art. */
export function drawIndustrialProp(g:Phaser.GameObjects.Graphics,b:Box&{kind:'rack'|'engine'}){
 const r=(x:number,y:number,w:number,h:number,color:number)=>{g.fillStyle(color);g.fillRect(x,y,w,h);};
 r(b.x,b.y,b.width,b.height,0x162325);
 if(b.kind==='rack'){
  r(b.x+3,b.y+3,b.width-6,b.height-7,0x796c52);
  for(let y=b.y+8;y<b.y+b.height-15;y+=24){
   r(b.x+6,y,b.width-12,2,0xb1a887);
   for(let x=b.x+8;x<b.x+b.width-10;x+=12){r(x,y+5,8,12,0xaaa88b);r(x+1,y+7,6,3,0x657e72);}
   r(b.x+6,y+20,b.width-12,2,0x303d35);
  }
  r(b.x,b.y,3,b.height,0x485849);r(b.x+b.width-3,b.y,3,b.height,0x485849);
 }else{
  r(b.x+3,b.y+3,b.width-6,b.height-8,0x4f686a);
  r(b.x+6,b.y+5,b.width-12,3,0x8d9a86);
  for(let x=b.x+12;x<b.x+b.width-24;x+=32){
   r(x,b.y+16,24,b.height-36,0x263d43);
   for(let y=b.y+21;y<b.y+b.height-23;y+=7)r(x+3,y,18,2,0x6e8280);
  }
  r(b.x+b.width-25,b.y+13,15,21,0x12292e);r(b.x+b.width-21,b.y+18,7,3,0x8dbb94);
  for(let x=b.x+8;x<b.x+b.width-8;x+=16)r(x,b.y+b.height-8,7,4,0xb4a56c);
 }
}

/** Flush floor conduits are decoration, never collision obstacles. */
export function drawFloorPipes(g:Phaser.GameObjects.Graphics,zones:Record<string,Box>){
 for(const [id,b]of Object.entries(zones)){
  if(!id.startsWith('Pipe')||!id.endsWith('Zone'))continue;
  g.fillStyle(0x17282b);g.fillRect(b.x,b.y,b.width,b.height);
  const horizontal=b.width>b.height;
  g.fillStyle(0x536968);g.fillRect(b.x+2,b.y+2,horizontal?b.width-4:3,horizontal?3:b.height-4);
  g.fillStyle(0x9c9873);
  for(let offset=16;offset<(horizontal?b.width:b.height)-8;offset+=64)g.fillRect(b.x+(horizontal?offset:0),b.y+(horizontal?0:offset),horizontal?4:b.width,horizontal?b.height:4);
 }
}
