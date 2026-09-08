"""Generate the reviewed repair audio batch; never print or persist credentials."""
import os,json,pathlib,urllib.request,urllib.error,subprocess,sys,datetime
root=pathlib.Path(__file__).resolve().parents[1]
folder=root/'output/audio-repair-v1'
items=json.loads((folder/'manifest.json').read_text())
key=os.environ.get('ELEVENLABS_API_KEY')
if not key and (root/'.env').exists():
 for line in (root/'.env').read_text().splitlines():
  if line.startswith('ELEVENLABS_API_KEY='):key=line.split('=',1)[1].strip().strip('\"\'')
if not key:raise SystemExit('ELEVENLABS_API_KEY is unavailable')
(folder/'sources').mkdir(exist_ok=True)
try:
 for item in items:
  target=folder/item['file'];raw=folder/'sources'/item['file'];opus=folder/item['opusFile']
  model='music_v1' if item['kind']=='music' else 'eleven_text_to_sound_v2'
  if not raw.exists():
   body=({'prompt':item['prompt'],'music_length_ms':item['duration']*1000,'force_instrumental':True,'model_id':model} if item['kind']=='music' else {'text':item['prompt'],'duration_seconds':item['duration'],'prompt_influence':.4,'model_id':model})
   endpoint='music' if item['kind']=='music' else 'sound-generation'
   req=urllib.request.Request('https://api.elevenlabs.io/v1/'+endpoint+'?output_format=mp3_44100_128',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','xi-api-key':key},method='POST')
   print('Generating '+item['id'],flush=True)
   with urllib.request.urlopen(req,timeout=300) as response:
    if not any(v in response.headers.get('Content-Type','') for v in ['audio','octet-stream']):raise RuntimeError('Unexpected content type')
    content=response.read()
   raw.write_bytes(content)
   raw.with_suffix('.json').write_text(json.dumps({'provider':'ElevenLabs','model':model,'prompt':item['prompt'],'requestedSeconds':item['duration'],'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
  if not target.exists():
   duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)]))
   filters=[]
   if item['id']=='power-30':filters.append('atempo='+str(duration/item['duration']))
   filters+=['highpass=f=35','loudnorm=I='+('-21.5' if item['kind']=='music' else '-19')+':TP=-3:LRA=9','afade=t=in:d=0.01','afade=t=out:st='+str(item['duration']-.04)+':d=0.04']
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',','.join(filters),'-t',str(item['duration']),'-ar','44100','-ac','2' if item['kind']=='music' else '1','-c:a','libmp3lame','-b:a','128k',str(target)],check=True)
  if not opus.exists():subprocess.run(['ffmpeg','-v','error','-y','-i',str(target),'-c:a','libopus','-b:a','64k' if item['kind']=='music' else '40k','-vbr','on',str(opus)],check=True)
  print('Ready '+item['id']+' '+str(opus.stat().st_size)+' bytes Opus',flush=True)
except urllib.error.HTTPError as e:
 print('Generation stopped: HTTP '+str(e.code)+' '+e.read().decode()[:500].replace(key,'[redacted]'),flush=True);sys.exit(1)
except Exception as e:
 print('Generation stopped: '+type(e).__name__,flush=True);sys.exit(1)
finally:key=None
