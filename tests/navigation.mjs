import assert from 'node:assert/strict';
import {feetAt,overlaps} from '../src/collision.ts';
import {weeperExclusion} from '../src/runtime/weeper-placement.ts';
export async function snapshot(page){return page.evaluate(()=>window.__nightshift());}
export async function goTo(page,targetX,targetY,radius=8){
 const first=await snapshot(page),solids=[...first.solids,...(first.weeper&&first.weeper.phase!=='stunned'?[weeperExclusion(first.weeper.home)]:[])],step=6;
 const valid=(x,y)=>x>35&&x<925&&y>88&&y<505&&!solids.some(b=>{const f=feetAt(x,y);return overlaps({x:f.x-4,y:f.y-4,width:f.width+8,height:f.height+8},b);});
 const sx=Math.round(first.player.x/step),sy=Math.round(first.player.y/step),key=(x,y)=>`${x},${y}`;
 const queue=[[sx,sy]],parents=new Map([[key(sx,sy),null]]);let end;
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];if(Math.hypot(x*step-targetX,y*step-targetY)<radius){end=[x,y];break;}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!parents.has(k)&&valid(nx*step,ny*step)){parents.set(k,[x,y]);queue.push([nx,ny]);}}
 }
 assert.ok(end,`No collision-free route to ${targetX},${targetY}`);
 const path=[];for(let at=end;at;at=parents.get(key(...at)))path.unshift({x:at[0]*step,y:at[1]*step});
 const corners=path.filter((point,i)=>i===path.length-1||i===0||((path[i+1].x-point.x)!==(point.x-path[i-1].x)||(path[i+1].y-point.y)!==(point.y-path[i-1].y)));
 for(const waypoint of corners){
  for(let attempts=0;attempts<80;attempts++){
   const state=await snapshot(page);if(page.defend){if(state.health<=60&&state.bandages>0)await page.keyboard.press('q');if(state.ghostVisible&&Math.hypot(state.player.x-state.ghost.x,state.player.y-state.ghost.y)<125&&state.stun<.5&&state.lure<=0){if(state.flashes>0)await page.keyboard.press('f');else if(state.decoys>0)await page.keyboard.press('r');}}const dx=waypoint.x-state.player.x,dy=waypoint.y-state.player.y;if(Math.hypot(dx,dy)<3)break;
   const horizontal=Math.abs(dx)>Math.abs(dy),key=horizontal?(dx>0?'d':'a'):(dy>0?'s':'w'),distance=horizontal?Math.abs(dx):Math.abs(dy);
   await page.keyboard.down(key);await page.waitForTimeout(Math.max(20,Math.min(120,distance/83*1000)));await page.keyboard.up(key);
   if(attempts===79)throw Error(`Could not reach waypoint ${JSON.stringify(waypoint)} from ${JSON.stringify(state.player)}`);
  }
 }
 const after=await snapshot(page);assert.ok(Math.hypot(after.player.x-targetX,after.player.y-targetY)<radius+5,`Missed target: ${JSON.stringify(after.player)}`);
}
