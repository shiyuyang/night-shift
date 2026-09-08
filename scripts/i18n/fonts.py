"""Build self-hosted WOFF2 subsets. Run via uv with fonttools and brotli.
Sources are official google/fonts OFL directories; fonts are downloaded to an OS cache.
"""
import json,urllib.request,urllib.parse,hashlib
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
ROOT=Path(__file__).resolve().parents[2]
CACHE=Path.home()/'.cache/night-shift-fonts';CACHE.mkdir(parents=True,exist_ok=True)
FAMILIES={'latin':'notosans','ar':'notosansarabic','he':'notosanshebrew','th':'notosansthai','my':'notosansmyanmar','ja':'notosansjp','ko':'notosanskr','zh-Hans':'notosanssc','zh-Hant':'notosanstc'}
REPORT={}
previous=json.loads((ROOT/'game/font-coverage.json').read_text()) if (ROOT/'game/font-coverage.json').exists() else {}
def fetch(url,path):
 if not path.exists():
  with urllib.request.urlopen(url,timeout=90) as r:path.write_bytes(r.read())
for group,family in FAMILIES.items():
 if group in previous:
  source={'download_url':previous[group]['source'],'name':urllib.parse.unquote(previous[group]['source'].rsplit('/',1)[1])}
  license={'download_url':previous[group]['license']}
 else:
  listing=json.loads(urllib.request.urlopen('https://api.github.com/repos/google/fonts/contents/ofl/'+family,timeout=60).read())
  source=next(x for x in listing if x['name'].endswith('.ttf') and 'Italic' not in x['name'])
  license=next(x for x in listing if x['name']=='OFL.txt')
 cache=CACHE/source['name'];fetch(source['download_url'],cache)
 fetch(license['download_url'],ROOT/'public/fonts'/f'{family}-OFL.txt')
 docs=[]
 for p in (ROOT/'game/locales').glob('*.json'):
  lang='zh-Hans' if p.stem=='zh-CN' else p.stem
  if (lang if lang in FAMILIES else 'latin')==group:docs+=list(json.loads(p.read_text()).values())
 # Native names in the language picker must work before switching languages.
 chars=set(''.join(docs)+''.join(__import__('re').findall(r":'([^']+)'",(ROOT/'src/i18n/locales.ts').read_text()))+'0123456789% /·→←+×[]():,.!?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
 font=TTFont(cache,recalcTimestamp=False);cmap=font.getBestCmap();actual={c for c in chars if ord(c) in cmap};missing={c for c in ''.join(docs) if not c.isspace() and ord(c) not in cmap}
 # A shared symbol fallback covers arrows and math operators.
 options=subset.Options();options.flavor='woff2';options.layout_features=['*'];sub=subset.Subsetter(options=options);sub.populate(text=''.join(actual));sub.subset(font);font.flavor='woff2'
 target=ROOT/'public/fonts'/f'locale-{group}.woff2';font.save(target)
 digest=hashlib.sha256(target.read_bytes()).hexdigest()[:10];versioned=target.with_name(target.stem+'-'+digest+'.woff2');target.rename(versioned);target=versioned
 REPORT[group]={'file':'/fonts/'+target.name,'source':source['download_url'],'license':license['download_url'],'bytes':target.stat().st_size,'missing':''.join(sorted(missing))}
 print(group,REPORT[group],flush=True)
(ROOT/'game/font-coverage.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+'\n')

# Rewrite only generated locale font references; image/release provenance stays untouched.
import re
css=ROOT/'src/localization.css';text=css.read_text()
for group,data in REPORT.items():text=re.sub(r'/fonts/locale-'+re.escape(group)+r'(?:-[0-9a-f]{10})?\.woff2',data['file'],text)
css.write_text(text)
delivery=ROOT/'game/assets/delivery.json';data=json.loads(delivery.read_text());data['staticFiles']=[p for p in data['staticFiles'] if not p.startswith('/fonts/locale-')]+[r['file'] for r in REPORT.values()];delivery.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
for file in (ROOT/'public/fonts').glob('locale-*.woff2'):
 if '/fonts/'+file.name not in data['staticFiles']:file.unlink()
