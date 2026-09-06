import type Phaser from 'phaser';
import type {Threat} from './run-rules';
import crops from '../game/assets/hospital-crops.json' with {type:'json'};
/** Preserve generated heads and props, with shared scale and foot baseline for all poses. */
export function registerHospitalPatient(scene:Phaser.Scene,kind:Threat){
 const key='hospital-'+kind+'-native';if(scene.textures.exists(key))return key;
 const source=scene.textures.get('hospital-'+kind).getSourceImage() as HTMLImageElement,rects=crops[kind];
 const scale=Math.min(64/Math.max(...rects.map(r=>r.h)),56/Math.max(...rects.map(r=>r.w))),texture=scene.textures.createCanvas(key,320,320)!,ctx=texture.context;ctx.imageSmoothingEnabled=false;
 rects.forEach((r,i)=>{const w=Math.round(r.w*scale),h=Math.round(r.h*scale),x=i%4*80,y=Math.floor(i/4)*80;ctx.drawImage(source,r.x,r.y,r.w,r.h,x+Math.floor((80-w)/2),y+76-h,w,h);texture.add(i,0,x,y,80,80);});texture.refresh();return key;
}
