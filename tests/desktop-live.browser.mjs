import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='output/desktop/integration';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Contract stub only replaces native IPC; real game, storage facade and adapter execute unchanged.
 await page.addInitScript(()=>{
  window.isTauri=true;window.commands=[];window.acks=[];window.events=[];window.calls=[];window.connection='authenticated';
  window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback:()=>1,invoke:async(cmd,args)=>{
   window.calls.push(cmd);if(cmd==='desktop_event'){window.events.push(args);return;}
   if(cmd==='desktop_boot')return {launch:{session:'test-session',play:'7682641099949034247',language:'en'},save:JSON.parse(localStorage.getItem('test-native-disk')??'null')??{'night-shift-campaign-v1':'{"unlocked":7}','night-shift-monster-lessons-v1':'["monster-listener","monster-light-shy","monster-patroller","monster-weeper"]','night-shift-language-v1':'ja'}};
   if(cmd==='desktop_save'){localStorage.setItem('test-native-disk',JSON.stringify(args.values));return;}
   if(cmd==='desktop_poll')return {status:window.connection,reason_code:window.reasonCode,messages:window.commands.splice(0)};
   if(cmd==='desktop_ack'){window.acks.push(args);return;}
   return 1;
  }};
 });
 await page.route('https://avatar.example/viewer.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0XcAAAAASUVORK5CYII=','base64')}));
 const base=process.env.BASE_URL||'http://localhost:5194/';await page.goto(base+'?playtest=desktop');await page.locator('#start:enabled').waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.waitForFunction(()=>window.events.some(e=>e.event==='GAME_READY'));
 assert.ok(await page.evaluate(()=>window.events.some(e=>e.event==='GAME_EFFECT_MODE_CHANGED'&&e.data.mode==='')));
 const sendBatch=async(entries)=>{const messages=entries.map(([instruction,count=1])=>({instruction,count,interaction_id:crypto.randomUUID(),play_id:'7682641099949034247',trigger_nick_name:'Viewer <safe>',trigger_encrypted_id:'viewer',trigger_avatar_url:'https://avatar.example/viewer.png'}));await page.evaluate(messages=>window.commands.push(...messages),messages);return messages.map(m=>m.interaction_id);};
 const send=async(instruction,count=1)=>(await sendBatch([[instruction,count]]))[0];
 const ack=async(id,result)=>{await page.waitForFunction(id=>window.acks.some(a=>a.id===id),id);assert.equal(await page.evaluate(id=>window.acks.find(a=>a.id===id).result,id),result);};
 await ack(await send('gift_battery'),false); // title screen must not accept effects
 await page.locator('[data-night="2"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=9999;s.ghostTime=0;s.ghost.setVisible(false);s.protection=9999;});
 const initial=await page.evaluate(()=>({flashes:window.__nightshiftScene.flashes,bandages:window.__nightshiftScene.bandages,seed:window.__nightshiftScene.mapSeed}));
 await ack(await send('gift_battery',2),true);await page.waitForFunction(()=>document.querySelector('.gift-photo canvas')); assert.ok(await page.evaluate(()=>window.__nightshiftScene.batteryReserve)>40);
 await ack(await send('gift_flash',101),true);assert.equal(await page.evaluate(()=>window.__nightshiftScene.flashes),initial.flashes+101);
 await page.evaluate(()=>window.__nightshiftScene.state.health=20);await ack(await send('gift_heal'),true);assert.equal(await page.evaluate(()=>window.__nightshiftScene.state.health),80);
 const fail=await send('gift_failure');await page.waitForFunction(()=>window.__nightshiftScene.gifts.active?.entry.kind==='failure');assert.equal(await page.evaluate(id=>window.acks.some(a=>a.id===id),fail),false);
 await page.evaluate(()=>{const s=window.__nightshiftScene;for(let i=0;i<205;i++)s.updateGifts(.05);});await ack(fail,true);
 const old=await page.evaluate(()=>window.__nightshift().player);const warp=await send('gift_warp');await page.waitForTimeout(150);assert.equal(await page.evaluate(id=>window.acks.some(a=>a.id===id),warp),false);
 await page.evaluate(()=>{const s=window.__nightshiftScene;for(let i=0;i<270;i++)s.updateGifts(.05);});await ack(warp,true);const pos=await page.evaluate(()=>window.__nightshift().player);assert.ok(Math.hypot(pos.x-old.x,pos.y-old.y)>50);
 await ack(await send('gift_shade',2),true);assert.ok(await page.evaluate(()=>window.__nightshift().gifts.shade)>37);await page.screenshot({path:out+'/effects.png'});
 await ack(await send('unsupported'),false);
 const resetGifts=async()=>page.evaluate(()=>{const s=window.__nightshiftScene;s.clearGifts();s.gifts.begin(crypto.randomUUID());s.state.battery=100;s.state.health=20;s.blackout=0;s.blackouts.warning=0;s.state.fuses=0;});
 const supplies=()=>page.evaluate(()=>{const s=window.__nightshiftScene;return {flashes:s.flashes,bandages:s.bandages,health:s.state.health,battery:s.state.battery,reserve:s.batteryReserve,shade:s.gifts.shade};});
 const noAck=async ids=>assert.equal(await page.evaluate(ids=>window.acks.some(a=>ids.includes(a.id)),ids),false);
 // All six commands wait without changing the frozen game or reporting success.
 for(const blocked of ['pause','tutorial']){
  await resetGifts();
  if(blocked==='pause')await page.locator('#pause').click();
  else await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.prompt='monster-patroller';s.sync();});
  await page.waitForFunction(()=>{const s=window.__nightshiftScene;return s.game.isPaused&&!s.game.loop.running;});
  const before=await supplies();
  const ids=await sendBatch([['gift_battery',2],['gift_flash',2],['gift_heal',2],['gift_shade'],['gift_warp'],['gift_failure']]);
  await page.waitForFunction(ids=>ids.every(id=>window.__nightshiftScene.localQueue.some(e=>e.id===id)),ids);
  await page.waitForTimeout(150);await noAck(ids);assert.deepEqual(await supplies(),before);
  assert.equal(await page.evaluate(()=>window.__nightshiftScene.gifts.active),null);
  assert.equal(await page.evaluate(()=>window.__nightshiftScene.game.isPaused),true);
  if(blocked==='pause')await page.locator('#resume').click();else await page.locator('#tutorial-continue').click();
  for(const id of ids.slice(0,4))await ack(id,true);
  assert.equal((await supplies()).flashes,before.flashes+2);assert.equal((await supplies()).bandages,before.bandages+2);
  assert.equal((await supplies()).health,100);assert.ok((await supplies()).reserve>40);
  assert.ok(await page.evaluate(()=>window.__nightshiftScene.giftShade.position));
  await page.waitForFunction(()=>window.__nightshiftScene.gifts.warping);
  // The warp stops this batch before its final failure command; the shade cannot
  // attack while we inspect the queue and wait for the real rendered transition.
  await noAck(ids.slice(4));assert.deepEqual(await page.evaluate(()=>window.__nightshiftScene.localQueue.map(e=>e.id)),[ids[5]]);
  await page.evaluate(()=>window.__nightshiftScene.giftShade.tear=9999);
  await ack(ids[4],true);
  await page.waitForFunction(id=>window.__nightshiftScene.gifts.queue.some(e=>e.key===id),ids[5]);await noAck([ids[5]]);
  await page.evaluate(()=>{const s=window.__nightshiftScene;s.gifts.shade=0;for(let i=0;i<425;i++)s.updateGifts(.05);});await ack(ids[5],true);
  assert.deepEqual(await page.evaluate(ids=>ids.map(id=>window.acks.filter(a=>a.id===id).length),ids),ids.map(()=>1));
 }
 // Receiving a warp and supplies in the same native poll must preserve order.
 await resetGifts();const beforeWarp=await supplies();
 const [batchWarp,batchFlash]=await sendBatch([['gift_warp'],['gift_flash',3]]);
 await page.waitForFunction(()=>window.__nightshiftScene.gifts.warping);await noAck([batchWarp,batchFlash]);
 assert.equal((await supplies()).flashes,beforeWarp.flashes);
 const duringWarp=await send('gift_heal',2);
 await page.waitForFunction(()=>window.__nightshiftScene.localQueue.length===2);await noAck([batchFlash,duringWarp]);assert.equal((await supplies()).health,20);
 await ack(batchWarp,true);await ack(batchFlash,true);await ack(duringWarp,true);
 assert.equal((await supplies()).flashes,beforeWarp.flashes+3);assert.equal((await supplies()).bandages,beforeWarp.bandages+2);
 await page.evaluate(async()=>{const m=await import('/src/runtime/desktop-live.ts');await m.setDesktopEffectMode('platform-custom-mode');await m.setDesktopEffectMode('');});
 assert.ok(await page.evaluate(()=>window.events.some(e=>e.data.mode==='platform-custom-mode')));
 await page.locator('#pause').click();const beforeDisconnect=await supplies();
 const [pending,pendingFlash]=await sendBatch([['gift_failure',2],['gift_flash',7]]);await page.waitForFunction(()=>window.__nightshiftScene.localQueue.length===2);await noAck([pending,pendingFlash]);
 await page.evaluate(()=>{window.reasonCode=100;window.connection='disconnected';});await ack(pending,false);await ack(pendingFlash,false);
 assert.equal((await supplies()).flashes,beforeDisconnect.flashes);assert.equal(await page.evaluate(()=>window.__nightshiftScene.localQueue.length),0);
 assert.equal(await page.evaluate(()=>window.__nightshiftScene.gifts.shade),0);assert.equal(await page.evaluate(()=>window.__nightshiftScene.batteryReserve),0);assert.equal(await page.evaluate(()=>window.__nightshiftScene.giftShade.position),null);
 assert.ok(await page.getByText(/Live interaction disconnected/).isVisible());
 await page.evaluate(()=>{window.connection='authenticated';});
 const disk=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-native-disk')));assert.equal(JSON.parse(disk['night-shift-current-run-v1']).night,2);assert.equal(disk['night-shift-language-v1'],'ja');
 await page.reload();await page.locator('#start:enabled').waitFor();assert.equal(await page.locator('[data-night="2"]').getAttribute('aria-pressed'),'true');await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);assert.equal(await page.evaluate(()=>window.__nightshiftScene.mapSeed),initial.seed);assert.equal(await page.evaluate(()=>window.__nightshift().flashes),initial.flashes);
 await page.locator('#pause').click();const endPending=await send('gift_flash',9);await page.waitForFunction(()=>window.__nightshiftScene.localQueue.length===1);await noAck([endPending]);
 await page.evaluate(()=>window.__nightshiftScene.finish(true));await ack(endPending,false);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>window.events.some(e=>e.event==='GAME_STATE_CHANGED'&&e.data.state==='ended')));const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-native-disk')));assert.equal(saved['night-shift-current-run-v1'],undefined);assert.ok(JSON.parse(saved['night-shift-runs-v1']).length>=1);
 // Restarting a scene also cancels held commands, even without finish().
 await page.evaluate(()=>window.__nightshiftScene.startRun(2));await page.waitForFunction(()=>window.__nightshiftScene.active);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.setPaused(true);});const restartPending=await send('gift_flash',11);await page.waitForFunction(()=>window.__nightshiftScene.localQueue.length===1);
 const oldRun=await page.evaluate(()=>window.__nightshiftScene.gifts.runId);await page.evaluate(()=>window.__nightshiftScene.startRun(2));await ack(restartPending,false);
 await page.waitForFunction(run=>window.__nightshiftScene.active&&window.__nightshiftScene.gifts.runId!==run,oldRun);
 assert.equal(await page.evaluate(()=>window.__nightshiftScene.flashes),initial.flashes);assert.equal(await page.evaluate(()=>window.__nightshiftScene.localQueue.length),0);
 // Returning to the title can leave the scene active, but no live run may queue.
 await page.locator('#result-menu').evaluate(button=>button.click());await page.waitForFunction(()=>document.body.dataset.ui==='title');
 await ack(await send('gift_flash'),false);assert.equal(await page.evaluate(()=>window.__nightshiftScene.localQueue.length),0);
 await page.evaluate(async()=>{const m=await import('/src/runtime/storage.ts');await m.prepareDesktopClose();});
 assert.ok(await page.evaluate(()=>window.calls.includes('desktop_shutdown')));
 const fresh=await browser.newPage();
 await fresh.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1','{"unlocked":999}');window.isTauri=true;window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback:()=>1,invoke:async(cmd,args)=>{if(cmd==='desktop_boot')return {save:null,scoped:true,launch:{session:'fresh',play:'different-play',language:'en'}};if(cmd==='desktop_save'){window.freshSave=args.values;return;}if(cmd==='desktop_poll')return {status:'authenticated',messages:[]};return 1;}};});
 await fresh.goto(base);await fresh.locator('#start:enabled').waitFor();assert.equal(await fresh.locator('[data-night="2"]').isDisabled(),true);assert.equal(await fresh.evaluate(()=>window.freshSave['night-shift-campaign-v1']),undefined);await fresh.close();
 assert.deepEqual(errors,[]);console.log('Desktop adapter: 6 effects, pause/tutorial/warp queues, completion ACKs, disconnect/end/restart cancellation, native hydration and night restart passed');
}finally{await browser.close();}
