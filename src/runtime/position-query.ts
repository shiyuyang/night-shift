import type {Position} from '../collision.ts';

/** Local index for an unchanged point set; distance thresholds retain exact semantics. */
export function positionQuery(points:Position[]){
 const step=32;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
 const cols=Math.floor((maxX-minX)/step)+1,rows=Math.floor((maxY-minY)/step)+1;
 if(!points.length)return (_p:Position,_radius:number)=>false;
 // Avoid oversized allocations for unusual caller-provided sparse coordinates.
 if(!Number.isSafeInteger(cols*rows)||cols*rows>1_000_000)return (p:Position,r:number)=>points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<r);
 const heads=new Int32Array(cols*rows).fill(-1),next=new Int32Array(points.length);
 const xs=new Float64Array(points.length),ys=new Float64Array(points.length);
 for(let i=0;i<points.length;i++){
  const p=points[i],at=Math.floor((p.y-minY)/step)*cols+Math.floor((p.x-minX)/step);
  xs[i]=p.x;ys[i]=p.y;next[i]=heads[at];heads[at]=i;
 }
 return (p:Position,radius:number)=>{
  const left=Math.max(0,Math.floor((p.x-radius-minX)/step)),right=Math.min(cols-1,Math.floor((p.x+radius-minX)/step));
  const top=Math.max(0,Math.floor((p.y-radius-minY)/step)),bottom=Math.min(rows-1,Math.floor((p.y+radius-minY)/step));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   for(let at=heads[y*cols+x];at!==-1;at=next[at])if(Math.hypot(xs[at]-p.x,ys[at]-p.y)<radius)return true;
  }
  return false;
 };
}
