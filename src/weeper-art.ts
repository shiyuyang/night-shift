import type Phaser from 'phaser';
/** Authored crop rectangles keep generated poses intact; one scale and foot anchor. */
export function registerWeeper(scene:Phaser.Scene){
 const key='weeping-patient-native';if(scene.textures.exists(key))return key;
 const source=scene.textures.get('weeping-patient').getSourceImage() as HTMLImageElement;
 const texture=scene.textures.createCanvas(key,88*4,72*4)!,ctx=texture.context;ctx.imageSmoothingEnabled=false;
 const scan=document.createElement('canvas');scan.width=source.width;scan.height=source.height;const sx=scan.getContext('2d',{willReadFrequently:true})!;sx.drawImage(source,0,0);const data=sx.getImageData(0,0,source.width,source.height).data;
 const rows=[[0,300],[300,315],[615,282],[897,357]],scale=source.width/1254;
 for(let i=0;i<16;i++){
  const row=Math.floor(i/4),col=i%4;const xs=row===2?[0,315,605,975,1254]:[0,314,627,941,1254];
  const left=Math.round(xs[col]*scale),right=Math.min(source.width,Math.round(xs[col+1]*scale)),top=Math.round(rows[row][0]*scale),bottom=Math.min(source.height,Math.round((rows[row][0]+rows[row][1])*scale));
  let x1=right,y1=bottom,x2=left,y2=top;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*source.width+x)*4+3]>100){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}
  if(x2<x1)throw Error('Empty crying patient pose '+i);
  const w=Math.round((x2-x1+1)*.18/scale),h=Math.round((y2-y1+1)*.18/scale);ctx.drawImage(source,x1,y1,x2-x1+1,y2-y1+1,col*88+Math.floor((88-w)/2),row*72+68-h,w,h);texture.add(i,0,col*88,row*72,88,72);
 }
 texture.refresh();return key;
}
