"""Generate authored scene music; credential stays in memory, never in assets or manifests."""
import os,getpass,json,pathlib,urllib.request,urllib.error,subprocess,sys,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]
catalog=json.loads((root/'game/music.json').read_text())
key=os.environ.get('ELEVENLABS_API_KEY')
if not key and (root/'.env').exists():
 for line in (root/'.env').read_text().splitlines():
  if line.startswith('ELEVENLABS_API_KEY='):key=line.split('=',1)[1].strip().strip('\"\'')
if not key:key=getpass.getpass('ElevenLabs credential (hidden): ')
def generate(item):
 target=root/'public'/item['file'].lstrip('/');raw=pathlib.Path('/tmp')/('nightshift-music-'+item['id']+'.mp3')
 if target.exists():return item['id']+': already generated'
 body=json.dumps(dict(prompt=item['prompt'],music_length_ms=item['duration']*1000,force_instrumental=True,model_id='music_v1')).encode()
 request=urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',data=body,headers={'Content-Type':'application/json','xi-api-key':key},method='POST')
 try:
  with urllib.request.urlopen(request,timeout=300) as response:raw.write_bytes(response.read())
 except urllib.error.HTTPError as e:
  raise RuntimeError('HTTP '+str(e.code)+' '+e.read().decode()[:400].replace(key,'[redacted]')) from None
 # Normalize music and fit the power climax to the simulation countdown.
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)]))
 tempo=duration/item['duration']
 filters=('atempo='+str(tempo)+',' if item['id']=='power' else '')+'highpass=f=35,loudnorm=I=-23:TP=-3:LRA=9,afade=t=in:d=0.03'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-t',str(item['duration']),'-af',filters,'-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','128k',str(target)],check=True)
 metadata={'provider':'ElevenLabs','model':'music_v1','prompt':item['prompt'],'requested_duration':item['duration'],'file':target.name}
 target.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n')
 return item['id']+': saved '+str(target.stat().st_size)+' bytes'
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for result in pool.map(generate,catalog):print(result,flush=True)
except Exception as e:
 print('Generation failed: '+str(e).replace(key,'[redacted]'),flush=True);sys.exit(1)
finally:key=None
