export interface Box { x: number; y: number; width: number; height: number; }
export interface Position { x: number; y: number; }
/** World position is the torso anchor. Feet occupy a small footprint 8–16px below it. */
export function feetAt(x: number, y: number): Box {return {x:x-7,y:y+8,width:14,height:8};}
export const monsterFeetAt=(x:number,y:number):Box=>({x:x-14,y:y+4,width:28,height:12});
export type Footprint=(x:number,y:number)=>Box;
/** Keep the monster's visible head/shoulders clear of architecture, while feet
 * still govern furniture. Converting walls lets navigation and motion agree. */
export function monsterArchitecture(box:Box):Box{return {x:box.x-2,y:box.y,width:box.width+4,height:box.height+44};}
/** A contact ray must be clear without axis sliding around a wall corner. */
export function clearContact(from:Position,to:Position,solids:Box[]):boolean{
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)));
 for(let i=0;i<=steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
  if(solids.some(b=>x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height))return false;
 }
 return true;
}
export function overlaps(a:Box,b:Box) {return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;}
export function moveWithCollision(position:Position,dx:number,dy:number,solids:Box[],footprint:Footprint=feetAt): Position {
 const result={...position};
 // Swept substeps prevent tunnelling through thin legs/rails, including during frame hitches.
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/3));
 for(let i=0;i<steps;i++){
  const nx=result.x+dx/steps;if(!solids.some(box=>overlaps(footprint(nx,result.y),box)))result.x=nx;
  const ny=result.y+dy/steps;if(!solids.some(box=>overlaps(footprint(result.x,ny),box)))result.y=ny;
 }
 return result;
}
export function gaitFrame(distance:number,moving:boolean){return moving?Math.floor(distance/10)%4:1;}
