import type Phaser from 'phaser';
import type {Level} from './levels';
import type {Lamp} from './light-renderer';
export function floorWear(g:Phaser.GameObjects.Graphics,level:Level){
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 // Deterministic clusters: water at edges, scuff trails, paper scraps; not uniform noise.
 for(let i=0;i<Math.ceil(65*level.bounds.width*level.bounds.height/(846*389));i++){const x=level.bounds.x+12+(i*137+level.theme*51)%Math.max(1,level.bounds.width-42),y=level.bounds.y+13+(i*83)%Math.max(1,level.bounds.height-30);const blood=i%9===0;for(let j=0;j<5;j++)r(x+j*3,y+(j*j)%7,9-j,2+j%2,blood?0x49302e:0x26302e);if(i%4===0){r(x+5,y-2,7,5,0x686754);r(x+6,y-1,4,1,0x393e34);}if(i%3===0){r(x-7,y+6,2,7,0x1d292b);r(x-4,y+11,6,2,0x1d292b);}}
 // Larger worn patches remain legible at the expanded map's camera scale.
 for(let i=0;i<Math.ceil(level.bounds.width*level.bounds.height/18000);i++){
  const x=level.bounds.x+18+(i*173+level.theme*29)%(level.bounds.width-90),y=level.bounds.y+18+(i*109)%(level.bounds.height-70);
  for(let j=0;j<8;j++)r(x+(j*7)%17,y+j*3,23+(j*11)%19,3,j%3===0?0x29332e:0x25302e);
  r(x+11,y+12,16,2,0x515247);
 }
 for(let i=0;i<23;i++){const x=level.spawn.x+22+i*13,y=level.spawn.y+Math.sin(i*.5)*17;r(x,y,3,5,0x28302e);r(x+6,y+5,3,5,i>15?0x4c302d:0x242b2b);}
 // Seepage follows wall feet and equipment, so wear explains how the space aged.
 for(const [index,b]of level.walls.entries()){
  if(b.width<60)continue;
  for(let k=0;k<Math.ceil(b.width/95);k++){
   const x=b.x+8+k*85,y=b.y+b.height;
   for(let j=0;j<7;j++)r(x+j*5,y+2+(j*7+index)%5,14+(j*11)%18,3+(j*3)%6,0x202c2b);
   r(x+12,y+5,20,2,0x485047);
  }
 }
 for(const [i,b]of level.props.entries()){
  if(i%2)continue;const x=b.x+5,y=b.y+b.height+3;
  for(let j=0;j<8;j++)r(x+j*3,y+j*2,6+(j%3)*3,2,j%3===0?0x49332e:0x202b29);
 }

}
export function smallLights(g:Phaser.GameObjects.Graphics,time:number,changed:boolean,level?:Level):Lamp[]{
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 const anchor=(id:string,x:number,y:number)=>level?.zones[id]??{x,y};
 let origin=anchor('DressPhoneZone',205,284),ox=origin.x-205,oy=origin.y-284;
 const raw=r,at=(x:number,y:number,w:number,h:number,c:number)=>raw(x+ox,y+oy,w,h,c);
 // Old wall telephone and its amber indicator.
 at(205,284,12,19,0x332d28);at(207,287,8,13,0x161e20);at(208,285,6,3,0x9d7844);at(210,304,1,8,0x353b34);
 const phone={x:211+ox,y:291+oy};origin=anchor('DressCrtZone',520,330);ox=origin.x-520;oy=origin.y-330;
 // CRT bedside station: phosphor remains dim rather than filling a whole room.
 at(520,330,19,15,0x3d4844);at(523,332,13,9,0x183b34);at(524,335,8,1,0x779e7a);at(527,345,5,3,0x323c37);
 const crt={x:530+ox,y:337+oy};origin=anchor('DressMemorialZone',746,285);ox=origin.x-746;oy=origin.y-285;
 // Glass memorial lamp, beside an old paper charm rather than a glowing orb.
 at(746,285,9,16,0x49362c);at(748,288,5,9,0x9b4e32);at(750,290,1,5,0xe0a867);at(737,284,5,15,0xa99c75);at(739,287,1,8,0x6f4235);
 const memorial={x:751+ox,y:293+oy};origin=anchor('DressDollZone',870,350);ox=origin.x-870;oy=origin.y-350;
 // A small doll turns away after the first search; a quiet visual discrepancy.
 at(871,350,8,8,0x2b2426);at(changed?872:875,351,3,5,0x978b78);at(870,358,10,12,0x56383a);at(873,362,4,1,0x817256);
 return [{...phone,radius:43,strength:.32,color:'#b88948'}, {...crt,radius:57,strength:.36,color:'#639c89'}, {...memorial,radius:48,strength:.34+Math.sin(time*2)*.025,color:'#c46b39'}];
}
