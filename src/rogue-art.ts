import type Phaser from 'phaser';
import type {RogueRun} from './runtime/rogue-run';
/** Two readable silhouettes, with markings painted on the object itself. */
export function drawRogue(g:Phaser.GameObjects.Graphics,run:RogueRun){
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),w,h);};
 for(const f of run.features){const {x,y,width:w}=f,empty=run.opened.has(f.id);
  if(f.kind==='cache'){
   r(x-2,y-14,w+4,35,0x172125);r(x,y-12,w,31,0x897d64);r(x+2,y-10,w-4,2,0xb4ab8e);
   r(x+2,y-7,w-4,23,empty?0x182326:0x57574b);r(x+3,y+17,w-6,2,0x363f37);
   if(!empty){r(x+7,y-5,10,11,0xb4b598);r(x+11,y-4,2,9,0x854d40);r(x+8,y-1,8,3,0x854d40);r(x+w-5,y+7,2,5,0xc9b98d);}
   else{r(x+3,y+3,w-6,2,0x777662);r(x+3,y+11,w-6,2,0x777662);r(x-4,y-7,5,22,0x6f6b55);}
   r(x+2,y-4,2,3,0x554c3f);r(x+w-4,y+13,2,2,0x3d3530);r(x+1,y+20,3,2,0x131e21);r(x+w-4,y+20,3,2,0x131e21);
  }else if(f.kind==='locker'){
   const hidden=run.hidden===f.id;
   r(x-2,y-30,w+4,51,0x142024);r(x,y-28,w,47,0x435c5b);r(x+2,y-26,w-4,2,0x8b9a8b);r(x+2,y-22,w-4,38,hidden?0x172729:0x304747);
   // Ivory standing figure on a cold green enamel plate.
   r(x+6,y-20,12,16,0x667d70);r(x+10,y-18,4,4,0xc0c5a6);r(x+9,y-13,6,5,0xc0c5a6);r(x+9,y-8,2,3,0xc0c5a6);r(x+13,y-8,2,3,0xc0c5a6);
   for(let i=0;i<3;i++)r(x+5,y+5+i*3,10,1,0x152c2e);r(x+w-5,y-1,2,5,0xb9b18b);r(x+3,y+18,w-6,2,0x1d3030);r(x+3,y-23,3,1,0x968767);
   if(hidden){r(x+w-3,y-22,2,37,0xb2b49a);r(x+w-2,y-20,2,34,0x111c21);}
  }
 }
}
