import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='output/desktop/integration';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Contract stub only replaces native IPC; real game, storage facade and adapter execute unchanged.
 await page.addInitScript(()=>{
  window.isTauri=true;window.commands=[];window.acks=[];window.connection='authenticated';
  window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback:()=>1,invoke:async(cmd,args)=>{
   if(cmd==='desktop_boot')return {launch:{session:'test-session',play:'7682641099949034247',language:'en'},save:JSON.parse(localStorage.getItem('test-native-disk')??'null')??{'night-shift-campaign-v1':'{"unlocked":7}','night-shift-monster-lessons-v1':'["monster-listener","monster-light-shy","monster-patroller","monster-weeper"]','night-shift-language-v1':'ja'}};
   if(cmd==='desktop_save'){localStorage.setItem('test-native-disk',JSON.stringify(args.values));return;}
   if(cmd==='desktop_poll')return {status:window.connection,messages:window.commands.splice(0)};
   if(cmd==='desktop_ack'){window.acks.push(args);return;}
   return 1;
  }};
 });
 const base=process.env.BASE_URL||'http://localhost:5194/';await page.goto(base+'?playtest=desktop');await page.locator('#start:enabled').waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 const send=async(instruction,count=1)=>{const id=crypto.randomUUID();await page.evaluate(d=>window.commands.push(d),{instruction,count,interaction_id:id,play_id:'7682641099949034247',trigger_nick_name:'Viewer <safe>',trigger_encrypted_id:'viewer'});return id;};
 const ack=async(id,result)=>{await page.waitForFunction(id=>window.acks.some(a=>a.id===id),id);assert.equal(await page.evaluate(id=>window.acks.find(a=>a.id===id).result,id),result);};
 await ack(await send('gift_battery'),false); // title screen must not accept effects
 await page.locator('[data-night="2"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=9999;s.ghostTime=0;s.ghost.setVisible(false);s.protection=9999;});
 const initial=await page.evaluate(()=>({flashes:window.__nightshiftScene.flashes,bandages:window.__nightshiftScene.bandages,seed:window.__nightshiftScene.mapSeed}));
 await ack(await send('gift_battery',2),true);assert.ok(await page.evaluate(()=>window.__nightshiftScene.batteryReserve)>40);
 await ack(await send('gift_flash',2),true);assert.equal(await page.evaluate(()=>window.__nightshiftScene.flashes),initial.flashes+2);
 await page.evaluate(()=>window.__nightshiftScene.state.health=20);await ack(await send('gift_heal'),true);assert.equal(await page.evaluate(()=>window.__nightshiftScene.state.health),80);
 const fail=await send('gift_failure');await page.waitForFunction(()=>window.__nightshiftScene.gifts.active?.entry.kind==='failure');assert.equal(await page.evaluate(id=>window.acks.some(a=>a.id===id),fail),false);
 await page.evaluate(()=>{const s=window.__nightshiftScene;for(let i=0;i<205;i++)s.updateGifts(.05);});await ack(fail,true);
 const old=await page.evaluate(()=>window.__nightshift().player);const warp=await send('gift_warp');await page.waitForTimeout(150);assert.equal(await page.evaluate(id=>window.acks.some(a=>a.id===id),warp),false);
 await page.evaluate(()=>{const s=window.__nightshiftScene;for(let i=0;i<270;i++)s.updateGifts(.05);});await ack(warp,true);const pos=await page.evaluate(()=>window.__nightshift().player);assert.ok(Math.hypot(pos.x-old.x,pos.y-old.y)>50);
 await ack(await send('gift_shade',2),true);assert.ok(await page.evaluate(()=>window.__nightshift().gifts.shade)>37);await page.screenshot({path:out+'/effects.png'});
 await ack(await send('unsupported'),false);await page.evaluate(()=>window.__nightshiftScene.setPaused(true));await ack(await send('gift_flash'),false);await page.evaluate(()=>window.__nightshiftScene.setPaused(false));
 const pending=await send('gift_failure',2);await page.waitForTimeout(100);await page.evaluate(()=>window.__nightshiftScene.clearGifts());await ack(pending,false);
 const disk=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-native-disk')));assert.equal(JSON.parse(disk['night-shift-current-run-v1']).night,2);assert.equal(disk['night-shift-language-v1'],'ja');
 await page.reload();await page.locator('#start:enabled').waitFor();assert.equal(await page.locator('[data-night="2"]').getAttribute('aria-pressed'),'true');await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);assert.equal(await page.evaluate(()=>window.__nightshiftScene.mapSeed),initial.seed);assert.equal(await page.evaluate(()=>window.__nightshift().flashes),initial.flashes);
 await page.evaluate(()=>window.__nightshiftScene.finish(true));await page.waitForTimeout(150);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-native-disk')));assert.equal(saved['night-shift-current-run-v1'],undefined);assert.ok(JSON.parse(saved['night-shift-runs-v1']).length>=1);
 const fresh=await browser.newPage();
 await fresh.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1','{"unlocked":999}');window.isTauri=true;window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback:()=>1,invoke:async(cmd,args)=>{if(cmd==='desktop_boot')return {save:null,scoped:true,launch:{session:'fresh',play:'different-play',language:'en'}};if(cmd==='desktop_save'){window.freshSave=args.values;return;}if(cmd==='desktop_poll')return {status:'authenticated',messages:[]};return 1;}};});
 await fresh.goto(base);await fresh.locator('#start:enabled').waitFor();assert.equal(await fresh.locator('[data-night="2"]').isDisabled(),true);assert.equal(await fresh.evaluate(()=>window.freshSave['night-shift-campaign-v1']),undefined);await fresh.close();
 assert.deepEqual(errors,[]);console.log('Desktop adapter: 6 effects, delayed ACKs, failures, cancellation, native hydration and night restart passed');
}finally{await browser.close();}
