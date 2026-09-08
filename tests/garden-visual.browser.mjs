import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});mkdirSync('output/garden',{recursive:true});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('night-shift-language-v1','zh-Hans');localStorage.setItem('night-shift-campaign-v1','{"unlocked":7}');localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper']));});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:5188')+'/?playtest=garden-visual',{waitUntil:'domcontentloaded'});await page.locator('#start:enabled').waitFor();await page.locator('[data-night="7"]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.__nightshiftScene?.active);
 // Isolate visible lighting from route/balance checks performed by garden.browser.mjs.
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.player.setPosition(612,290);s.angle=Math.PI/2;s.command('sanctuary','world');});await page.waitForTimeout(700);
 const mask=()=>page.evaluate(()=>{const s=window.__nightshiftScene,l=s.level.lamps.find(l=>l.id==='LampWest');return s.canvas.context.getImageData(Math.round(l.x/2),Math.round(l.y/2),1,1).data[3];});
 const lit=await mask();await page.screenshot({path:'output/garden/courtyard-lit.png'});
 await page.evaluate(()=>window.__nightshiftScene.opened[0]=true);await page.waitForFunction(()=>window.__nightshift().environment.LampWest===.06);await page.waitForTimeout(120);const dim=await mask();assert.ok(dim>lit+20,JSON.stringify({lit,dim}));await page.screenshot({path:'output/garden/courtyard-dim.png'});
 await page.waitForFunction(()=>window.__nightshift().events.includes('garden_dark_wave'));await page.waitForTimeout(120);const restored=await mask();assert.ok(restored<dim-20);assert.deepEqual(errors,[]);
 await page.waitForFunction(()=>window.__nightshift().bloodMoon.amount===1);
 const blood=await page.evaluate(()=>{const s=window.__nightshiftScene,l=s.level.lamps.find(l=>l.id==='LampWest');return {state:window.__nightshift().bloodMoon,pixel:Array.from(s.canvas.context.getImageData(Math.round(l.x/2),Math.round(l.y/2),1,1).data)};});
 assert.ok(blood.pixel[0]>blood.pixel[1]*1.5,JSON.stringify(blood));
 await page.screenshot({path:'output/garden/courtyard-blood-moon.png'});
 const tree=await page.evaluate(()=>{const s=window.__nightshiftScene;return {alpha:s.textures.getPixelAlpha(0,0,'garden-pine'),count:s.children.list.filter(o=>o.texture?.key==='garden-pine').length};});assert.equal(tree.alpha,0);assert.equal(tree.count,6);
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.paused=true;s.cameras.main.stopFollow();s.cameras.main.setZoom(.5);s.cameras.main.centerOn(640,404);s.lightImage.setVisible(false);});await page.waitForTimeout(100);await page.locator('#game canvas').screenshot({path:'docs/maps/garden-expanded.png'});
 await page.evaluate(()=>{const s=window.__nightshiftScene;s.startRun(7);});await page.waitForFunction(()=>window.__nightshiftScene?.active&&window.__nightshift().bloodMoon.amount===0&&window.__nightshift().bloodMoon.target===0);
 writeFileSync('output/garden/visual-report.json',JSON.stringify({fixture:'Injected player and first-box state only for light rendering, separate keyboard walkthrough',lit,dim,restored,blood,tree,errors},null,2)+'\n');
}finally{await browser.close();}
