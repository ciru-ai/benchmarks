"""HumanEval 0–9 as a non-thinking MTP speed workload, one first sample per case."""
import datetime,difflib,gzip,hashlib,json,os,re,signal,socket,subprocess,sys,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent; OUT=ROOT/'benchmarks'; OUT.mkdir(exist_ok=True)
I=Path('/srv/llm/work/qwen38-v2-release-20260905/inputs')
RC=Path('/srv/llm/work/sozo-adaptive-diagnosis-20260905/locked/qwen38-ciru-rocm10-20260905-rc2')
BASE='http://127.0.0.1:18184'; HOST=socket.gethostname(); server=None
STORE=Path('/srv/llm/bench-results/llama') if HOST=='sozo' else Path('/home/crown/bench-results/llama')
SAMPLER={'temperature':0,'top_k':1,'top_p':1,'min_p':0,'repeat_penalty':1,'presence_penalty':0,'frequency_penalty':0,'seed':123}
def save(p,x): p.write_text(json.dumps(x,indent=2)+'\n')
def sha(p):
 with Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def api(path,payload=None,timeout=120):
 req=urllib.request.Request(BASE+path,data=None if payload is None else json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=timeout) as f:s=f.read().decode()
 try:return json.loads(s)
 except json.JSONDecodeError:return s
def note(event,**kw): print(json.dumps({'event':event,'host':HOST,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),**kw}),flush=True)
def metrics(s):
 return {line.split()[0]:float(line.split()[1]) for line in s.splitlines() if line and not line.startswith('#')}
def stop():
 global server
 if server and server.poll() is None:
  server.terminate()
  try:server.wait(timeout=30)
  except subprocess.TimeoutExpired:server.kill();server.wait()
 server=None
def run(arm):
 global server
 d=OUT/arm;d.mkdir();(d/'slots').mkdir()
 env=os.environ.copy()
 for name in ['LLAMA_API_KEY','LLAMA_ARG_API_KEY']:env.pop(name,None)
 if arm=='ciru':
  b=RC/'bin';args=[str(RC/'run.sh')];model='/srv/llm/models/Qwen3.8-Flash-CIRU-STRIX-IU4/Qwen3.8-Flash-CIRU-STRIX-IU4.gguf'
  manifest=json.loads((RC/'LOCK.json').read_text()); artifacts=json.loads((RC/'models.json').read_text())
  checked={}
  for line in (RC/'SHA256SUMS').read_text().splitlines():
   h,name=line.split(maxsplit=1);name=name.lstrip('*')
   if name.startswith('bin/'):
    assert sha(RC/name)==h,name;checked[name]=h
  assert len(checked)>=10
 elif arm=='laurent':
  manifest=json.loads((I/'agention-build.json').read_text());b=Path(manifest['bin']);artifacts=manifest['model_receipt']
  model='/srv/llm/models/agentionai-Qwen3.8-Flash-Next-ROCmFP4-FAST-ad4c5717254a/Qwen3.8-Flash-Next-ROCmFP4-FAST-v2-ple16.gguf'
  draft='/srv/llm/models/agentionai-Qwen3.8-Flash-Next-MTP-ROCmFP4-FAST-5a2cf56c3e0f/Qwen3.8-Flash-Next-MTP-ROCmFP4-FAST.gguf'
  args=[str(b/'llama-server'),'-m',model,'-md',draft,'--spec-type','draft-mtp','--spec-draft-adaptive','--spec-draft-n-min','2','--spec-draft-n-max','4','-ngl','99','--n-gpu-layers-draft','99','-ctk','q8_0','-ctv','q8_0','-fa','on']
  checked=manifest['binary_sha256'];assert all(sha(b/n)==h for n,h in checked.items())
 else:
  prior=json.loads((I/'factory-protocol.lock.json').read_text());manifest=prior['build'];artifacts=prior['artifacts'];b=Path(manifest['path']);model=prior['command'][prior['command'].index('-m')+1];draft=prior['command'][prior['command'].index('-md')+1]
  args=[str(b/'llama-server'),'-m',model,'-md',draft,'--spec-type','draft-mtp','--spec-draft-n-max','2','-ngl','999']
  checked=manifest['sha256'];assert all(sha(b/n)==h for n,h in checked.items())
 if arm!='ciru':env.update({'VK_ICD_FILENAMES':'/run/opengl-driver/share/vulkan/icd.d/radeon_icd.x86_64.json','LD_LIBRARY_PATH':str(b)+':/nix/store/zs7y2aadk71bawprdcn000az9y05s8nf-vulkan-loader-1.4.341.0/lib'})
 args+=['--jinja','--reasoning','off','--temp','0','--top-k','1','--top-p','1','--min-p','0','--host','127.0.0.1','--port','18184','--parallel','1','--metrics','--slots','--slot-save-path',str(d/'slots')]
 lock={'classification':'local-custom HumanEval0-9 non-thinking MTP speed workload','arm':arm,'host':HOST,'command':args,'runtime':manifest,'artifacts':artifacts,'verified_binary_hashes':checked,'dataset_sha256':sha(I/'HumanEval.jsonl.gz'),'driver_sha256':sha(__file__),'sampler':SAMPLER,'reasoning':False,'task_protocol':'Canonical HumanEval prompt in one user message, embedded chat template with enable_thinking=false; no added instructions. One first sample, no retries. Speed and acceptance only; no quality score.','output_policy':'Natural EOS; n_predict=-1; no custom stops. 1800-second transport timeout. Preserve unsuccessful/incomplete requests.','aggregate_policy':'TG=sum(generated tokens-1) / sum server decode seconds. Request wall=sum measured HTTP request wall seconds. Panel wall=elapsed loop time including recorder overhead, excluding model load.','settings_basis':'CIRU locked retained d6 ROCm10 recipe at16K; Laurent publisher adaptive2–4 Q8 targetKV; Unsloth recommended fork sharedQ8 d2. Greedy non-thinking for MTP acceptance speed, supported by retained CIRU probe and published Unsloth greedy MTP recipe.','governors':{str(p):p.read_text().strip() for p in governors}}
 save(d/'protocol.lock.json',lock);note('loading',arm=arm)
 with (d/'server.log').open('x') as f:server=subprocess.Popen(args,cwd=d,env=env,stdout=f,stderr=subprocess.STDOUT)
 save(d/'pid.json',{'pid':server.pid})
 until=time.monotonic()+600
 while time.monotonic()<until:
  if server.poll() is not None:raise RuntimeError(f'{arm} startup failed; see server.log')
  try:
   if api('/health',timeout=3).get('status')=='ok':break
  except Exception:pass
  time.sleep(1)
 else:raise RuntimeError('startup timeout')
 slots=api('/slots');props=api('/props');assert len(slots)==1 and slots[0].get('speculative'),slots
 maps=[s for s in Path(f'/proc/{server.pid}/maps').read_text().splitlines() if 'libllama' in s or 'libggml-' in s];assert maps and all(str(b) in s for s in maps)
 ident={'arm':arm,'host':HOST,'protocol_lock':str(d/'protocol.lock.json'),'command':args,'maps':maps,'pid':server.pid,'slots':slots,'props':props,'runtime':manifest}
 save(d/'identity.json',ident);save(ROOT/'current-server.json',ident)
 with gzip.open(I/'HumanEval.jsonl.gz','rt') as f:tasks={x['task_id']:x for x in map(json.loads,f)}
 rendered=[]
 for n in range(10):
  task=tasks[f'HumanEval/{n}'];chat={'messages':[{'role':'user','content':task['prompt']}],'add_generation_prompt':True,'chat_template_kwargs':{'enable_thinking':False},'reasoning_effort':'none'}
  render=api('/apply-template',chat);prompt=render['prompt']
  assert re.search(r'<think>\s*</think>\s*$',prompt),repr(prompt[-300:])
  rendered.append({'task':task,'chat':chat,'prompt':prompt})
 save(d/'rendered-requests.json',rendered)
 (d/'rendered-diff.txt').write_text(''.join(''.join(difflib.unified_diff(x['task']['prompt'].splitlines(True),x['prompt'].splitlines(True),fromfile=x['task']['task_id'],tofile='nonthinking-chat')) for x in rendered))
 lock['rendered_sha256']=sha(d/'rendered-requests.json');lock['template_sha256']=hashlib.sha256(str(props.get('chat_template','')).encode()).hexdigest();save(d/'protocol.lock.json',lock)
 rows=[];panel_t=time.monotonic();note('panel-start',arm=arm,ctx=slots[0]['n_ctx'],reasoning=False)
 for x in rendered:
  task=x['task']['task_id'];rd=d/task.replace('/','-');rd.mkdir()
  payload=SAMPLER|{'prompt':x['prompt'],'n_predict':-1,'stream':True,'cache_prompt':False}
  save(rd/'payload.json',payload);(rd/'prompt.txt').write_text(x['prompt']);save(rd/'erase.json',api('/slots/0?action=erase',{}))
  before=api('/metrics');save(rd/'before.json',{'metrics':before,'slots':api('/slots')})
  cmd=[sys.executable,str(ROOT/'recorder.py'),'api','--label',f'research-nonthinking-{arm}-{task.replace("/","-")}','--base-url',BASE,'--model',model,'--prompt-file',str(rd/'prompt.txt'),'--gen','-1','--timeout','1800','--payload-file',str(rd/'payload.json'),'--out-dir',str(STORE)]
  note('request-start',arm=arm,task=task)
  with (rd/'row.json').open('x') as f:subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,check=True,timeout=1900)
  row=json.loads((rd/'row.json').read_text());after=api('/metrics');save(rd/'after.json',{'metrics':after,'slots':api('/slots')})
  events=[]
  for line in Path(row['raw_output']).read_text().splitlines():
   if line.startswith('data: '):
    try:events.append(json.loads(line[6:]))
    except json.JSONDecodeError:pass
  text=''.join(x.get('content','') for x in events);(rd/'completion.txt').write_text(text)
  assert events and events[-1].get('stop') and text and row.get('avg_tps') and not row.get('error'),row
  assert '<think>' not in text and '</think>' not in text,'unexpected reasoning block'
  bm,am=metrics(before),metrics(after);drafted=am.get('llamacpp:spec_decode_num_draft_tokens_total',0)-bm.get('llamacpp:spec_decode_num_draft_tokens_total',0);accepted=am.get('llamacpp:spec_decode_num_accepted_tokens_total',0)-bm.get('llamacpp:spec_decode_num_accepted_tokens_total',0);assert drafted>0
  s={'arm':arm,'host':HOST,'task':task,'tg':row['avg_tps'],'prompt_tokens':row['tokens_evaluated'],'generated_tokens':row['tokens_predicted'],'total_tokens':row['tokens_evaluated']+row['tokens_predicted'],'wall_seconds':row['total_ms']/1000,'decode_seconds':row['timings']['predicted_ms']/1000,'ttfp_ms':row['ttfp_ms'],'drafted':drafted,'accepted':accepted,'acceptance':accepted/drafted,'finish':{k:v for k,v in events[-1].items() if k.startswith('stop') or k in ['truncated','tokens_predicted','tokens_evaluated']},'raw_output':row['raw_output'],'row':str(rd/'row.json')}
  save(rd/'summary.json',s);rows.append(s)
  aggregate={'arm':arm,'host':HOST,'completed':len(rows),'total':10,'reasoning':False,'generated_tokens':sum(r['generated_tokens'] for r in rows),'prompt_tokens':sum(r['prompt_tokens'] for r in rows),'total_tokens':sum(r['total_tokens'] for r in rows),'request_wall_seconds':sum(r['wall_seconds'] for r in rows),'panel_wall_seconds':time.monotonic()-panel_t,'decode_seconds':sum(r['decode_seconds'] for r in rows),'drafted':sum(r['drafted'] for r in rows),'accepted':sum(r['accepted'] for r in rows),'rows':rows}
  aggregate['weighted_tg']=(aggregate['generated_tokens']-len(rows))/aggregate['decode_seconds'];aggregate['acceptance']=aggregate['accepted']/aggregate['drafted'];save(d/'summary.json',aggregate);note('request-complete',**s)
 stop();save(d/'COMPLETE.json',{'completed':10,'status':'complete','utc':datetime.datetime.now(datetime.timezone.utc).isoformat()});note('panel-complete',arm=arm,tg=aggregate['weighted_tg'],tokens=aggregate['generated_tokens'],wall=aggregate['request_wall_seconds'])
def interrupt(signum,frame):raise KeyboardInterrupt(str(signum))
signal.signal(signal.SIGTERM,interrupt)
assert subprocess.run(['pgrep','-x','llama-server'],capture_output=True).returncode==1
service=subprocess.run(['systemctl','--user','is-active','qwen-main.service'],capture_output=True,text=True).stdout.strip();assert service=='inactive'
governors={p:p.read_text().strip() for p in Path('/sys/devices/system/cpu').glob('cpu[0-9]*/cpufreq/scaling_governor')}
save(ROOT/'preflight.json',{'host':HOST,'service':service,'governors':{str(p):v for p,v in governors.items()},'cpu':subprocess.run(['lscpu'],capture_output=True,text=True).stdout})
try:
 for p,g in governors.items():
  if g!='performance':subprocess.run(['sudo','tee',str(p)],input='performance\n',text=True,stdout=subprocess.DEVNULL,check=True)
 for arm in sys.argv[1:]:run(arm)
finally:
 stop()
 for p,g in governors.items():
  if p.read_text().strip()!=g:subprocess.run(['sudo','tee',str(p)],input=g+'\n',text=True,stdout=subprocess.DEVNULL,check=True)
 save(ROOT/'cleanup.json',{'service':subprocess.run(['systemctl','--user','is-active','qwen-main.service'],capture_output=True,text=True).stdout.strip(),'governors':{str(p):p.read_text().strip() for p in governors}})
