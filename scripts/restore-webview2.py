"""Restore the pinned Microsoft Fixed Runtime from an official CAB, offline."""
import hashlib, json, pathlib, subprocess, sys, tempfile, shutil
root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'scripts/webview2-runtime.json').read_text())
cab = pathlib.Path(sys.argv[1]).resolve()
assert hashlib.sha256(cab.read_bytes()).hexdigest() == manifest['sha256'], 'CAB checksum mismatch'
with tempfile.TemporaryDirectory() as tmp:
    if sys.platform == 'win32':
        subprocess.run(['expand.exe', str(cab), '-F:*', tmp], check=True)
    else:
        subprocess.run(['bsdtar', '-xf', str(cab), '-C', tmp], check=True)
    extracted = next(pathlib.Path(tmp).rglob('msedgewebview2.exe')).parent
    for name, expected in manifest['files'].items():
        assert hashlib.sha256((extracted / name).read_bytes()).hexdigest() == expected, name
    dest = root / 'src-tauri/WebView2'
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(extracted, dest)
print('Restored verified WebView2', manifest['version'])
