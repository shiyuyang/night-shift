import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const fixture of [{night:1,seed:0,kind:'cache'},{night:2,seed:0,kind:'box'},{night:3,seed:1,kind:'key'}]){
  await page.addInitScript(({night,seed})=>{localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night,seed}));},fixture);
  await page.goto((process.env.BASE_URL??'http://127.0.0.1:5174/')+'?playtest=interaction-access&balance=1');
  await page.locator(`[data-night="${fixture.night}"]`).click();await page.locator('#start:enabled').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
  const result=await page.evaluate(async({kind})=>{
   const {reachablePositions}=await import('/src/runtime/level-validation.ts'),{feetAt,overlaps}=await import('/src/collision.ts');
   const s=window.__nightshiftScene;s.tutorial.skip();s.setPaused(true);
   const points=reachablePositions(s.level,false).filter(p=>!s.solids().some(b=>overlaps(feetAt(p.x,p.y),b)));
   const targets=kind==='key'?[{id:'key',...s.level.key}]:kind==='box'?[{id:'box',...s.level.boxes[0]}]:s.rogue.features.filter(f=>f.kind==='cache').map(f=>({id:f.id,x:f.x+f.width/2,y:f.y+f.height/2}));
   const range=kind==='key'?34:kind==='box'?44:38;
   let target,bad,front;
   for(const candidate of targets){
    bad=points.find(p=>{s.player.setPosition(p.x,p.y);return Math.hypot(p.x-candidate.x,p.y-candidate.y)<range&&!s.canReachInteraction(candidate);});
    front=points.find(p=>{s.player.setPosition(p.x,p.y);return Math.hypot(p.x-candidate.x,p.y-candidate.y)<range-3&&s.canReachInteraction(candidate);});
    if(bad&&front){target=candidate;break;}
   }
   if(!target)throw Error('Missing physical wall-side and accessible-side fixture');
   const opened=()=>kind==='key'?s.key:kind==='box'?s.opened[0]:s.rogue.opened.has(target.id);
   s.player.setPosition(bad.x,bad.y);s.interact();const throughWall=opened();
   s.player.setPosition(front.x,front.y);s.interact();const accessible=opened();
   const beforeRepeat=JSON.stringify([s.key,s.state.fuses,[...s.rogue.opened],s.flashes,s.decoys,s.bandages]);s.interact();
   return {throughWall,accessible,repeatUnchanged:beforeRepeat===JSON.stringify([s.key,s.state.fuses,[...s.rogue.opened],s.flashes,s.decoys,s.bandages]),target,bad,front};
  },fixture);
  assert.equal(result.throughWall,false,fixture.kind);assert.equal(result.accessible,true,fixture.kind);assert.equal(result.repeatUnchanged,true,fixture.kind);
  console.log('Wall blocks interaction; accessible side works once:',fixture.kind);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
