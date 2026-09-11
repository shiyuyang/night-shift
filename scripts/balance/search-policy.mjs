/** Known furniture locations, never reward contents or hidden enemy state. */
export class OptionalSearchPlan {
 constructor(mode='off'){if(!['off','nearby','all'].includes(mode))throw Error('Unknown search policy');this.mode=mode;this.current=null;this.checked='';}
 select({features,opened,player,fuses,door,visible,path}){
  if(this.mode==='off'||fuses===0||fuses===3)return null;
  if(this.current&&!opened.has(this.current.id))return this.current;
  this.current=null;
  const signature=[door,...opened].join('|');
  if(this.mode==='all'&&signature===this.checked)return null;
  this.checked=signature;
  const candidates=features.filter(f=>['cache','empty-task'].includes(f.kind)&&!opened.has(f.id)).map(f=>({id:f.id,kind:f.kind,point:{x:f.x+f.width/2,y:f.y+f.height/2+28}})).filter(f=>this.mode==='all'||Math.hypot(f.point.x-player.x,f.point.y-player.y)<190&&visible(f.point)).sort((a,b)=>Math.hypot(a.point.x-player.x,a.point.y-player.y)-Math.hypot(b.point.x-player.x,b.point.y-player.y));
  for(const f of candidates){const route=path(f.point),end=route.at(-1);if(end&&Math.hypot(end.x-f.point.x,end.y-f.point.y)<8){this.current=f;break;}}
  return this.current;
 }
}
/** A navigation-only full search must exercise every container and its reward. */
export function searchCoverageIssues(trace){
 const totals={cabinets:0,empty:0,loot:0};
 for(const group of Object.values(trace.groups)){for(const key of ['cabinets','empty'])totals[key]+=group.searches?.[key]??0;totals.loot+=Object.values(group.searches?.loot??{}).reduce((a,b)=>a+b,0);}
 const issues=[];
 if(trace.result?.outcome!=='won')issues.push('Full search did not finish');
 for(const [key,expected]of [['cabinets',trace.content?.cabinets],['empty',trace.content?.empty],['loot',trace.content?.rewards]])if(totals[key]!==expected)issues.push(`${key}: reached ${totals[key]}, expected ${expected}`);
 return issues;
}
