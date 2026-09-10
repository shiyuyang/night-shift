"""Package the compiled Windows exe and complete pinned runtime, verify ZIP contents."""
import hashlib, json, pathlib, struct, sys, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
release = root / 'src-tauri/target/x86_64-pc-windows-msvc/release'
manifest = json.loads((root / 'scripts/webview2-runtime.json').read_text())
files = {'night-shift.exe': release / 'night-shift.exe'}
exe = files['night-shift.exe'].read_bytes()
assert exe[:2] == b'MZ', 'Invalid executable'
pe = struct.unpack_from('<I', exe, 0x3c)[0]
assert exe[pe:pe + 4] == b'PE\0\0' and struct.unpack_from('<H', exe, pe + 4)[0] == 0x8664, 'Expected Windows x64 PE'

for name, expected in manifest['files'].items():
    path = release / 'WebView2' / name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
    files['WebView2/' + name] = path
actual = {p.relative_to(release / 'WebView2').as_posix() for p in (release / 'WebView2').rglob('*') if p.is_file()}
assert actual == set(manifest['files']), 'Runtime file set differs from pinned runtime'
out = pathlib.Path(sys.argv[1]).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, path in files.items():
        z.write(path, name)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    for name, path in files.items():
        assert hashlib.sha256(z.read(name)).digest() == hashlib.sha256(path.read_bytes()).digest(), name
print(json.dumps({'path': str(out), 'bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'files': len(files), 'runtime': manifest['version']}, indent=2))
