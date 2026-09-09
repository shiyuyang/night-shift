import {feetAt,overlaps,clearContact,type Box,type Position} from '../collision.ts';
/** Flood the player's current connected component. Distance is a preference, never a cutoff. */
export function giftLanding(player:Position,solids:Box[],bounds:Box,desired:number,avoid:Position[]=[],angle?:number,random:()=>number=Math.random):Position {
 const step=16,key=(x:number,y:number)=>`${x},${y}`,queue:Position[]=[{...player}],seen=new Set([key(0,0)]),candidates:Position[]=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(Math.hypot(p.x-player.x,p.y-player.y)>32&&!avoid.some(a=>Math.hypot(p.x-a.x,p.y-a.y)<55))candidates.push(p);
  for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
   const n={x:p.x+dx,y:p.y+dy},k=key(Math.round((n.x-player.x)/step),Math.round((n.y-player.y)/step));
   if(seen.has(k))continue;seen.add(k);const f=feetAt(n.x,n.y);
   if(f.x<bounds.x||f.y<bounds.y||f.x+f.width>bounds.x+bounds.width||f.y+f.height>bounds.y+bounds.height||solids.some(b=>overlaps(f,b)))continue;
   // Edges are swept so narrow furniture never creates false connectivity.
   const mid=feetAt(p.x+dx/2,p.y+dy/2);if(solids.some(b=>overlaps(mid,b)))continue;
   queue.push(n);
  }
 }
 if(!candidates.length)throw new Error('No legal gift landing in connected map');
 const score=(p:Position)=>Math.abs(Math.hypot(p.x-player.x,p.y-player.y)-desired);
 candidates.sort((a,b)=>score(a)-score(b));const best=score(candidates[0]);
 let finalists=candidates.filter(p=>score(p)<=best+4);
 if(angle!==undefined){const behind=finalists.filter(p=>(p.x-player.x)*Math.cos(angle)+(p.y-player.y)*Math.sin(angle)<0);if(behind.length)finalists=behind;}
 return {...finalists[Math.min(finalists.length-1,Math.floor(random()*finalists.length))]};
}
