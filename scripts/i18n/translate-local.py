"""Produce translation drafts locally; never marks them as native-reviewed.
uv run --with mlx-lm python scripts/i18n/translate-local.py
The model cache lives outside the repository; no model ships with the game.
"""
import json,re,hashlib,time,os
from pathlib import Path
from mlx_lm import load
from mlx_lm.generate import batch_generate
from mlx_lm.sample_utils import make_sampler,make_logits_processors
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'game/locales';MODEL='mlx-community/Qwen3.5-9B-4bit'
LANGS={'ja':'Japanese','ar':'Arabic','de':'German','fr':'French','es':'Spanish','id':'Indonesian','vi':'Vietnamese','th':'Thai','pt':'Portuguese','tr':'Turkish','ru':'Russian','it':'Italian','ro':'Romanian','ms':'Malay','ko':'Korean','uk':'Ukrainian','az':'Azerbaijani','pl':'Polish','nl':'Dutch','el':'Greek','bg':'Bulgarian','my':'Burmese','hu':'Hungarian','he':'Hebrew','hr':'Croatian','sv':'Swedish'}
source=json.loads((BASE/'en.json').read_text());chinese=json.loads((BASE/'zh-CN.json').read_text());statusPath=ROOT/'game/translation-status.json';status=json.loads(statusPath.read_text()) if statusPath.exists() else {'locales':{}}
sourceHash=hashlib.sha256(json.dumps(source,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
model,tok=load(MODEL);print('Model ready',flush=True)
outputs={};jobs=[]
for lang,name in LANGS.items():
 p=BASE/(lang+'.json');entry=status['locales'].get(lang,{});out=json.loads(p.read_text()) if p.exists() and entry.get('model')==MODEL and entry.get('sourceHash',sourceHash)==sourceHash else {};outputs[lang]=out
 pending=[k for k in source if k not in out]
 for start in range(0,len(pending),12):jobs.append((lang,pending[start:start+12],0))
# Sort by source length to reduce padding and stragglers in batched generation.
jobs.sort(key=lambda j:sum(len(source[k]) for k in j[1]))
while jobs:
 batch=jobs[:32];jobs=jobs[32:];prompts=[]
 for lang,keys,attempt in batch:
  system=f'''Translate each numbered object value into natural {LANGS[lang]} for a Japanese hospital horror game. Return ONLY a JSON object with EXACTLY the same numeric keys and translated string values. Translate ALL sentences into {LANGS[lang]}; no English prose, no Chinese unless Japanese or DNT. Preserve each {{placeholder}}, number, keyboard key WASD Shift Esc E F R Q T, and EXIT exactly. The title 夜勤病棟 is DNT. Aoba City / Matsubara General Hospital is fictional. A ward means a hospital ward. Patrol means inspecting hospital rooms, not the military. Handover means the change of hospital shift. Flashes repel monsters; decoys make sound; bandages heal. Keep labels concise and instructions accurate, including negations and durations. No explanations, no markdown. /no_think'''
  prompts.append(tok.apply_chat_template([{'role':'system','content':system},{'role':'user','content':json.dumps({str(i):source[k] for i,k in enumerate(keys)},ensure_ascii=False)}],tokenize=True,add_generation_prompt=True,enable_thinking=False))
 response=batch_generate(model,tok,prompts,max_tokens=[min(3200,max(500,sum(len(source[k]) for k in keys)*2+200)) for lang,keys,attempt in batch],verbose=True,sampler=make_sampler(temp=0),logits_processors=make_logits_processors(repetition_penalty=1.08))
 for (lang,keys,attempt),answer in zip(batch,response.texts):
  failed=[]
  try:
   data=json.loads(answer[answer.index('{'):answer.rindex('}')+1]);assert isinstance(data,dict)
   for i,k in enumerate(keys):
    v=data.get(str(i))
    if not isinstance(v,str) or not v.strip() or sorted(re.findall(r'\{\w+\}',v))!=sorted(re.findall(r'\{\w+\}',source[k])):failed.append(k);continue
    outputs[lang][k]='夜勤病棟' if k=='menu.title' else v
  except Exception as ex:
   failed=keys;print('Invalid batch',lang,str(ex),flush=True);Path('/tmp/ns-translation-failed.txt').write_text(answer)
  if failed:
   if attempt>=3:raise RuntimeError(f'Failed {lang}: {failed}')
   for k in failed:jobs.append((lang,[k],attempt+1))
  (BASE/(lang+'.json')).write_text(json.dumps(outputs[lang],ensure_ascii=False,indent=2)+'\n');status['locales'][lang]={'model':MODEL,'status':'draft','nativeReviewed':False,'translatedKeys':len(outputs[lang]),'sourceHash':sourceHash};statusPath.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n');print(lang,len(outputs[lang]),'/',len(source),'jobs',len(jobs),flush=True)
print('All drafts written',flush=True)
