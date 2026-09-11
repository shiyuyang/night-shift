/** Waiting for power is an evasion task when a visible pursuer reaches the exit. */
export class ExitWaitPlan {
 target=null;
 select({player,exit,remaining,threats,path,occluded}){
  if(remaining<=0){this.target=null;return null;}
  if(this.target&&Math.hypot(player.x-this.target.x,player.y-this.target.y)>24)return this.target;
  this.target=null;
  if(Math.hypot(player.x-exit.x,player.y-exit.y)>130||!threats.some(e=>e.gap<170))return null;
  let best=-Infinity;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,desired={x:player.x+Math.cos(a)*220,y:player.y+Math.sin(a)*220},route=path(desired),end=route.at(-1);
   if(!end||Math.hypot(end.x-desired.x,end.y-desired.y)>20||Math.hypot(end.x-player.x,end.y-player.y)<80)continue;
   let length=0,from=player,clearance=Infinity;
   for(const p of route){length+=Math.hypot(p.x-from.x,p.y-from.y);from=p;if(length>=35)clearance=Math.min(clearance,...threats.map(e=>Math.hypot(p.x-e.position.x,p.y-e.position.y)));}
   if(length>500||!Number.isFinite(clearance))continue;
   const endGap=Math.min(...threats.map(e=>Math.hypot(end.x-e.position.x,end.y-e.position.y)));
   const score=clearance*2+Math.min(250,endGap)+(threats.every(e=>occluded(end,e.position))?70:0)-length*.15;
   if(score>best){best=score;this.target={...end};}
  }
  return this.target;
 }
}
