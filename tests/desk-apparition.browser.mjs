import {chromium} from '@playwright/test';
import {preview} from 'vite';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const output='output/ghost-preview';
mkdirSync(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}});
const browser=await chromium.launch({
 executablePath:['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),
 headless:true,
});
const url=process.env.DEPLOY_URL||`http://127.0.0.1:${server.httpServer.address().port}`;
try{
 const results=await Promise.all([[1440,900],[390,844]].map(async([width,height])=>{
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // First flicker is always the long sequence; subsequent ones use the short sequence.
  await page.goto(url);
  await page.locator('#start:enabled').waitFor();
  await page.evaluate(()=>{Math.random=()=>.5;});
  const flashes=await page.evaluate(()=>new Promise((resolve,reject)=>{
   const ghost=document.querySelector('.desk-yurei');
   const lamp=document.querySelector('.desk-lamp-falloff');
   const rows=[];let active;
   const timeout=setTimeout(()=>reject(Error('Two natural flashes not observed')),22000);
   const sample=()=>{
    const visible=Number(getComputedStyle(ghost).opacity)>0;
    if(visible){
     if(!active){
      const animation=ghost.getAnimations()[0];
      const frames=animation.effect.getKeyframes();
      active={start:performance.now(),frames:0,duration:animation.effect.getTiming().duration,
       specifiedMs:(frames[2].offset-frames[1].offset)*animation.effect.getTiming().duration,
       sameStart:animation.startTime===lamp.getAnimations()[0].startTime,litWhileVisible:false};
     }
     active.frames++;
     if(Number(getComputedStyle(lamp).opacity)===0)active.litWhileVisible=true;
    }else if(active){
     rows.push({...active,observedMs:performance.now()-active.start});active=undefined;
     if(rows.length===2){clearTimeout(timeout);resolve(rows);return;}
    }
    requestAnimationFrame(sample);
   };sample();
  }));
  assert.deepEqual(flashes.map(row=>row.duration),[620,240]);
  for(const row of flashes){
   assert.ok(Math.abs(row.specifiedMs-180)<.001);
   assert.ok(row.observedMs>=140&&row.observedMs<=230,JSON.stringify(row));
   assert.ok(row.frames>=5);
   assert.equal(row.sameStart,true);
   assert.equal(row.litWhileVisible,false);
  }
  // Freeze an actual animation at its visible beat for composition inspection.
  await page.reload();
  await page.waitForFunction(()=>{
   const ghost=document.querySelector('.desk-yurei');
   if(!ghost||Number(getComputedStyle(ghost).opacity)===0)return false;
   for(const selector of ['.desk-yurei','.desk-lamp-falloff']){
    for(const animation of document.querySelector(selector).getAnimations()){
     animation.pause();animation.currentTime=350;
    }
   }
   return true;
  },{},{polling:'raf'});
  await page.screenshot({path:`${output}/tested-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.desk-apparition').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('.desk-yurei').evaluate(el=>el.getAnimations().length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#start:enabled').click();
  await page.waitForFunction(()=>document.body.dataset.ui==='playing');
  assert.equal(await page.locator('.desk-apparition').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();
  return {width,height,flashes,reducedMotion:'passed',startGame:'passed',errors};
 }));
 writeFileSync(`${output}/test-results.json`,JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
