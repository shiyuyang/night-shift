import {feetAt,overlaps,clearContact,type Box,type Position} from '../collision.ts';
interface Landing {position:Position;travel:number}
/** Flood only the current component; retain walking distance as well as position. */
function connectedLandings(player:Position,solids:Box[],bounds:Box,avoid:Position[]):Landing[]{
 const step=16,key=(x:number,y:number)=>`${x},${y}`,queue:Position[]=[{...player}],travel=[0],seen=new Set([key(0,0)]),candidates:Landing[]=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(Math.hypot(p.x-player.x,p.y-player.y)>32&&!avoid.some(a=>Math.hypot(p.x-a.x,p.y-a.y)<55))candidates.push({position:p,travel:travel[i]});
  for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
   const n={x:p.x+dx,y:p.y+dy},k=key(Math.round((n.x-player.x)/step),Math.round((n.y-player.y)/step));
   if(seen.has(k))continue;seen.add(k);const f=feetAt(n.x,n.y);
   if(f.x<bounds.x||f.y<bounds.y||f.x+f.width>bounds.x+bounds.width||f.y+f.height>bounds.y+bounds.height||solids.some(b=>overlaps(f,b)))continue;
   // Edges are swept so narrow furniture never creates false connectivity.
   const mid=feetAt(p.x+dx/2,p.y+dy/2);if(solids.some(b=>overlaps(mid,b)))continue;
   queue.push(n);travel.push(travel[i]+step);
  }
 }
 if(!candidates.length)throw new Error('No legal gift landing in connected map');
 return candidates;
}
function pickLanding(finalists:Position[],player:Position,angle:number|undefined,random:()=>number){
 if(angle!==undefined){const behind=finalists.filter(p=>(p.x-player.x)*Math.cos(angle)+(p.y-player.y)*Math.sin(angle)<0);if(behind.length)finalists=behind;}
 return {...finalists[Math.min(finalists.length-1,Math.floor(random()*finalists.length))]};
}
/** Warp distance remains a preference, never a cutoff. */
export function giftLanding(player:Position,solids:Box[],bounds:Box,desired:number,avoid:Position[]=[],angle?:number,random:()=>number=Math.random):Position {
 const candidates=connectedLandings(player,solids,bounds,avoid).map(c=>c.position);
 const score=(p:Position)=>Math.abs(Math.hypot(p.x-player.x,p.y-player.y)-desired);
 candidates.sort((a,b)=>score(a)-score(b));const best=score(candidates[0]);
 return pickLanding(candidates.filter(p=>score(p)<=best+4),player,angle,random);
}
/** A shade should appear in the current visible space, not across a nearby wall. */
export function shadeLanding(player:Position,solids:Box[],bounds:Box,desired:number,angle:number,random:()=>number=Math.random):Position{
 const candidates=connectedLandings(player,solids,bounds,[player]);
 const nearest=candidates[0].travel; // BFS candidates are ordered by walking distance.
 const score=(p:Position)=>Math.abs(Math.hypot(p.x-player.x,p.y-player.y)-desired);
 // Limit visibility work to a short walk. A distant room cannot win just because
 // it happens to have the right straight-line distance or be behind the player.
 const nearby=candidates.filter(c=>c.travel<=Math.max(desired*2,nearest+32)).sort((a,b)=>score(a.position)-score(b.position));
 const direct:Position[]=[];let best=Infinity;
 for(const {position:p} of nearby){
  if(score(p)>best+4)break;
  if(!clearContact(player,p,solids))continue;
  const steps=Math.ceil(Math.hypot(p.x-player.x,p.y-player.y)/4);
  let clear=true;
  for(let i=0;i<=steps;i++){const t=i/steps;if(solids.some(b=>overlaps(feetAt(player.x+(p.x-player.x)*t,player.y+(p.y-player.y)*t),b))){clear=false;break;}}
  if(clear){best=Math.min(best,score(p));direct.push(p);}
 }
 if(direct.length)return pickLanding(direct,player,angle,random);
 // Crowded corners still get a legal apparition, with the shortest approach
 // available. Keep the 55px safety gap even when no direct approach is possible.
 return pickLanding(candidates.filter(c=>c.travel<=nearest+16).map(c=>c.position),player,angle,random);
}
