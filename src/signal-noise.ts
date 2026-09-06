import Phaser from 'phaser';

/** Reuses Phaser's stock Displacement FX; grain is a cached native-pixel texture. */
export class SignalNoise {
 private grain:Phaser.GameObjects.TileSprite;
 private bands:Phaser.GameObjects.Graphics;
 private distortion?:Phaser.FX.Displacement;
 private lastFrame=-1;private camera:Phaser.Cameras.Scene2D.Camera;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(scene:Phaser.Scene){
  this.camera=scene.cameras.main;
  if(!scene.textures.exists('signal-grain')){
   const noise=scene.textures.createCanvas('signal-grain',128,128)!;
   const ctx=noise.context,data=ctx.createImageData(128,128);
   let seed=1977;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<data.data.length;i+=4){const value=random()>.5?195:12;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=Math.floor(random()*95);}
   ctx.putImageData(data,0,0);noise.refresh();
   const displacement=scene.textures.createCanvas('signal-bands',8,384)!;
   for(let y=0;y<384;y++){const v=y%47<3?Math.floor(random()*255):128;displacement.context.fillStyle=`rgb(${v},${v},${v})`;displacement.context.fillRect(0,y,8,1);}displacement.refresh();
  }
  this.grain=scene.add.tileSprite(0,0,640,384,'signal-grain').setOrigin(0).setScrollFactor(0).setDepth(100).setAlpha(.12);
  this.bands=scene.add.graphics().setScrollFactor(0).setDepth(101);
  if(scene.game.renderer.type===Phaser.WEBGL)this.distortion=scene.cameras.main.postFX.addDisplacement('signal-bands',0,0);
 }
 update(time:number,running:boolean,proximity:number,blackout:boolean,event:boolean){
  this.grain.setSize(this.camera.width,this.camera.height);
  const frame=Math.floor(time*8);
  // Short gaps in reception, with long quiet intervals. No full-screen white flash.
  const pulse=!this.reduced&&running&&time%3.7<.22;
  const strength=pulse?Math.max(proximity,blackout?.55:0,event?.45:0):0;
  if(this.distortion){this.distortion.x=strength*.008;this.distortion.y=0;this.distortion.setActive(strength>0);}
  this.grain.setAlpha(this.reduced?.06:.12+strength*.36);
  if(strength===0)this.bands.clear();
  if(frame===this.lastFrame||!running)return;
  this.lastFrame=frame;
  if(!this.reduced){this.grain.tilePositionX=(frame*37)%128;this.grain.tilePositionY=(frame*61)%128;}
  this.bands.clear();
  if(strength>0){this.bands.fillStyle(0xa2b2a5,strength*.07);this.bands.fillRect(0,(frame*31)%this.camera.height,this.camera.width,2);this.bands.fillStyle(0x020608,strength*.2);this.bands.fillRect(0,(frame*31+6)%this.camera.height,this.camera.width,5);}
 }
}
