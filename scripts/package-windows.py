"""Package the compiled Windows exe and complete pinned runtime, verify ZIP contents."""
import argparse, hashlib, json, pathlib, struct, zipfile
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', help='ZIP path, or output directory with --runtime both')
parser.add_argument('--runtime', choices=['full', 'lite', 'both'], default='full')
parser.add_argument('--full-compression', choices=['stored', 'deflate'], default='stored',
                    help='Full ZIP: stored skips decompression; deflate produces a smaller download')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
release = root / 'src-tauri/target/x86_64-pc-windows-msvc/release'
manifest = json.loads((root / 'scripts/webview2-runtime.json').read_text())
files = {'night-shift.exe': release / 'night-shift.exe'}
exe = files['night-shift.exe'].read_bytes()
assert exe[:2] == b'MZ', 'Invalid executable'
pe = struct.unpack_from('<I', exe, 0x3c)[0]
assert exe[pe:pe + 4] == b'PE\0\0' and struct.unpack_from('<H', exe, pe + 4)[0] == 0x8664, 'Expected Windows x64 PE'

if args.runtime != 'lite':
    for name, expected in manifest['files'].items():
        path = release / 'WebView2' / name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
        files['WebView2/' + name] = path
    actual = {p.relative_to(release / 'WebView2').as_posix() for p in (release / 'WebView2').rglob('*') if p.is_file()}
    assert actual == set(manifest['files']), 'Runtime file set differs from pinned runtime'
def package(out, included, runtime, compression):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', compression, compresslevel=9 if compression == zipfile.ZIP_DEFLATED else None) as z:
        for name, path in included.items():
            z.write(path, name)
    with zipfile.ZipFile(out) as z:
        assert z.testzip() is None
        for name, path in included.items():
            assert hashlib.sha256(z.read(name)).digest() == hashlib.sha256(path.read_bytes()).digest(), name
    return {'path': str(out), 'bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'files': len(included), 'runtime': runtime,
            'compression': 'stored' if compression == zipfile.ZIP_STORED else 'deflate'}

out = pathlib.Path(args.output).resolve()
lite = {'night-shift.exe': files['night-shift.exe']}
full_compression = zipfile.ZIP_STORED if args.full_compression == 'stored' else zipfile.ZIP_DEFLATED
if args.runtime == 'both':
    version = json.loads((root / 'package.json').read_text())['version']
    results = [package(out / f'night-shift-{version}-windows-x64-lite.zip', lite, 'system-or-download', zipfile.ZIP_DEFLATED),
               package(out / f'night-shift-{version}-windows-x64-full.zip', files, manifest['version'], full_compression)]
else:
    results = [package(out, lite if args.runtime == 'lite' else files, 'system-or-download' if args.runtime == 'lite' else manifest['version'],
                       zipfile.ZIP_DEFLATED if args.runtime == 'lite' else full_compression)]
print(json.dumps(results, indent=2))
