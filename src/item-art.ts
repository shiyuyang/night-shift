import type Phaser from 'phaser';
import type {Position} from './collision';
/** One cell is one world/native pixel: a hollow bow, straight shaft and two teeth. */
const KEY=[
'   ######               ',
'  #hhhhhh#              ',
' #hg####gh#             ',
' #hg#  #gh############# ',
' #hg#  #gggggggggggggh# ',
' #hg#  #gssssssssssssg# ',
' #hg####gh######gg##gg# ',
'  #gggggg#     #gg##gg# ',
'   ######      #ss##ss# ',
'               ### ### '
];
const palette:Record<string,number>={'#':0x172023,h:0xd8bd7c,g:0xb29659,s:0x77633b};
export function drawKey(g:Phaser.GameObjects.Graphics,p:Position){const x=Math.round(p.x)-12,y=Math.round(p.y)-5;g.fillStyle(0x10181c,.6);g.fillEllipse(p.x,p.y+6,24,3);for(let row=0;row<KEY.length;row++)for(let col=0;col<KEY[row].length;col++){const color=palette[KEY[row][col]];if(color!==undefined){g.fillStyle(color);g.fillRect(x+col,y+row,1,1);}}}
export function drawChest(g:Phaser.GameObjects.Graphics,p:Position,index:number,open:boolean){
 const x=Math.round(p.x/2)*2,y=Math.round(p.y/2)*2,r=(dx:number,dy:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x+dx*2,y+dy*2,w*2,h*2);};
 const trim=[0x8fa794,0xc5a269,0x83adba][index];
 r(-8,-10,16,16,0x101c20);r(-7,-9,14,4,open?0x66513c:0x8a7351);r(-6,-9,12,1,0xc2ad80);
 r(-7,-4,14,9,0x66513b);r(-6,-3,12,7,0x806649);r(-6,3,12,1,0x473d31);
 for(const dx of [-5,4]){r(dx,-8,1,13,0x393f36);r(dx,-8,1,2,0xa79c76);r(dx,3,1,1,0xa79c76);}
 r(-7,-5,14,1,0x272d28);r(-1,-4,3,4,trim);r(0,-3,1,2,0x263032);
 if(index===0){r(0,-3,1,1,0xd1d8b5);}else if(index===1){r(-1,-6,3,2,0xc5a269);r(0,-6,1,1,0x27302b);}else{r(-3,-4,2,4,0x83adba);r(3,-4,2,4,0x83adba);}
 if(open){r(-6,-5,12,5,0x111e22);r(-6,-1,12,1,0x9b8057);r(-1,0,3,2,0x494e3d);}
}
