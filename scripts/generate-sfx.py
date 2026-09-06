"""Generate authored SFX; credential stays in memory, never in assets or manifests."""
import os,getpass,json,pathlib,urllib.request,urllib.error,subprocess,sys,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]
catalog=json.loads((root/'game/audio-sfx.json').read_text())
key=os.environ.get('ELEVENLABS_API_KEY')
if not key and (root/'.env').exists():
 for line in (root/'.env').read_text().splitlines():
  if line.startswith('ELEVENLABS_API_KEY='):key=line.split('=',1)[1].strip().strip('\"\'')
if not key:key=getpass.getpass('ElevenLabs credential (hidden): ')
def generate(item):
 target=root/'public'/item['file'].lstrip('/');raw=pathlib.Path('/tmp')/('nightshift-sfx-'+item['id']+'.mp3')
 if target.exists():return item['id']+': already generated'
 body=json.dumps(dict(text=item['prompt'],duration_seconds=item['duration'],prompt_influence=.4,model_id='eleven_text_to_sound_v2')).encode()
 request=urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',data=body,headers={'Content-Type':'application/json','xi-api-key':key},method='POST')
 try:
  with urllib.request.urlopen(request,timeout=180) as response:raw.write_bytes(response.read())
 except urllib.error.HTTPError as e:
  raise RuntimeError('HTTP '+str(e.code)+' '+e.read().decode()[:400].replace(key,'[redacted]')) from None
 # Remove leading silence, retain natural tails, constrain peaks and apply small fade edges.
 filters='silenceremove=start_periods=1:start_duration=0.008:start_threshold=-48dB,highpass=f=45,loudnorm=I=-23:TP=-3:LRA=7,afade=t=in:d=0.008'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',filters,'-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(target)],check=True)
 metadata={'provider':'ElevenLabs','model':'eleven_text_to_sound_v2','prompt':item['prompt'],'requested_duration':item['duration'],'file':target.name}
 target.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n')
 return item['id']+': saved '+str(target.stat().st_size)+' bytes'
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for result in pool.map(generate,catalog):print(result,flush=True)
except Exception as e:
 print('Generation failed: '+str(e).replace(key,'[redacted]'),flush=True);sys.exit(1)
finally:key=None
