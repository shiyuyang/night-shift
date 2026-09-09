import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:5193/',out='output/live-gifts-v2';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto(base+'?playtest=gifts');await page.locator('#start:enabled').waitFor();await page.locator('[data-night="2"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active&&window.__nightshift().night===2);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.weeper=undefined;s.weeperSprite.setVisible(false);s.cooldown=9999;s.ghostTime=0;s.ghost.setVisible(false);s.protection=9999;});
 // Isolate the long UI/locale walkthrough from lethal contact; gift-shade.browser.mjs covers real contact.
 await page.evaluate(()=>{const shade=window.__nightshiftScene.giftShade,tick=shade.tick.bind(shade);shade.tick=(...args)=>{tick(...args);return false;};});
 const runId=await page.evaluate(()=>window.__nightshift().gifts.runId);
 let seq=0;const send=async(giftId,count=1,extra={})=>{const e={id:`browser-${runId}-${++seq}`,runId,giftId,count,viewer:'Sakura · 夜巡',userId:'sakura',avatar:'https://avatars.githubusercontent.com/u/1?v=4',...extra};const r=await page.request.post(base+'api/webhook',{data:e});assert.equal(r.status(),200);return e;};
 await send('59319',1,{comboId:'shade-combo'});await page.waitForFunction(()=>window.__nightshift().gifts.shade>15);await send('59319',3,{comboId:'shade-combo'});await page.waitForFunction(()=>window.__nightshift().gifts.shade>55);
 assert.equal(await page.evaluate(()=>window.__nightshiftScene.children.list.filter(x=>x.texture?.key==='gift-shade').length),1);
 await send('59315',3,{viewer:'Alex_W',userId:'alex',comboId:'failure-combo'});await page.waitForFunction(()=>window.__nightshift().gifts.active?.entry.kind==='failure');
 await send('59318',2,{viewer:'Mika・ミカ',userId:'mika',comboId:'warp-combo'});await page.waitForFunction(()=>window.__nightshift().gifts.pending===4);
 await page.waitForTimeout(400);await page.screenshot({path:out+'/notification-queue.png'});
 // Real pause freezes current effect and the paid shade clock.
 await page.evaluate(()=>window.__nightshiftScene.setPaused(true));const frozen=await page.evaluate(()=>window.__nightshift().gifts);await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>window.__nightshift().gifts),frozen);
 await send('59319',4,{comboId:'shade-combo'});await page.waitForFunction(()=>window.__nightshift().gifts.shade>70);await page.waitForTimeout(300);await page.screenshot({path:out+'/shade-combo.png'});
 // Buffs delivered immediately even while paused, retaining overflow battery.
 await page.evaluate(()=>{window.__nightshiftScene.state.battery=90;window.__nightshiftScene.state.health=30;});
 const before=await page.evaluate(()=>({f:window.__nightshiftScene.flashes,b:window.__nightshiftScene.bandages}));
 await send('59511',2);await send('59316',2);await send('59317');await page.waitForFunction(()=>window.__nightshiftScene.state.health===90);const buffs=await page.evaluate(()=>({battery:window.__nightshiftScene.state.battery,reserve:window.__nightshiftScene.batteryReserve,f:window.__nightshiftScene.flashes,b:window.__nightshiftScene.bandages}));assert.equal(buffs.battery,100);assert.equal(buffs.reserve,40);assert.equal(buffs.f,before.f+2);assert.equal(buffs.b,before.b+1);await page.waitForTimeout(300);await page.screenshot({path:out+'/aid-receipt.png'});
 // Teaching freezes the exact same clocks; scene fixture avoids unrelated lesson progression.
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);s.tutorial.prompt='key';});const teach=await page.evaluate(()=>window.__nightshift().gifts.shade);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__nightshift().gifts.shade),teach);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.tutorial.prompt=null;s.setPaused(true);s.gifts.active=null;s.gifts.queue=[];s.gifts.gap=0;s.gifts.warpReady=0;});
 // Begin actual warp and capture full-screen disturbance before blackout.
 await send('59318',1);await page.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);s.update(0,50);s.setPaused(true);});
 assert.equal(await page.evaluate(()=>window.__nightshiftScene.gifts.warping),true);await page.screenshot({path:out+'/warp-tear.png'});
 const old=await page.evaluate(()=>window.__nightshift().player);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);for(let i=0;i<45;i++)s.update(0,50);s.setPaused(true);});const pos=await page.evaluate(()=>window.__nightshift().player);assert.ok(Math.hypot(pos.x-old.x,pos.y-old.y)>50);
 await page.screenshot({path:out+'/warp-awake.png'});
 // Show the actual four directional frames and prove items do not alter shade state.
 await page.evaluate(async()=>{const s=window.__nightshiftScene,{giftLanding}=await import('/src/runtime/gift-placement.ts');s.giftShade.position=giftLanding(s.player,s.solids(),s.level.bounds,90,[],Math.PI);s.giftShade.tear=0;s.giftShade.teleportWait=3;s.showGifts();});
 for(let row=0;row<4;row++){await page.evaluate(row=>{const s=window.__nightshiftScene,p=s.giftShade.position;s.shadeSprite.setPosition(p.x,p.y+16).setVisible(true).setAlpha(.9).setFrame(row*4+1);},row);await page.screenshot({path:`${out}/shade-direction-${row}.png`});}
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(false);s.protection=9999;s.flashes=10;s.decoys=10;s.bandages=10;});
 const prior=await page.evaluate(()=>window.__nightshift().gifts.shade);for(const key of ['F','R','Q'])await page.evaluate(key=>window.__nightshiftScene.useItem(key),key);
 assert.ok(await page.evaluate(()=>window.__nightshift().gifts.shade)>prior-3);
 await page.evaluate(async()=>{const s=window.__nightshiftScene,{giftLanding}=await import('/src/runtime/gift-placement.ts');const p=giftLanding(s.giftShade.position,s.solids(),s.level.bounds,450,[],0);s.player.setPosition(p.x,p.y);s.giftShade.teleportWait=0;s.update(0,50);s.setPaused(true);});
 assert.ok(await page.evaluate(()=>window.__nightshift().giftShade.teleports)>0);await page.screenshot({path:out+'/shade-teleport-tear.png'});
 await send('59315',4,{userId:'alex',viewer:'Alex_W',comboId:'extra-failure'});await send('59318',3,{userId:'mika',viewer:'Mika・ミカ',comboId:'extra-warp'});
 // Every required locale renders the new notification and queue without overflow.
 const locales=['en','id','es','ar','vi','fr','th','pt','tr','ru','ja','de','it','ro','ms','zh-Hant','ko','uk','az','pl','nl','el','bg','my','hu','he','hr','sv','zh-Hans'];
 for(const lang of locales){await page.evaluate(async lang=>{const i=await import('/src/i18n.ts');i.setLocale(lang);window.__nightshiftScene.showGifts();},lang);await page.evaluate(()=>document.fonts.ready);const bad=await page.locator('.gift-panel').evaluate(el=>[...el.querySelectorAll('strong,em,header,footer,time')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent));assert.deepEqual(bad,[],lang);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(30);const bounds=await page.locator('.gift-panel .gift-wait').boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844&&bounds.y>500,lang+' mobile queue');await page.setViewportSize({width:1440,height:900});}
 await page.evaluate(async()=>{(await import('/src/i18n.ts')).setLocale('ja');window.__nightshiftScene.showGifts();});await page.screenshot({path:out+'/japanese.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.screenshot({path:out+'/mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Player proximity fades each real overlay independently, and restores after leaving.
 await page.evaluate(()=>{window.__nightshiftScene.giftShade.tear=0;window.__nightshiftScene.showGifts();});
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);
 for(const selector of ['.gift-receipt','.gift-live','.gift-wait']){
  await page.evaluate(selector=>{const s=window.__nightshiftScene,c=s.cameras.main;c.stopFollow();const r=document.querySelector('#game canvas').getBoundingClientRect(),b=document.querySelector(selector).getBoundingClientRect();const p=c.getWorldPoint((b.left+b.width/2-r.left)*s.scale.width/r.width,(b.top+b.height/2-r.top)*s.scale.height/r.height);s.player.setPosition(p.x,p.y);s.showGifts();},selector);
  await page.waitForTimeout(240);assert.ok(await page.locator(selector).evaluate(el=>Number(getComputedStyle(el).opacity))<.2,selector+' proximity fade');
 }
 await page.screenshot({path:out+'/player-near-queue.png'});
 await page.evaluate(()=>{const s=window.__nightshiftScene,c=s.cameras.main,p=c.getWorldPoint(s.scale.width*.8,s.scale.height*.5);s.player.setPosition(p.x,p.y);s.showGifts();});await page.waitForTimeout(240);
 for(const selector of ['.gift-receipt','.gift-live','.gift-wait']){assert.ok(await page.locator(selector).evaluate(el=>Number(getComputedStyle(el).opacity))>.98,selector+' restored');assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');}
 await page.screenshot({path:out+'/transparent-hud.png'});
 // Real photographic avatar is rendered into the low-resolution monitor treatment.
 await page.evaluate(async()=>{(await import('/src/i18n.ts')).setLocale('zh-Hans');window.__nightshiftScene.showGifts();});
 await page.waitForFunction(()=>document.querySelector('.gift-receipt .gift-photo canvas'));
 assert.equal(await page.locator('.gift-live .gift-photo,.gift-wait .gift-photo').count(),0);
 await page.waitForTimeout(250);
 await page.screenshot({path:out+'/photo-monitor-game.png'});
 const panelBox=await page.locator('.gift-panel').boundingBox();
 await page.screenshot({path:out+'/photo-monitor.png',clip:{x:panelBox.x-6,y:panelBox.y-6,width:panelBox.width+12,height:panelBox.height+12}});
 await page.evaluate(()=>{const c=document.querySelector('.gift-receipt .gift-photo canvas'),img=document.createElement('img');img.src='https://avatars.githubusercontent.com/u/1?v=4';img.style.filter='none';c.replaceWith(img);document.querySelector('.gift-photo').classList.add('raw-photo');const style=document.createElement('style');style.textContent='.raw-photo:after{display:none}';document.head.append(style);});
 // Use a detached overlay image for the untreated comparison; the live load handler would reprocess a child image.
 await page.evaluate(()=>{const slot=document.querySelector('.gift-receipt .gift-photo'),r=slot.getBoundingClientRect(),img=document.createElement('img');img.id='raw-preview';img.src='https://avatars.githubusercontent.com/u/1?v=4';Object.assign(img.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',objectFit:'cover',zIndex:'100'});document.body.append(img);});
 await page.waitForFunction(()=>{const i=document.querySelector('#raw-preview');return i.complete&&i.naturalWidth>0;});
 await page.screenshot({path:out+'/photo-original.png',clip:{x:panelBox.x-6,y:panelBox.y-6,width:panelBox.width+12,height:panelBox.height+12}});
 await page.locator('#raw-preview').evaluate(el=>el.remove());
 // Clear on finish; stale events must never enter next run.
 await page.evaluate(()=>window.__nightshiftScene.finish(false));assert.equal(await page.evaluate(()=>window.__nightshift().gifts.pending),0);assert.equal(await page.evaluate(()=>window.__nightshift().gifts.shade),0);assert.equal(await page.locator('.gift-panel').isVisible(),false);
 await page.evaluate(()=>window.__nightshiftScene.startRun(2));await page.waitForFunction(()=>window.__nightshiftScene.active);await send('59319');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__nightshift().gifts.shade),0);
 assert.deepEqual(errors,[]);console.log('Gift transport, combo, single shade, queues, buffs, freeze, warp, 29 locales, mobile, finish and stale-run checks passed.');
}finally{await browser.close();}
