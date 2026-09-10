/** Check the packaged frontend without a CDN, in Chromium and WebKit. */
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {chromium, webkit} from '@playwright/test';
import {preview} from 'vite';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const config = read('src-tauri/tauri.conf.json');
const music = read('game/music.json');
const pack = read('game/audio-packs.json').opus;
const server = await preview({configFile: false, base: '/', build: {outDir: 'dist-desktop'},
  preview: {host: '127.0.0.1', port: 0, headers: {'Content-Security-Policy': config.app.security.csp}}});
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
mkdirSync('output/desktop', {recursive: true});
try {
  for (const engine of [chromium, webkit]) {
    const options = engine === chromium ? {executablePath: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome-stable'].find(existsSync)} : {};
    const browser = await engine.launch({...options, headless: true});
    try {
      const context = await browser.newContext({viewport: {width: 1280, height: 800}});
      const external = [], failures = [], errors = [];
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin !== origin) {
          external.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);});
      await page.goto(origin);
      await page.locator('#start:enabled').waitFor({timeout: 30000});
      await page.waitForFunction(() => document.querySelector('#survey').dataset.loaded === 'true');
      for (const locale of ['zh-Hans', 'en', 'ja']) {
        await Promise.all([page.waitForEvent('load'), page.locator('#menu-language').selectOption(locale)]);
        await page.locator('#start:enabled').waitFor();
        assert.equal(await page.locator('html').getAttribute('lang'), locale);
      }
      // Every shipped clip must decode; file extension or HTTP success is insufficient.
      const decoded = await page.evaluate(async ({music, pack}) => {
        const audio = new AudioContext();
        let count = 0;
        try {
          const packed = await (await fetch(pack.file)).arrayBuffer();
          for (const [id, entry] of Object.entries(pack.entries)) {
            const buffer = await audio.decodeAudioData(packed.slice(entry.offset, entry.offset + entry.length));
            if (!(buffer.duration > 0)) throw Error(`Empty sound: ${id}`);
            count++;
          }
          for (const track of music) {
            const bytes = await (await fetch(track.opusFile.replace(/\.opus$/, '.ogg'))).arrayBuffer();
            const buffer = await audio.decodeAudioData(bytes);
            if (!(buffer.duration > 0)) throw Error(`Empty music: ${track.id}`);
            count++;
          }
        } finally {await audio.close();}
        return count;
      }, {music, pack});
      await page.screenshot({path: `output/desktop/${engine.name()}-menu.png`});
      await page.locator('#start').click();
      await page.waitForFunction(() => document.body.dataset.ui === 'playing');
      if (await page.locator('#tutorial-card').isVisible()) await page.locator('#tutorial-skip').click();
      await page.keyboard.down('d');
      await page.waitForTimeout(500);
      await page.keyboard.up('d');
      await page.keyboard.press('Escape');
      await page.locator('#pause-menu').waitFor({state: 'visible'});
      if (engine === chromium) {
        await page.locator('#fullscreen').click();
        await page.waitForFunction(() => Boolean(document.fullscreenElement));
        await page.locator('#fullscreen').click();
        await page.waitForFunction(() => !document.fullscreenElement);
      }
      await page.locator('#resume').click();
      await page.screenshot({path: `output/desktop/${engine.name()}-playing.png`});
      assert.deepEqual(external, [], 'Desktop must not request remote resources');
      assert.deepEqual(failures, [], 'All local assets must load');
      assert.deepEqual(errors, [], 'No uncaught game errors');
      console.log(`${engine.name()}: local menu, 3 locales, gameplay, pause/resume, ${decoded} decoded clips; no remote requests.`);
    } finally {await browser.close();}
  }
} finally {await new Promise(resolve => server.httpServer.close(resolve));}
