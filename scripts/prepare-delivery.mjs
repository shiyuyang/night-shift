/** Curate Vite's public copy before dist is eligible for deployment. */
import {readFileSync, readdirSync, statSync, rmSync, writeFileSync} from 'node:fs';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
export function deliveryFiles() {
  const config = read('game/assets/delivery.json');
  const sounds = read('game/music.json');
  const packs = read('game/audio-packs.json');
  const files = [...config.images.map(i => i.file), ...config.staticFiles,
    ...sounds.map(s => s.opusFile.replace(/\.opus$/,'.ogg')),packs.opus.file];
  for (const file of files) {
    if (!file || !/^\/(assets|audio|fonts)\/[\w./-]+$/.test(file) || file.includes('..'))
      throw Error('Invalid delivery file: ' + file);
    if (!/\.(webp|ogg|bin|woff2|txt)$/.test(file))
      throw Error('Source or unsupported file cannot be published: ' + file);
  }
  return [...new Set(files.map(f => f.slice(1)))].sort();
}
function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e =>
    e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]);
}
export function prepareDelivery({distDir = 'dist'} = {}) {
  const publicDir = resolve(root, 'public'), dist = resolve(root, distDir);
  const allowed = new Set(deliveryFiles());
  for (const row of read('game/assets/compression-report.json')) {
    for (const [name, expected] of [[row.source, row.source_sha256], [row.file, row.sha256]]) {
      const actual = createHash('sha256').update(readFileSync(resolve(publicDir, name))).digest('hex');
      if (actual !== expected) throw Error('Stale derivative; run npm run assets:compress: ' + name);
    }
  }
  for (const name of allowed) {
    const source = readFileSync(resolve(publicDir, name));
    if (!source.equals(readFileSync(resolve(dist, name)))) throw Error('Delivery copy differs: ' + name);
  }
  for (const sprite of Object.values(read('game/assets/manifest.json').sprites)) {
    if (!allowed.has(sprite.deliveryFile.slice(1))) throw Error('Missing sprite: ' + sprite.deliveryFile);
  }
  let removedBytes = 0, removedFiles = 0;
  for (const file of walk(publicDir)) {
    const name = relative(publicDir, file);
    if (allowed.has(name)) continue;
    const target = resolve(dist, name);
    removedBytes += statSync(target).size; removedFiles++;
    rmSync(target);
  }
  // Validate compiled CSS paths against the curated output, including the base.
  for (const file of walk(dist).filter(p => p.endsWith('.css'))) {
    for (const [, url] of readFileSync(file, 'utf8').matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
      // Fragment URLs reference inline SVG filters, not delivery files.
      if (/^(#|data:|https?:|\/\/)/.test(url)) continue;
      const path = url.split(/[?#]/)[0];
      const target = path.startsWith('/') ? resolve(dist, path.replace(/^.*?\/(assets|fonts)\//, '$1/')) : resolve(dirname(file), path);
      if (!statSync(target).isFile()) throw Error('Missing CSS asset: ' + url);
    }
  }
  const files = walk(dist).filter(p => !p.endsWith('/delivery-report.json')).map(p => ({
    file: relative(dist, p), bytes: statSync(p).size,
    sha256: createHash('sha256').update(readFileSync(p)).digest('hex')
  })).sort((a,b) => a.file.localeCompare(b.file));
  const report = {removedFiles, removedBytes, bytes: files.reduce((sum,f) => sum+f.bytes,0), files};
  writeFileSync(resolve(dist, 'delivery-report.json'), JSON.stringify(report, null, 2)+'\n');
  console.log(`Delivery: ${files.length} files, ${(report.bytes/1048576).toFixed(2)} MiB; excluded ${removedFiles} source/unused files (${(removedBytes/1048576).toFixed(2)} MiB).`);
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) prepareDelivery();
