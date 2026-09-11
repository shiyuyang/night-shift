import {feetAt,monsterFeetAt,overlaps,type Box,type Footprint} from '../collision.ts';

const step=8,maxCells=250_000,maxCachedCells=500_000,maxEntries=8;
export interface PatrolGrid {
 x0:number;y0:number;cols:number;rows:number;flags:Uint8Array;
 seen:Uint32Array;parents:Int32Array;queue:Int32Array;epoch:number;
}
// Key by geometry values: callers rebuild arrays, and doors/drawers change in place.
// Bound the cache across scenes and the many layouts exercised by CPU tests.
const cache=new Map<string,PatrolGrid>();let cachedCells=0;
export function patrolGrid(solids:Box[],bounds:Box,footprint:Footprint):PatrolGrid|undefined {
 if(footprint!==feetAt&&footprint!==monsterFeetAt)return;
 const x0=Math.ceil(bounds.x/step),y0=Math.ceil(bounds.y/step);
 const cols=Math.floor((bounds.x+bounds.width)/step)-x0+1,rows=Math.floor((bounds.y+bounds.height)/step)-y0+1,size=cols*rows;
 if(cols<=0||rows<=0||!Number.isSafeInteger(size)||size>maxCells)return;
 const key=[footprint===feetAt?'player':'monster',bounds.x,bounds.y,bounds.width,bounds.height,...solids.flatMap(b=>[b.x,b.y,b.width,b.height])].join(',');
 const found=cache.get(key);if(found){cache.delete(key);cache.set(key,found);return found;}
 const flags=new Uint8Array(size),body=footprint(0,0);
 // Bits: occupied cell and blocked E/W/S/N edges. Match the original three
 // movement substeps even at touching edges, where rounding is directional.
 const moved=(n:number,delta:number)=>{for(let i=0;i<3;i++)n+=delta/3;return n;};
 const raster=(shape:Box,bit:number,dx=0,dy=0)=>{
  for(const solid of solids){
   const left=Math.max(0,Math.floor((solid.x-shape.x-shape.width)/step)-x0);
   const right=Math.min(cols-1,Math.ceil((solid.x+solid.width-shape.x)/step)-x0);
   const top=Math.max(0,Math.floor((solid.y-shape.y-shape.height)/step)-y0);
   const bottom=Math.min(rows-1,Math.ceil((solid.y+solid.height-shape.y)/step)-y0);
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const at=y*cols+x;
    const px=(x+x0)*step,py=(y+y0)*step;
    if(!(flags[at]&bit)&&(overlaps({x:px+shape.x,y:py+shape.y,width:shape.width,height:shape.height},solid)
     ||bit!==1&&overlaps(footprint(moved(px,dx),moved(py,dy)),solid)))flags[at]|=bit;
   }
  }
 };
 raster(body,1);
 raster({...body,width:body.width+step},2,step,0);raster({...body,x:body.x-step,width:body.width+step},4,-step,0);
 raster({...body,height:body.height+step},8,0,step);raster({...body,y:body.y-step,height:body.height+step},16,0,-step);
 const grid:PatrolGrid={x0,y0,cols,rows,flags,seen:new Uint32Array(size),parents:new Int32Array(size),queue:new Int32Array(size),epoch:0};
 while(cache.size&&(cache.size>=maxEntries||cachedCells+size>maxCachedCells)){
  const oldest=cache.keys().next().value!;cachedCells-=cache.get(oldest)!.flags.length;cache.delete(oldest);
 }
 cache.set(key,grid);cachedCells+=size;return grid;
}
