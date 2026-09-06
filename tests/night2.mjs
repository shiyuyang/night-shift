import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {goTo,snapshot} from './navigation.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function move(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
async function interact(){await page.keyboard.press('e',{delay:80});await page.waitForTimeout(180);}
async function protect(){await page.locator('[data-command="sanctuary"]').click();}
try {
 await page.goto(process.env.BASE_URL||'http://localhost:5174');await page.locator('#start:enabled').waitFor();await page.locator('#console-toggle').click();
 await page.locator('[data-night="2"]').click();await page.locator('#start').click();
 await goTo(page,113,446);await interact();assert.match(await page.locator('#inventory').textContent(),/撬棍 ✓/);
 await goTo(page,239,233);await interact();assert.match(await page.locator('#inventory').textContent(),/病历 ✓/);await interact();assert.equal(await page.locator('#fuses').textContent(),'1 / 3');
 await page.locator('#journal').click();const clue=await page.locator('#journal-clue').textContent();const digits=[...clue.matchAll(/床 — (\d)/g)].map(m=>m[1]);assert.equal(digits.length,3);const code=digits[2]+digits[0]+digits[1];await page.locator('#journal-close').click();await page.locator('#pause').click();
 await page.locator('[data-command="ghost"]').click();await goTo(page,609,415);await interact();assert.equal(await page.locator('#puzzle-dialog').isVisible(),true);
 await page.locator('#lock-code').fill('000');await page.locator('#puzzle-form button').click();assert.match(await page.locator('#puzzle-feedback').textContent(),/密码错误/);
 const frozen=await snapshot(page);assert.equal(frozen.puzzleOpen,true);assert.ok(frozen.ghost.time>0);await page.waitForTimeout(1800);const reading=await snapshot(page);assert.equal(reading.health,frozen.health);assert.equal(reading.elapsed,frozen.elapsed);assert.equal(reading.battery,frozen.battery);assert.deepEqual(reading.ghost,frozen.ghost);
 await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#puzzle-dialog').isVisible(),false);assert.ok((await snapshot(page)).protection>2.5);await interact();assert.equal(await page.locator('#puzzle-dialog').isVisible(),true);
 await page.screenshot({path:'/tmp/night-shift-puzzle-v2.png',fullPage:true});
 await page.locator('#lock-code').fill(code);await page.locator('#puzzle-form button').click();assert.equal(await page.locator('#puzzle-dialog').isVisible(),false);await page.waitForTimeout(80);assert.ok((await snapshot(page)).protection>2.5);await interact();assert.equal(await page.locator('#fuses').textContent(),'2 / 3');
 await protect();await goTo(page,760,308);await interact();assert.match(await page.locator('#objective').textContent(),/集齐保险丝/);
 await page.keyboard.press('r',{delay:100});await page.waitForFunction(()=>document.querySelector('#inventory').textContent.includes('诱饵 ×1'),{},{timeout:2000});assert.match(await page.locator('#inventory').textContent(),/诱饵 ×1/);
 await goTo(page,848,235);await interact();assert.equal(await page.locator('#fuses').textContent(),'3 / 3');
 await protect();await goTo(page,890,323);await interact();assert.equal(await page.locator('#run-result').isVisible(),false);assert.match(await page.locator('#game-message').textContent(),/断电/);
 await protect();await goTo(page,496,159);await interact();assert.match(await page.locator('#objective').textContent(),/电力恢复/);
 await protect();await goTo(page,890,323);await interact();assert.equal(await page.locator('#result-title').textContent(),'你活过了这一夜。');
 assert.equal(await page.locator('#run-result').isVisible(),true);assert.match(await page.locator('#run-result').textContent(),/第 2 夜/);assert.match(await page.locator('#run-result').textContent(),/✓ 解锁药柜/);assert.equal(await page.locator('#start-layer').evaluate(el=>el.classList.contains('hidden')),true);await page.waitForTimeout(1300);await page.screenshot({path:'/tmp/night-shift-settlement.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Night 2 passed: crowbar, clinical clue, random-order puzzle, wrong-code alarm, cabinet, barricade, decoy, all fuses, generator and escape.');
} catch(error) {await page.screenshot({path:'/tmp/night-shift-night2-failure.png',fullPage:true});throw error;} finally {await browser.close();}
