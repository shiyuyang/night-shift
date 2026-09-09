// Floor points in the 1672 × 941 photograph, clear of the chairs and desk.
// With a horizon at y=370, projected height grows with distance below it.
const apparitionStops=[
 {x:1048,feet:465,brightness:.43},
 {x:1100,feet:540,brightness:.46},
 {x:1040,feet:625,brightness:.49},
 {x:1115,feet:770,brightness:.52},
] as const;

/** Keep the light falloff aligned with the source photograph's cover crop. */
export function mountDeskLamp(scene:HTMLElement,onApparition:(delaySeconds:number,depth:number)=>()=>void=()=>()=>{}){
 const light=document.createElement('div');
 light.className='desk-lamp-falloff';
 const apparition=document.createElement('div');
 apparition.className='desk-apparition';
 apparition.setAttribute('aria-hidden','true');
 const figure=document.createElement('div');
 figure.className='desk-yurei';
 apparition.append(figure);
 const signal=document.createElement('div');
 signal.className='desk-signal';
 signal.setAttribute('aria-hidden','true');
 const bands=[0,1,2].map(()=>{
  const band=document.createElement('div');
  band.className='desk-signal-band';
  signal.append(band);
  return band;
 });
 // The same fluorescent falloff must darken the figure and the corridor.
 scene.append(apparition,signal,light);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=0;
 let first=true;
 let flashes=0;
 let animation:Animation|undefined;
 let ghostAnimation:Animation|undefined;
 let cancelSound=()=>{};
 let interferenceAnimations:Animation[]=[];
 const fit=()=>{
  const scale=Math.max(scene.clientWidth/1672,scene.clientHeight/941);
  light.style.width=`${1672*scale}px`;
  light.style.height=`${941*scale}px`;
  apparition.style.width=light.style.width;
  apparition.style.height=light.style.height;
  signal.style.width=light.style.width;
  signal.style.height=light.style.height;
 };
 const observer=new ResizeObserver(fit);
 observer.observe(scene);
 const schedule=()=>{timer=window.setTimeout(flicker,first?1800:8000+Math.random()*12000);};
 const flicker=()=>{
  if(!document.hidden&&!motion.matches&&scene.getClientRects().length){
   // Most failures are a single brief dip; occasionally the tube restrikes twice.
   const double=first||Math.random()<.35;
   first=false;
   light.dataset.flashes=String(++flashes);
   const stopIndex=(flashes-1)%apparitionStops.length;
   const stop=apparitionStops[stopIndex];
   // Correct for the transparent padding below the sprite's feet (1.8%).
   const height=(stop.feet-370)*1.12;
   const canvasHeight=height/.966;
   figure.dataset.depth=String(stopIndex);
   figure.style.left=`${stop.x/1672*100}%`;
   figure.style.top=`${(stop.feet+canvasHeight*.018)/941*100}%`;
   figure.style.height=`${canvasHeight/941*100}%`;
   figure.style.setProperty('--yurei-brightness',String(stop.brightness));
   const duration=double?620:240;
   const ghostStart=double?.48:.2;
   const ghostEnd=ghostStart+180/duration;
   interferenceAnimations.forEach(animation=>animation.cancel());
   interferenceAnimations=[];
   bands.forEach((band,index)=>{
    const slice=figure.cloneNode() as HTMLElement;
    slice.removeAttribute('data-depth');
    slice.classList.add('desk-yurei-slice');
    slice.style.opacity='.78';
    band.replaceChildren(slice);
    const y=(stop.feet-height+height*[.25,.52,.76][index])/941*100;
    band.style.clipPath=`inset(${y}% 0 ${100-y-[.8,1.5,.5][index]}% 0)`;
    interferenceAnimations.push(band.animate([
     {transform:`translateX(${[5,-7,3][index]}px)`,offset:0},
     {transform:`translateX(${[-4,6,-3][index]}px)`,offset:ghostStart+90/duration},
     {transform:'translateX(0)',offset:1}
    ].map(frame=>({...frame,easing:'steps(1,end)'})),{duration}));
   });
   interferenceAnimations.push(signal.animate([
    {opacity:0,offset:0},{opacity:.7,offset:ghostStart},
    {opacity:.38,offset:ghostStart+70/duration},{opacity:.8,offset:ghostStart+90/duration},
    {opacity:0,offset:ghostEnd},{opacity:0,offset:1}
   ].map(frame=>({...frame,easing:'steps(1,end)'})),{duration}));
   const frames=double?[
    {opacity:0,offset:0},{opacity:.9,offset:.12},{opacity:0,offset:.28},
    {opacity:.7,offset:ghostStart},{opacity:0,offset:ghostEnd},{opacity:.95,offset:.8},{opacity:0,offset:1}
   ]:[{opacity:0,offset:0},{opacity:.9,offset:ghostStart},{opacity:.5,offset:.65},{opacity:0,offset:ghostEnd},{opacity:0,offset:1}];
   animation=light.animate(frames.map(frame=>({...frame,easing:'steps(1,end)'})),
    {duration,easing:'linear'});
   // A single hard glimpse inside the dark beat, on the lamp's own timeline.
   ghostAnimation=figure.animate([
    {opacity:0,offset:0},{opacity:.78,offset:ghostStart},
    {opacity:.04,offset:ghostStart+70/duration},{opacity:.7,offset:ghostStart+90/duration},
    {opacity:0,offset:ghostEnd},{opacity:0,offset:1}
   ].map(frame=>({...frame,easing:'steps(1,end)'})),{duration,easing:'linear'});
   const startTime=document.timeline.currentTime;
   animation.startTime=startTime;
   ghostAnimation.startTime=startTime;
   interferenceAnimations.forEach(animation=>animation.startTime=startTime);
   cancelSound();
   cancelSound=onApparition(ghostStart*duration/1000,stopIndex);
  }
  schedule();
 };
 const stop=()=>{clearTimeout(timer);cancelSound();animation?.cancel();ghostAnimation?.cancel();interferenceAnimations.forEach(animation=>animation.cancel());};
 const reset=()=>{stop();if(!document.hidden&&!motion.matches)schedule();};
 document.addEventListener('visibilitychange',reset);
 motion.addEventListener('change',reset);
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',reset);
 const cover=scene.closest<HTMLElement>('#start-layer');
 if(cover)new MutationObserver(()=>{if(cover.classList.contains('hidden'))stop();else reset();}).observe(cover,{attributes:true,attributeFilter:['class']});
 fit();reset();
}
