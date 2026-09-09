import {chromium} from '@playwright/test';import {existsSync,readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {locales} from '../src/i18n/locales.ts';
const b=await chromium.launch({executablePath:['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome-stable'].find(existsSync),headless:true});
try{const p=await b.newPage({viewport:{width:1280,height:720}});await p.addInitScript(()=>localStorage.setItem('night-shift-monster-lessons-v1',JSON.stringify(['monster-listener','monster-light-shy','monster-patroller','monster-weeper'])));await p.goto('http://127.0.0.1:5174/?playtest=empty-task');
for(const locale of (process.env.EMPTY_LOCALES?.split(',')??locales)){await p.evaluate(l=>localStorage.setItem('night-shift-language-v1',l),locale);await p.reload();await p.locator('#start:enabled').click();await p.waitForFunction(()=>window.__nightshiftScene?.active);const result=await p.evaluate(async()=>{
 const s=window.__nightshiftScene;s.tutorial.skip();s.setPaused(true);s.door=true;s.state.fuses=1;s.opened[0]=true;s.locks.keys.ward=true;
 const f=s.rogue.features.find(f=>f.kind==='empty-task');if(!f)throw Error('Missing tutorial empty task box');
 s.player.setPosition(f.x+f.width/2,f.y+f.height/2+28);const before=JSON.stringify([s.state.fuses,s.opened,s.locks.keys,s.flashes,s.decoys,s.bandages,s.exitStartup,s.boxBlink.used]);const hint=s.interactionTarget().text;
 s.setPaused(false);s.interact();s.setPaused(true);const after=JSON.stringify([s.state.fuses,s.opened,s.locks.keys,s.flashes,s.decoys,s.bandages,s.exitStartup,s.boxBlink.used]);
 const opened=s.rogue.opened.has(f.id),memory=s.memory,ghost=s.ghostTime,empty=s.interactionTarget().text;
 s.cameras.main.centerOn(s.player.x,s.player.y);s.draw();await document.fonts.ready;const width=s.interactionLabel.width;s.memory=0;s.interact();
 return {before,after,hint,empty,opened,memory,ghost,repeatMemory:s.memory,width};
});const catalog=JSON.parse(readFileSync('game/locales/'+(locale==='zh-Hans'?'zh-CN':locale)+'.json'));
assert.equal(result.hint,catalog['gameplay.e-search-unlocked-box'],locale);assert.equal(result.empty,catalog['gameplay.task-box-empty'],locale);assert.equal(result.before,result.after,locale);assert.ok(result.opened&&result.memory>0&&result.ghost>0,locale);assert.equal(result.repeatMemory,0);assert.ok(result.width<300,locale);console.log(locale,'empty task open / noise / no progression / repeat / labels passed');}
await p.screenshot({path:'/tmp/night-shift-empty-task.png'});
}finally{await b.close();}
