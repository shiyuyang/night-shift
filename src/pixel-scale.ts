import type Phaser from 'phaser';
import manifest from '../game/assets/manifest.json' with {type:'json'};
export const PIXELS=manifest.render;
/** A stable camera view: resize the presentation, never the simulation viewport. */
export function presentation(width:number,height:number){
 const portrait=height>width*1.05,topReserve=portrait?152:0,bottomReserve=portrait?184:0,availableHeight=Math.max(1,height-topReserve-bottomReserve);
 const zoom=Math.max(.01,Math.min(width/PIXELS.width,availableHeight/PIXELS.height));
 const viewWidth=PIXELS.width*zoom,viewHeight=PIXELS.height*zoom;
 return {zoom,width:viewWidth,height:viewHeight,left:(width-viewWidth)/2,top:(availableHeight-viewHeight)/2+topReserve,portrait};
}
export function displayZoom(width:number,height:number){return presentation(width,height).zoom;}
export function attachPixelScale(game:Phaser.Game,host:HTMLElement){
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;const view=presentation(width,height);game.scale.setZoom(view.zoom);const parent=host.parentElement!;for(const name of ['left','top','width','height'] as const)parent.style.setProperty(`--play-${name}`,`${view[name]}px`);parent.style.setProperty('--game-ui-scale',String(view.width/1280));parent.dataset.presentation=view.portrait?'portrait':'landscape';host.dataset.pixelScale=String(view.zoom);host.dataset.pixelFit='fixed-view';};
 const observer=new ResizeObserver(resize);observer.observe(host);game.events.once('destroy',()=>observer.disconnect());resize();
}
