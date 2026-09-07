/** Keep the light falloff aligned with the source photograph's cover crop. */
export function mountDeskLamp(scene:HTMLElement){
 const light=document.createElement('div');
 light.className='desk-lamp-falloff';
 scene.append(light);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=0;
 let first=true;
 let flashes=0;
 let animation:Animation|undefined;
 const fit=()=>{
  const scale=Math.max(scene.clientWidth/1672,scene.clientHeight/941);
  light.style.width=`${1672*scale}px`;
  light.style.height=`${941*scale}px`;
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
   const frames=double?[
    {opacity:0,offset:0},{opacity:.9,offset:.12},{opacity:0,offset:.28},
    {opacity:.7,offset:.48},{opacity:0,offset:.65},{opacity:.95,offset:.8},{opacity:0,offset:1}
   ]:[{opacity:0,offset:0},{opacity:.9,offset:.2},{opacity:.5,offset:.65},{opacity:0,offset:1}];
   animation=light.animate(frames.map(frame=>({...frame,easing:'steps(1,end)'})),
    {duration:double?620:240,easing:'linear'});
  }
  schedule();
 };
 const stop=()=>{clearTimeout(timer);animation?.cancel();};
 const reset=()=>{stop();if(!document.hidden&&!motion.matches)schedule();};
 document.addEventListener('visibilitychange',reset);
 motion.addEventListener('change',reset);
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',reset);
 fit();reset();
}
