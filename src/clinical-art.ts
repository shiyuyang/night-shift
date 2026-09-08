import type Phaser from 'phaser';
import type {Box} from './collision';
/** Low clinical furniture: seats share a beam; surgical tables have segmented pads and rails. */
export function drawClinicalProp(g:Phaser.GameObjects.Graphics,b:Box&{kind:'seating'|'operatingtable'|'coldcabinet'|'shroudedtrolley'}){
 const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
 if(b.kind==='coldcabinet'){
  r(b.x,b.y,b.width,b.height,0x17292f);r(b.x+2,b.y+2,b.width-4,b.height-5,0x73858a);
  // Each bay has a 50-unit opening, matching the sliding tray, plus a 2-unit frame.
  const columns=Math.max(1,Math.floor((b.width-6)/58)),start=b.x+Math.floor((b.width-(columns*54+(columns-1)*4))/2);
  for(let col=0;col<columns;col++)for(let y=b.y+5;y<b.y+b.height-10;y+=27){
   const x=start+col*58;r(x,y,54,26,0x22373f);r(x+2,y+2,50,22,0x526a72);
   r(x+2,y+2,50,2,0x9daead);r(x+2,y+22,50,2,0x30454e);r(x+4,y+5,1,15,0x788f92);
   r(x+18,y+12,18,5,0x263c45);r(x+20,y+13,14,2,0xc0c9c0);r(x+42,y+5,6,3,0xb1b5a5);
  }
 }else if(b.kind==='shroudedtrolley'){
  r(b.x,b.y+8,b.width,b.height-4,0x223237);r(b.x+3,b.y+3,b.width-6,b.height-10,0x82948f);
  for(const x of [b.x+3,b.x+b.width-7]){r(x,b.y+b.height-5,4,8,0x111e22);}
 }else if(b.kind==='seating'){
  r(b.x,b.y+22,b.width,6,0x88948a);
  for(let x=b.x+3;x<b.x+b.width-25;x+=35){r(x+4,b.y+25,4,7,0x182b2b);r(x+22,b.y+25,4,7,0x182b2b);r(x,b.y,30,22,0x192d31);r(x+2,b.y+2,26,6,0x75918b);r(x+2,b.y+10,26,10,0x52716b);}
 }else{
  r(b.x+18,b.y+18,22,b.height-8,0x1c3033);r(b.x,b.y+12,b.width,b.height-24,0x99b2ab);
  r(b.x+6,b.y+2,b.width-12,b.height-4,0x213c40);
  for(const [y,h]of [[5,22],[31,42],[77,29]]){r(b.x+9,b.y+y,b.width-18,h,0x638a80);r(b.x+11,b.y+y+2,b.width-22,3,0x8baaa0);}
  r(b.x+1,b.y+22,3,58,0xc0c9b3);r(b.x+b.width-4,b.y+22,3,58,0xc0c9b3);
  r(b.x+8,b.y+57,b.width-16,5,0x324b49);
 }
}

/** Sliding mortuary tray, clipped at the cabinet mouth as it emerges. */
export function drawMorgueDrawer(g:Phaser.GameObjects.Graphics,b:Box,phase:string,progress:number,elapsed:number){
 const r=(x:number,y:number,w:number,h:number,c:number)=>{if(w<=0||h<=0)return;g.fillStyle(c);g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const x=b.x,y=b.y,w=b.width,h=b.height,front=y+Math.max(4,h*progress),trayY=front-h;
 // Recessed cabinet opening, with its own lintel and warning indicator.
 r(x-2,y-32,w+4,35,0x22373f);r(x,y-30,w,2,0x9daead);r(x,y-28,w,31,0x101b20);r(x+2,y-26,2,26,0x344b53);r(x+w-4,y-26,2,26,0x344b53);
 const warning=phase==='warning',bright=warning&&Math.floor(elapsed*5)%2===0;
 r(x+w-7,y-27,3,2,bright?0xe1b760:0x785c35);
 if(warning){g.lineStyle(1,0xc39b50,bright?.65:.2);g.strokeRect(x,y,w,h);}
 if(phase!=='extending'&&phase!=='open'){
  r(x,y-30,w,22,0x526a72);r(x,y-30,w,2,0x9daead);r(x,y-10,w,2,0x30454e);r(x+16,y-20,18,5,0x263c45);r(x+18,y-19,14,2,0xc0c9c0);r(x+w-7,y-27,3,2,bright?0xe1b760:0x785c35);return;
 }
 const clipped=(px:number,py:number,pw:number,ph:number,c:number)=>{const top=Math.max(y,py),bottom=Math.min(front-7,py+ph);r(px,top,pw,bottom-top,c);};
 // Narrow telescopic rails stay distinct from the tray's raised rim.
 r(x+1,y+3,w-2,front-y-1,0x17272d);
 for(const railX of [x+1,x+w-5]){r(railX,y,4,front-y-4,0x75898c);r(railX,y,1,front-y-5,0xb4bebb);}
 r(x+6,y,w-12,front-y-7,0x4b6269);
 for(let yy=trayY+10;yy<front-9;yy+=12)clipped(x+7,yy,w-14,1,0x668087);
 // Thick folded front edge with a recessed pull handle and two fasteners.
 r(x+4,front-8,w-8,8,0x334b54);r(x+4,front-8,w-8,2,0xaebbb9);
 r(x+5,front-2,w-10,2,0x1e333d);r(x+w/2-10,front-6,20,4,0x182c35);
 r(x+w/2-8,front-5,16,2,0xbac5be);r(x+7,front-5,2,2,0x98aaa9);r(x+w-9,front-5,2,2,0x98aaa9);
}
