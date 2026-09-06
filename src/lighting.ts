import type {Box,Position} from './collision';
/** Convex silhouette projected away from a point light, in world coordinates. */
export function shadowHull(box:Box,source:Position,length=30):Position[]{
 const corners=[{x:box.x,y:box.y},{x:box.x+box.width,y:box.y},{x:box.x+box.width,y:box.y+box.height},{x:box.x,y:box.y+box.height}];
 const points=[...corners,...corners.map(p=>{const d=Math.max(1,Math.hypot(p.x-source.x,p.y-source.y));return {x:p.x+(p.x-source.x)/d*length,y:p.y+(p.y-source.y)/d*length};})].sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a:Position,b:Position,c:Position)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(list:Position[])=>{const hull:Position[]=[];for(const p of list){while(hull.length>1&&cross(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}return hull;};
 const lower=half(points),upper=half([...points].reverse());return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
