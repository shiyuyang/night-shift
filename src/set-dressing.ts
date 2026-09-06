import type Phaser from 'phaser';
import type {Level} from './levels';
import type {Lamp} from './light-renderer';
export function floorWear(g:Phaser.GameObjects.Graphics,level:Level){
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 // Deterministic clusters: water at edges, scuff trails, paper scraps; not uniform noise.
 for(let i=0;i<65;i++){const x=48+(i*137+level.theme*51)%846,y=103+(i*83)%389;const blood=i%9===0;for(let j=0;j<5;j++)r(x+j*3,y+(j*j)%7,9-j,2+j%2,blood?0x49302e:0x26302e);if(i%4===0){r(x+5,y-2,7,5,0x686754);r(x+6,y-1,4,1,0x393e34);}if(i%3===0){r(x-7,y+6,2,7,0x1d292b);r(x-4,y+11,6,2,0x1d292b);}}
 for(let i=0;i<23;i++){const x=480+i*13,y=318+Math.sin(i*.5)*17;r(x,y,3,5,0x28302e);r(x+6,y+5,3,5,i>15?0x4c302d:0x242b2b);}
 for(const b of level.walls){if(b.width<80)continue;for(let i=0;i<4;i++)r(b.x+9+i*11,b.y+b.height+2,14-i*2,3+i%2,0x202b2c);}
}
export function smallLights(g:Phaser.GameObjects.Graphics,time:number,changed:boolean):Lamp[]{
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 // Old wall telephone and its amber indicator.
 r(205,284,12,19,0x332d28);r(207,287,8,13,0x161e20);r(208,285,6,3,0x9d7844);r(210,304,1,8,0x353b34);
 // CRT bedside station: phosphor remains dim rather than filling a whole room.
 r(520,330,19,15,0x3d4844);r(523,332,13,9,0x183b34);r(524,335,8,1,0x779e7a);r(527,345,5,3,0x323c37);
 // Glass memorial lamp, beside an old paper charm rather than a glowing orb.
 r(746,285,9,16,0x49362c);r(748,288,5,9,0x9b4e32);r(750,290,1,5,0xe0a867);r(737,284,5,15,0xa99c75);r(739,287,1,8,0x6f4235);
 // A small doll turns away after the first search; a quiet visual discrepancy.
 r(871,350,8,8,0x2b2426);r(changed?872:875,351,3,5,0x978b78);r(870,358,10,12,0x56383a);r(873,362,4,1,0x817256);
 return [{x:211,y:291,radius:43,strength:.32,color:'#b88948'}, {x:530,y:337,radius:57,strength:.36,color:'#639c89'}, {x:751,y:293,radius:48,strength:.34+Math.sin(time*2)*.025,color:'#c46b39'}];
}
