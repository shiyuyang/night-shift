import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});mkdirSync('output/morgue',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-campaign-v1','{"unlocked":6}');localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5188')+'/?playtest=drawer',{waitUntil:'domcontentloaded'});await page.locator('#start:enabled').waitFor();await page.locator('[data-night="6"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 // Isolated rendering/occupancy fixture; full keyboard progression is tested separately.
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.opened=[true,true,true];s.player.setPosition(s.morgueDrawer.area.x+20,s.morgueDrawer.area.y+40);s.command('sanctuary','world');});
 await page.waitForFunction(()=>window.__nightshift().morgueDrawer.phase==='warning');await page.waitForTimeout(800);await page.screenshot({path:'output/morgue/drawer-warning.png'});
 await page.waitForTimeout(3500);assert.equal(await page.evaluate(()=>window.__nightshift().morgueDrawer.phase),'warning');
 await page.evaluate(()=>window.__nightshiftScene.player.setPosition(1116,490));await page.waitForFunction(()=>window.__nightshift().morgueDrawer.phase==='extending');
 await page.evaluate(()=>window.__nightshiftScene.paused=true);const progress=await page.evaluate(()=>window.__nightshift().morgueDrawer.progress);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.__nightshift().morgueDrawer.progress),progress);
 await page.evaluate(()=>window.__nightshiftScene.paused=false);await page.waitForFunction(()=>window.__nightshift().morgueDrawer.phase==='open');
 const images=await page.evaluate(()=>{const s=window.__nightshiftScene,frame=s.textures.get('morgue-body').get(0);return {alpha:s.textures.getPixelAlpha(0,0,'morgue-body'),frame:{width:frame.width,height:frame.height},trolleys:s.children.list.filter(o=>o.getData?.('morgueBody')==='trolley').length,expected:s.level.props.filter(p=>p.kind==='shroudedtrolley').length,drawerTexture:s.morgueBody.texture.key};});assert.equal(images.alpha,0);assert.equal(images.trolleys,images.expected);assert.equal(images.drawerTexture,'morgue-body');
 const state=await page.evaluate(()=>window.__nightshift());assert.equal(state.morgueDrawer.progress,1);assert.ok(state.solids.some(b=>b.x===state.morgueDrawer.area.x&&b.y===448&&b.height===108));
 await page.screenshot({path:'output/morgue/drawer-extended.png'});
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.paused=true;s.lightImage.setVisible(false);});await page.screenshot({path:'output/morgue/drawer-alignment.png'});assert.deepEqual(errors,[]);writeFileSync('output/morgue/drawer-report.json',JSON.stringify({fixture:'Injected second-box state and player positions; separate from walkthrough',images,occupancyDelay:true,pauseFrozen:true,openCollision:state.morgueDrawer,errors},null,2)+'\n');
}finally{await browser.close();}
