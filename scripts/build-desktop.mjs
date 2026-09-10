/** Build a self-contained frontend, independent of the website/CDN release. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareDelivery} from './prepare-delivery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Explicit empty values also override Vite's .env files.
const env = {...process.env, GAME_BASE_PATH: './', VITE_ASSET_BASE_URL: '', VITE_EVENTS_URL: ''};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const args of [
  ['run', 'content:check'],
  ['run', 'assets:pack'],
  ['exec', '--', 'tsc'],
  ['exec', '--', 'vite', 'build', '--mode', 'desktop', '--outDir', 'dist-desktop'],
]) {
  const result = spawnSync(npm, args, {cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
prepareDelivery({distDir: 'dist-desktop'});
