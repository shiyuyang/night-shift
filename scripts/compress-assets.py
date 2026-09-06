"""Reproducible delivery derivatives; preserve source PNG and MP3 files."""
import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'public/assets'
names=['watchman-sheet-v4','patient-sheet-v4','bed-overhead-v4','weeping-patient-v1','hospital-listener-v1','hospital-light-shy-v1','hospital-patroller-v1','hospital-corridor-v2','hospital-floor-v2','hospital-wall-v2','watch-desk-v1','archive-ward-v1','archive-warehouse-v1','archive-plant-v1']
report=[]
for name in names:
 src=assets/(name+'.png');dst=src.with_suffix('.webp')
 if not src.exists():raise RuntimeError('Missing '+str(src))
 if not dst.exists() or src.stat().st_mtime>dst.stat().st_mtime:
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-c:v','libwebp','-lossless','1','-compression_level','6',str(dst)],check=True)
 report.append(dict(file=str(dst.relative_to(root/'public')),source_bytes=src.stat().st_size,bytes=dst.stat().st_size))
for catalog in ['music','audio-sfx']:
 path=root/('game/'+catalog+'.json');items=json.loads(path.read_text())
 for item in items:
  src=root/'public'/item['file'].lstrip('/');dst=src.with_suffix('.opus');rate='64k' if catalog=='music' else '40k'
  if not dst.exists() or src.stat().st_mtime>dst.stat().st_mtime:
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-c:a','libopus','-b:a',rate,'-vbr','on','-application','audio',str(dst)],check=True)
  item['opusFile']='/'+str(dst.relative_to(root/'public'));report.append(dict(file=str(dst.relative_to(root/'public')),source_bytes=src.stat().st_size,bytes=dst.stat().st_size))
 path.write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
(root/'game/assets/compression-report.json').write_text(json.dumps(report,indent=2)+'\n')
for ext in ['webp','opus']:
 rows=[r for r in report if r['file'].endswith('.'+ext)];before=sum(r['source_bytes'] for r in rows);after=sum(r['bytes'] for r in rows);print(ext,len(rows),before,after,round((1-after/before)*100,1),'% saved',flush=True)
