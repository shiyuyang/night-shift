// Frozen pre-optimization validator, used only as an independent regression oracle.
import {feetAt,monsterFeetAt,overlaps} from "../../src/collision.ts";
export function reachablePositions(level,open,footprint=feetAt){
 const solids=[...level.walls,...level.props,...level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(open?[]:[level.door])];
 const {bounds,spawn}=level,step=8,cols=Math.ceil(bounds.width/step)+2,rows=Math.ceil(bounds.height/step)+2;
 const x0=spawn.x-Math.floor((spawn.x-bounds.x)/step)*step,y0=spawn.y-Math.floor((spawn.y-bounds.y)/step)*step;
 const valid=(x,y)=>x>=bounds.x&&x<=bounds.x+bounds.width&&y>=bounds.y&&y<=bounds.y+bounds.height&&!solids.some(s=>overlaps(footprint(x,y),s));
 if(!valid(spawn.x,spawn.y))return [];
 const seen=new Uint8Array(cols*rows),queue=[Math.round((spawn.y-y0)/step)*cols+Math.round((spawn.x-x0)/step)],points=[];seen[queue[0]]=1;
 for(let i=0;i<queue.length;i++){const at=queue[i],cx=at%cols,cy=Math.floor(at/cols);points.push({x:x0+cx*step,y:y0+cy*step});for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||seen[n])continue;seen[n]=1;if(valid(x0+nx*step,y0+ny*step))queue.push(n);}}
 return points;
}

export function escapeRouteLength(level,points=reachablePositions(level,true)){
 const key=(x,y)=>`${x},${y}`,available=new Set(points.map(p=>key(p.x,p.y))),seen=new Set(),queue=[];
 for(const p of points)if(Math.hypot(p.x-level.exit.x,p.y-level.exit.y)<37){queue.push({...p,distance:0});seen.add(key(p.x,p.y));}
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-level.boxes[2].x,p.y-level.boxes[2].y)<44)return p.distance;
  for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(available.has(k)&&!seen.has(k)){seen.add(k);queue.push({x,y,distance:p.distance+8});}}
 }
 return Infinity;
}

export function referenceValidation(level,checkDrawer=true){
 const closed=reachablePositions(level,false),open=reachablePositions(level,true),near=(points,p,r)=>points.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<r);
 const errors=[];
 // Explicit dependency chain: free box -> ward key -> door; brass -> box 1 -> seal -> box 2.
 for(const [name,p,r] of [['brass',level.key,30],['free-box',level.boxes[0],38],['brass-box',level.boxes[1],38],['door',level.doorUse,38]])if(!near(closed,p,r))errors.push(name+' inaccessible before unlock');
 if(near(closed,level.boxes[2],44))errors.push('locked room bypass');
 for(const [i,p]of level.boxes.entries())if(!near(open,p,38))errors.push('box '+i+' inaccessible after unlock');
 if(!near(open,level.exit,30))errors.push('exit inaccessible');
 const escape=escapeRouteLength(level,open);if(!Number.isFinite(escape)||escape<600)errors.push('escape route must be reachable and at least 600 units');
 const monsters=reachablePositions(level,true,monsterFeetAt);
 for(const p of level.monsterSpawns)if(!near(monsters,p,12))errors.push('monster spawn disconnected');
 const drawer=level.zones.MorgueDrawerZone;if(checkDrawer&&drawer){const blocked={...level,props:[...level.props,{...drawer,kind:'machine'}]};errors.push(...referenceValidation(blocked,false).errors.map(e=>'extended drawer: '+e));}
 return {valid:errors.length===0,errors};
}
