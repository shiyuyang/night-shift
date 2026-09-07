/** Fit the entire menu together, preserving its internal layout and hit targets. */
export function fitDesk(layer:HTMLElement,content:HTMLElement){
 let frame=0;
 const update=()=>{
  frame=0;
  if(!layer.clientWidth||!content.offsetHeight)return;
  const style=getComputedStyle(layer);
  const left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight);
  const top=parseFloat(style.paddingTop),bottom=parseFloat(style.paddingBottom);
  const width=layer.clientWidth-left-right,height=layer.clientHeight-top-bottom;
  const scale=Math.min(1,width/content.offsetWidth,height/content.offsetHeight);
  content.style.transform=`scale(${Math.max(0,scale)})`;
  content.style.left=`${left}px`;
  content.style.top=`${top+Math.max(0,(height-content.offsetHeight*scale)/2)}px`;
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 const observer=new ResizeObserver(schedule);
 observer.observe(layer);observer.observe(content);
 window.addEventListener('resize',schedule);
 void document.fonts.ready.then(schedule);
 schedule();
}
