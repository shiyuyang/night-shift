"""Create delivery derivatives from sources; never transcode a lossy derivative."""
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
public = root / 'public'
config = json.loads((root / 'game/assets/delivery.json').read_text())
report_path = root / 'game/assets/compression-report.json'
old = {row['file']: row for row in json.loads(report_path.read_text())} if report_path.exists() else {}
report = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def derivative(source, target, encoding, options, resize=None):
    src, dst = public / source.lstrip('/'), public / target.lstrip('/')
    source_hash = digest(src)
    previous = old.get(target.lstrip('/'), {})
    # Preserve pre-existing lossless/Opus derivatives during the initial migration.
    legacy = not previous.get('source_sha256') and not encoding.startswith('webp-q')
    current = (previous.get('source_sha256') == source_hash
               and previous.get('encoding') == encoding
               and previous.get('resize') == resize
               and dst.exists() and previous.get('sha256') == digest(dst))
    if not dst.exists() or not (current or legacy):
        if encoding == 'webp-luminance-alpha':
            subprocess.run(['uv', 'run', '--with', 'pillow', 'python',
                            str(root / 'scripts/prepare-wordmark.py')], check=True)
        elif encoding.startswith('webp-q'):
            quality = int(encoding.removeprefix('webp-q'))
            assert 0 <= quality <= 100, f'Invalid WebP quality: {quality}'
            sizing = ['-resize', *map(str, resize)] if resize else []
            subprocess.run(['cwebp', '-quiet', '-q', str(quality), '-m', '6',
                            '-alpha_q', '100', *sizing, str(src), '-o', str(dst)], check=True)
        else:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src),
                            *options, str(dst)], check=True)
    report.append(dict(file=target.lstrip('/'), source=source.lstrip('/'),
                       source_bytes=src.stat().st_size, bytes=dst.stat().st_size,
                       source_sha256=source_hash, sha256=digest(dst), encoding=encoding,
                       **({'resize': resize} if resize else {})))


for item in config['images']:
    derivative(item['source'], item['file'], item['encoding'],
               ['-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6'],
               item.get('resize'))

for catalog, rate in [('music', '64k'), ('audio-sfx', '40k')]:
    for item in json.loads((root / f'game/{catalog}.json').read_text()):
        derivative(item['file'], item['opusFile'], f'opus-{rate}',
                   ['-c:a', 'libopus', '-b:a', rate, '-vbr', 'on', '-application', 'audio'])

report_path.write_text(json.dumps(report, indent=2) + '\n')
for ext in ['webp', 'opus']:
    rows = [r for r in report if r['file'].endswith('.' + ext)]
    before, after = sum(r['source_bytes'] for r in rows), sum(r['bytes'] for r in rows)
    print(ext, len(rows), before, after, round((1-after/before)*100, 1), '% saved', flush=True)
