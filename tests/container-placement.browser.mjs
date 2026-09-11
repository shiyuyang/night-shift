// Placement/access checks: position the player at proven reachable approach cells.
// These are interaction fixtures, not a claim of unassisted campaign completion.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.PLACEMENT_OUT??'output/loot-placement/browser';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),reports=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Include the fixed tutorial and the later randomized ward layout.
 for(let night=1;night<=8;night++){
  await page.addInitScript(n=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:Math.max(7,n)}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:n,seed:0}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));},night);
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=containers');await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const report=await page.evaluate(async()=>{
   const s=window.__nightshiftScene;s.tutorial.skip();s.setPaused(true);
   const {reachablePositions}=await import('/src/runtime/level-validation.ts');
   const {featureSafetyBox,center}=await import('/src/runtime/rogue-content.ts');
   const {overlaps,feetAt}=await import('/src/collision.ts');
   const geometry={...s.level,props:[...s.level.props,...s.rogue.features.map(f=>({...featureSafetyBox(f),kind:'crate'}))]};
   const closed=reachablePositions(geometry,false),open=reachablePositions(geometry,true),checked=[];
   const approach=(target,range,points,front=false)=>{
    // canReachInteraction reads the current player; verify each candidate there.
    const at=points.find(p=>{if(front&&Math.hypot(p.x-target.x,p.y-target.y-28)>=8||Math.hypot(p.x-target.x,p.y-target.y)>=range-2||s.solids().some(b=>overlaps(feetAt(p.x,p.y),b)))return false;s.player.setPosition(p.x,p.y);return s.canReachInteraction(target);});
    if(!at)throw Error('No usable approach '+JSON.stringify(target));
    s.player.setPosition(at.x,at.y);checked.push({target,at});return at;
   };
   approach(s.level.key,34,closed);s.interact();if(!s.key)throw Error('key interaction failed');
   for(const i of [0,1]){approach(s.level.boxes[i],44,closed);s.interact();if(!s.opened[i])throw Error('box '+i+' interaction failed');}
   const door=center(s.level.door),doorApproach=closed.find(p=>Math.hypot(p.x-door.x,p.y-door.y)<43&&!s.solids().some(b=>overlaps(feetAt(p.x,p.y),b)));
   if(!doorApproach)throw Error('No reachable door approach');s.player.setPosition(doorApproach.x,doorApproach.y);checked.push({target:door,at:doorApproach});s.interact();if(!s.door)throw Error('door interaction failed');
   approach(s.level.boxes[2],44,open);s.interact();if(!s.opened[2])throw Error('final box interaction failed');
   for(const f of s.rogue.features.filter(f=>f.kind!=='locker')){approach(center(f),38,f.kind==='empty-task'?open:closed,true);s.interact();if(!s.rogue.opened.has(f.id))throw Error(f.id+' interaction failed');}
   // Render a real supply cabinet next to its surrounding architecture.
   const cabinet=s.rogue.features.find(f=>f.kind==='cache');approach(center(cabinet),38,open,true);s.angle=-Math.PI/2;s.flashlightOn=true;s.draw();s.light();s.cameras.main.stopFollow();s.cameras.main.centerOn(s.player.x,s.player.y);s.sync();
   return {night:s.round,seed:s.mapSeed,key:s.level.key,boxes:s.level.boxes,fuses:s.state.fuses,features:s.rogue.features,checked};
  });
  assert.equal(report.night,night);assert.equal(report.fuses,3);reports.push(report);await page.screenshot({path:`${out}/night-${night}.png`});console.log(`Night ${night}: key, lock chain and all search containers accessible`);
  for(const index of [0,1]){
   const target=report.boxes[index],approach=report.checked.find(c=>c.target.x===target.x&&c.target.y===target.y).at;
   await page.evaluate(({target,approach})=>{const s=window.__nightshiftScene;s.player.setPosition(approach.x,approach.y);s.angle=Math.atan2(target.y-approach.y,target.x-approach.x);s.draw();s.light();s.cameras.main.centerOn(s.player.x,s.player.y);s.sync();}, {target,approach});
   await page.screenshot({path:`${out}/night-${night}-task-${index+1}.png`});
  }
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/report.json',JSON.stringify({reports,errors},null,2));
}finally{await browser.close();}
