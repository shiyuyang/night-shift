import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__playedSounds=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const d=this.buffer.getChannelData(0);window.__playedSounds.push([this.buffer.length,d[101],d[503],d[1009]]);}return start.apply(this,args);};localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1',JSON.stringify({unlocked:7}));localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await p.goto((process.env.BASE_URL||'http://localhost:5193/')+'?playtest=shade');await p.locator('#start:enabled').waitFor();await p.locator('[data-night="3"]').click();await p.locator('#start').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);
 await p.evaluate(()=>{const s=window.__nightshiftScene;s.skipTutorial();s.cooldown=9999;s.weeper=undefined;s.weeperSprite.setVisible(false);s.player.setPosition(458,414);s.angle=0;});
 // Read the actual run ID from the public snapshot used by clients.
 const runId=await p.evaluate(()=>window.__nightshift().gifts.runId);
 await p.evaluate(runId=>window.__nightshiftScene.receiveGift({id:'shade-test-1',runId,giftId:'59319',count:1,comboId:'one',viewer:'Sakura',userId:'sakura',avatar:'https://avatars.githubusercontent.com/u/1?v=4'}),runId);
 await p.waitForFunction(()=>document.querySelector('#music-status')?.dataset.status==='ready');await p.waitForTimeout(750);
 const initial=await p.evaluate(()=>{const s=window.__nightshiftScene;return {distance:Math.hypot(s.player.x-s.giftShade.position.x,s.player.y-s.giftShade.position.y)};});
 assert.ok(initial.distance>=70&&initial.distance<=115);
 await p.evaluate(()=>{const s=window.__nightshiftScene;s.setPaused(true);s.giftShade.tear=.29;s.showGifts();});await p.waitForTimeout(100);
 const colors=await p.locator('.gift-screen-fx').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3]>0)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return colors.size;});
 assert.ok(colors>12,'signal slices must contain rendered scenery rather than empty WebGL black strips');
 await p.evaluate(()=>{const s=window.__nightshiftScene;s.giftShade.tear=0;s.setPaused(false);});
 await p.keyboard.press('a',{delay:50});await mkdir('output/shade-rework',{recursive:true});await p.screenshot({path:'output/shade-rework/nearby.png'});
 await p.evaluate(runId=>{const s=window.__nightshiftScene;s.setPaused(true);s.receiveGift({id:'shade-test-2',runId,giftId:'59319',count:2,comboId:'one',viewer:'Sakura',userId:'sakura'});},runId);
 const frozen=await p.evaluate(()=>window.__nightshift().gifts.shade);assert.ok(frozen>35);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.__nightshift().gifts.shade),frozen);
 assert.equal(await p.evaluate(()=>window.__nightshiftScene.children.list.filter(x=>x.texture?.key==='gift-shade').length),1);
 // A real contact kills even at full health with ordinary damage protection active.
 await p.evaluate(()=>{const s=window.__nightshiftScene;s.state.health=100;s.protection=999;s.giftShade.position={x:s.player.x,y:s.player.y};s.giftShade.tear=.3;s.giftShade.contactWait=0;s.setPaused(false);});
 await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.__nightshiftScene.state.health),100);
 await p.waitForFunction(()=>!window.__nightshiftScene.active);assert.equal(await p.evaluate(()=>window.__nightshiftScene.state.health),0);assert.equal(await p.locator('#result-screen').getAttribute('data-outcome'),'lost');assert.equal(await p.evaluate(()=>window.__nightshift().gifts.shade),0);assert.equal(await p.evaluate(()=>window.__nightshift().gifts.pending),0);
 await p.locator('.shade-contact-scare').waitFor({state:'visible'});await p.waitForTimeout(180);
 await p.screenshot({path:'output/shade-rework/contact-death.png'});
 const played=await p.evaluate(async()=>{const c=new AudioContext();try{const b=await c.decodeAudioData(await(await fetch('/audio/sfx/shade-contact-v1.opus')).arrayBuffer()),d=b.getChannelData(0),expected=[b.length,d[101],d[503],d[1009]];return window.__playedSounds.some(s=>JSON.stringify(s)===JSON.stringify(expected));}finally{await c.close();}});assert.ok(played,'contact must play the dedicated generated stinger');
 await p.locator('.shade-contact-scare').waitFor({state:'hidden'});assert.equal(await p.locator('#result-screen').isVisible(),true);
assert.deepEqual(errors,[]);console.log('Nearby appearance, single shade, combo, pause, flicker protection, lethal contact and gift clearing passed.');
}finally{await browser.close();}
