"""Subset the OFL Ma Shan Zheng face for live ledger annotations and stamps."""
import hashlib,json,re,urllib.request
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parents[2]
cache=Path.home()/'.cache/night-shift-fonts/MaShanZheng-Regular.ttf'
cache.parent.mkdir(parents=True,exist_ok=True)
if not cache.exists():
 with urllib.request.urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf',timeout=60) as r:cache.write_bytes(r.read())
keys=['menu.sketch','menu.start','menu.pending','menu.complete','menu.signed']
text='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz →'
for p in (root/'game/locales').glob('*.json'):
 d=json.loads(p.read_text());text+=''.join(d[k] for k in keys)
font=TTFont(cache,recalcTimestamp=False);cmap=font.getBestCmap()
options=subset.Options();options.flavor='woff2';sub=subset.Subsetter(options=options);sub.populate(text=''.join(c for c in text if ord(c) in cmap));sub.subset(font);font.flavor='woff2'
p=root/'public/fonts/hospital-handwriting.woff2';font.save(p);name='hospital-handwriting-'+hashlib.sha256(p.read_bytes()).hexdigest()[:10]+'.woff2';target=p.with_name(name);p.rename(target)
css=root/'src/watch-desk.css';css.write_text(re.sub(r'hospital-handwriting-[0-9a-f]+\.woff2',name,css.read_text()))
p=root/'game/assets/delivery.json';d=json.loads(p.read_text());d['staticFiles']=[re.sub(r'hospital-handwriting-[0-9a-f]+\.woff2',name,f) for f in d['staticFiles']];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(name,target.stat().st_size)
