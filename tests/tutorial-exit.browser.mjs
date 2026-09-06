import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('night-shift-tutorial-v1',JSON.stringify(['move','key','box','flash','decoy','heal','practice','door'])));
 await page.goto('http://localhost:5174/?playtest=encounters');await page.locator('#start:enabled').waitFor();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.ui==='playing'&&window.__nightshiftScene?.active);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.player.setPosition(800,318);s.cameras.main.centerOn(800,318);s.state.fuses=3;s.exitStartup=8;s.cooldown=999;});
 await page.waitForFunction(()=>window.__nightshift().exitTour==='hold');
 assert.equal(await page.locator('.phase-hud').isVisible(),false);
 const before=await page.evaluate(()=>window.__nightshift());assert.equal(before.exitStartup,8);
 assert.ok(before.camera.x<400,JSON.stringify(before.camera));
 await page.waitForTimeout(220);assert.equal(await page.locator('#game-wrap').evaluate(e=>getComputedStyle(e,'::after').opacity),'0.42');
 const style=await page.locator('#tutorial-card').evaluate(e=>{const c=getComputedStyle(e);return [c.backgroundImage,c.backgroundColor,c.borderTopWidth,c.boxShadow]});assert.deepEqual(style,['none','rgba(0, 0, 0, 0)','0px','none']);
 await page.waitForTimeout(450);const held=await page.evaluate(()=>window.__nightshift());assert.equal(held.elapsed,before.elapsed);assert.equal(held.battery,before.battery);assert.equal(held.health,before.health);
 await page.screenshot({path:'/tmp/night-shift-exit-tutorial.png'});
 await page.locator('#tutorial-continue').click();await page.waitForFunction(()=>window.__nightshift().exitTour==='back');assert.equal(await page.locator('#tutorial-card').isVisible(),false);
 await page.waitForFunction(()=>window.__nightshift().exitTour==='none'&&window.__nightshift().tutorial.completed.includes('exit'));
 const after=await page.evaluate(()=>window.__nightshift());assert.ok(after.camera.x>before.camera.x+100);assert.ok(after.exitStartup>7.5);assert.deepEqual(errors,[]);
 console.log('Exit tour: outbound camera, transparent prompt, frozen simulation, return camera, learned flag passed.');
}finally{await browser.close();}
