import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});

try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:5174/')+'?playtest=monster-death');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="1"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);

 for(const seed of [0,1,42]){
  await p.evaluate(seed=>{localStorage.setItem('night-shift-current-run-v1',JSON.stringify({night:5,seed}));window.__nightshiftScene.startRun(5);},seed);
  await p.waitForFunction(seed=>window.__nightshiftScene?.level?.round===5&&window.__nightshiftScene.mapSeed===seed&&window.__nightshiftScene.active,seed);
  const result=await p.evaluate(()=>{
   const s=window.__nightshiftScene;s.setPaused(true);s.tutorial.skip();s.state.fuses=3;s.opened=[true,true,true];s.door=false;s.weeper=undefined;s.ghostTime=0;s.ghost.setPosition(s.level.spawn.x,s.level.spawn.y);s.player.setPosition(s.level.boxes[2].x,s.level.boxes[2].y+24);s.protection=999;s.hit=999;
   const samples=[];let still=0;
   for(let i=0;i<800;i++){
    if(i===400)s.door=true;
    if(i===600)s.player.setPosition(s.level.exit.x+60,s.level.exit.y);
    const r=s.reserves[0],before=r.position&&{...r.position};s.updateReinforcement(.05);
    if(r.position&&before)still=Math.hypot(r.position.x-before.x,r.position.y-before.y)<.01?still+.05:0;
    if(i%100===0)samples.push({t:i*.05,position:r.position&&{...r.position},target:r.target,check:s.interceptTargets[0],route:r.route.length,still,guard:r.guard,clue:r.clueClock});
   }
   return {seed:s.mapSeed,theme:s.level.theme,exit:s.level.exit,samples};
  });
  const later=result.samples.filter(s=>s.t>=25);assert.ok(later.length>=3);
  for(const sample of later)assert.ok(sample.still<2,`seed ${seed}: interceptor stopped at ${sample.t}s`);
  assert.notDeepEqual(later[0].position,later[1].position);
  console.log('Fifth-night interceptor resumes local search:',seed);

 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
