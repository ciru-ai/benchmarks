"""Build the page from the best preserved whole pass per stack and race circuit. Performs no inference."""
import csv,hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent;W=R.parent.parent;OLD=W/'reports/ultimate-qwen-flash-strix/data';NEW=W/'carlos-flash-tom8192-20261012'
def read(p):return json.loads(p.read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(s):
 s=re.sub(r'(?:/home|/srv|/tmp)/[^\s,;\"\']+','[artifact]',str(s))
 s=re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b','[host]',s)
 s=re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}','[fixture address]',s)
 return s
old=read(OLD/'selected-results.json');n=old['nonhermes'];h=old['hermes'];new=read(NEW/'audited-results.json');p=new['panels']
source=[]
def record(path,label):
 key='s'+str(len(source)+1).zfill(3);source.append(dict(id=key,label=label,file=path.name,sha256=digest(path),bytes=path.stat().st_size));return key
legacySource=record(OLD/'selected-results.json','Original Strix Showdown selected records, September 28–October 1')
oldLockPath=W/'hcq8-20260930/speed-audit/corrected-cohort/hc-he09/protocol.lock.json';oldLock=read(oldLockPath);record(oldLockPath,'Original HC-Q8 thinking-off HE0–9 serving and sampling lock')
newSource=record(NEW/'audited-results.json','Tom-configured October 12 audited six-panel qualification')
POLICY='Highest circuit score; ties use shortest scored task wall, then lowest pass number. One whole saved pass; original task outcomes and timings stay together.'
def choose(candidates):return max(candidates,key=lambda z:(z['scoreExact'],-z['wall'],-z['passNumber']))
def selected(candidates,best):return dict(policy=POLICY,passNumber=best['passNumber'],availablePasses=len(candidates),candidates=candidates)
halogenComparison=read(W/'tools84-halogen-stock-20261007/comparison.json')
halogenCandidates=[dict(passNumber=z['pass_number'],scoreExact=z['hard']['score_percent'],points=z['hard']['points'],wall=z['hard']['case_seconds'],seed=z['seed']) for z in halogenComparison['models'][0]['passes']]
halogenBest=choose(halogenCandidates)
halogenPath=W/f"page-inputs/tom-turney-20261012/halogen-stock-pass{halogenBest['passNumber']}-report.json";halogen=read(halogenPath)
assert digest(halogenPath)==next(z['report_sha256'] for z in halogenComparison['models'][0]['passes'] if z['pass_number']==halogenBest['passNumber'])
halogenSource=record(halogenPath,f"Halogen 0.17.1 stock server, October 7–8, best hard-tools pass {halogenBest['passNumber']} of 5")
record(W/'tools84-halogen-stock-20261007/comparison.json','Halogen 0.17.1 five-pass audit and native timing')
newToolsPath=NEW/'ciru-artifacts/tools/results/hc721tomoct12/full/report.json';nt=read(newToolsPath);record(newToolsPath,'October 12 TC70–84 first-pass raw report')
newHPath=next((NEW/'ciru-artifacts/hermes/models/qwen38-flash-next-hcq8/hc721tomhermesoct12/pass1/cases').glob('*/summary.json'));nh=read(newHPath);record(newHPath,'October 12 matching HermesAgent-20 first-pass summary')
models=[]
configs=[('old','carlos','ROCmFPX · old build','HC-Q8 / original sweep','#89919c','assets/carlos-rocmfpx.png','SEP 28–OCT 01','Original recorded stack'),('tom','carlos','ROCmFPX · Tom build','HC-Q8 / Tom optimized','#f3c654','assets/tom-turney.png','OCT 12','Official ROCm 7.2.1'),('iu4','ciru5','Ciru IU4','Ciru v5 / 4.5175 bpw','#ef8d86','assets/ciru-logo-clean.png','SEP 28–OCT 01','Saved Ciru IU4 v5 sweep'),('gufo','gufo','Gufo','UD-Q4_K_XL / Gufo','#caaa7d','assets/gufo.jpg','SEP 28–OCT 01','Saved Gufo sweep'),('halogen','halogen','Halogen · newest','0.17.1 / stock server','#90bba4','assets/halogen-official.jpg','OCT 07–08','Stock 84-case run; hard subset')]
for id,original,name,subtitle,color,image,date,note in configs:
 identity=old['models'][original];m=dict(id=id,name=name,subtitle=subtitle,color=color,image=image,date=date,note=note,card=identity['cardUrl'],source=newSource if id=='tom' else halogenSource if id=='halogen' else legacySource,metrics={},tools=None,hermes=None)
 if id=='halogen':
  info=read(W/'tools84-halogen-stock-20261007/cards/halogen-info.json');m['card']='https://huggingface.co/peonist-ai/halogen-qwen3.8-flash-next';m['cardRevision']=info.get('sha',info.get('revision'));m['identity']=dict(runtime='Halogen 0.17.1 stock server',image='ghcr.io/peonist-ai/halogen-flash-server@sha256:1952e5c5a50a6c0c52b748b505cba401ce88f7ce92e6b3c8253b4f5bdbcd3161',weights='qwen38-flash-next-v2.hgn',slots=4,prefillChunk=32768)
 else:
  m['identity']=identity['identity'];m['cardRevision']=identity.get('card',{}).get('revision')
  he=next(r for r in n['panels']['he09']['rows'] if r['modelId']==original);fid=next(r for r in n['panels']['fidelity']['rows'] if r['modelId']==original);memory=next(r for r in n['panels']['memory']['rows'] if r['modelId']==original)
  m['metrics']=dict(decode=he.get('interTokenProxyTps') or he['nativeTps'],heWall=he['wallSeconds'],kl=fid['kl'],top1=fid['top1Pct'],package=memory['packageGiB'],cold=[dict(depth=r['inputTokens'],pp=r['tps']) for r in n['panels']['coldPrefill']['rows'] if r['modelId']==original],append=[dict(prompt=r['promptTokens'],depth=r['depthTokens'],pp=r['pp']) for r in n['panels']['appendPrefill']['rows'] if r['modelId']==original])
  hm=next(z for z in h['models'] if z['id']==original);hc=[dict(passNumber=z['pass'],scoreExact=sum(t['score'] for t in z['tasks'])/len(z['tasks']),officialScore=z['official_score'],wall=z['case_wall_seconds']) for z in hm['runs']];hb=choose(hc);run=next(z for z in hm['runs'] if z['pass']==hb['passNumber']);m['hermes']=dict(score=run['official_score'],selection=selected(hc,hb),wall=run['case_wall_seconds'],basis=f"Best whole historical Hermes pass {hb['passNumber']} of {len(hc)}",tasks=[dict(id=t['id'],title=next(q['label'] for q in h['tasks'] if q['id']==t['id']),status=t['status'],score=t['score'],wall=t['wall_seconds'],tools=t['tools'],toolNames=t['tool_names'],summary=clean(t.get('verifier_summary') or t['summary'])) for t in run['tasks']],archive=dict(meanScore=hm['score_mean'],passes=2))
  tr=next(z for z in n['panels']['toolsRecommended']['rows'] if z['modelId']==original);m['tools']=dict(score=tr['score'],points=tr['points'],basis='Only saved matching recommended TC70–84 pass; historical',tasks=[dict(id=t['taskId'],title=t['title'],status=t['status'],score=t['points']*50,wall=t['durationSeconds'],tools=t['toolCallCount'],toolNames=[q.split('(')[0] for q in t['toolCalls']],summary=clean(t['summary'])) for t in n['panels']['toolsRecommended']['cases'] if t['modelId']==original])
 if id=='old':
  m['identity'].update(batch=2048,microbatch=512,context=262144,threads=16,kv='f16/f16',serverSha256=oldLock['runtime_sha256'],cpuGovernor='performance',nonthinkingSampler=oldLock['sampling'])
 if id=='tom':
  f=p['short_fidelity']['metrics'];m['identity']=dict(runtime='ROCmFPX c4aa38b1987ee9cd390f56fb393ba93ac472769b',ROCm='7.2.1 official AMD',batch=8192,microbatch=8192,threads=16,context=262144,kv='f16/f16',speculation='MTP3 + ngram',draftVocabulary=16384,fastSwitches=dict(ROCMFPX_DRAFT_VOCAB=16384,ROCMFPX_QWEN4_QSA_DECODE=1,ROCMFPX_QWEN4_PAD_HEAD=1,ROCMFPX_NGRAM_WINDOW=1,ROCMFPX_NGRAM_FLOOR4=1,ROCMFPX_HIP_GRAPH_COPY_KERNEL=1,ROCMFPX_MOE_SORT_IDS=1,ROCMFPX_ROCMI4_MOE_RPB8=1),cpuGovernor='powersave',thinkingSampler='temperature 1; top_p .95; top_k 20; min_p 0; presence penalty 0',nonthinkingSampler='temperature .7; top_p .8; top_k 20; min_p 0; presence penalty 1.5',weights='HC-Q8',weightSha256='c45b39cc58cf2f4d71bdb005d3975c05629b59f6a9bcbbdef02191b3c2d34088')
  m['metrics']=dict(decode=p['he09_speed']['decode_tps'],heWall=p['he09_speed']['wall_seconds'],kl=float(f['mean_teacher_KL']),top1=float(f['teacher_top1_agreement'])*100,package=new['weight_file_bytes']/2**30,cold=[dict(depth=r['depth'],pp=r['pp']) for r in p['counting']['cold_prefixes']],append=[dict(prompt=r['prompt'],depth=r['depth'],pp=r['pp']) for r in p['counting']['rows']],nativePP=p['tom_settings_pp']['prefill_tps'],countingClean=p['counting']['clean_cells'])
  audit=read(NEW/'ciru-artifacts/hermes/hermes-audit.json');ev={v['case'].split('-attempt')[0]:v for v in audit['agent_evidence']}
  hs=nh['resultsByModel']['qwen38-flash-next-hcq8'];m['hermes']=dict(score=p['hermesagent20']['score'],basis='October 12 · only saved matching Hermes pass',tasks=[dict(id=t['scenarioId'],title=next(q['label'] for q in h['tasks'] if q['id']==t['scenarioId']),status=t['status'],score=t['score'],wall=t['wallSeconds'],tools=t['primaryToolCalls'],toolNames=sorted(set(ev[t['scenarioId']]['tools'])),summary=clean(t['verifier']['summary']),nestedTools=t['nestedToolCalls']) for t in hs])
 if id in ('tom','halogen'):
  report=nt if id=='tom' else halogen;cases=[t for t in report['scores']['scenario_results'] if 70<=int(t['scenario_id'].split('-')[1])<=84]
  assert len(cases)==15
  points=sum(t['points'] for t in cases);score=report['final_score'] if id=='tom' else points/30*100
  m['tools']=dict(score=score,points=points,basis='October 12 · corrected 15-case protocol' if id=='tom' else f"October 7–8 · best hard subset pass {halogenBest['passNumber']} of 5, stock 84-case protocol",tasks=[dict(id=t['scenario_id'],title=next(q['title'] for q in n['panels']['toolsRecommended']['cases'] if q['taskId']==t['scenario_id']),status=t['status'],score=t['points']*50,wall=t['duration_seconds'],tools=len(t['tool_calls_made']),toolNames=[q.split('(')[0] for q in t['tool_calls_made']],summary=clean(t['summary'])) for t in cases])
 for panel in ('tools','hermes'):
  if m[panel]:
   elapsed=0
   for t in m[panel]['tasks']:t['start']=elapsed;elapsed+=t['wall'];t['end']=elapsed
   m[panel]['wall']=elapsed;m[panel]['passes']=sum(t['status']=='pass' for t in m[panel]['tasks'])
   if panel=='tools' and id=='halogen':m[panel]['selection']=selected(halogenCandidates,halogenBest)
   elif 'selection' not in m[panel]:
    candidate=dict(passNumber=1,scoreExact=(m[panel]['points']/30*100 if panel=='tools' else sum(t['score'] for t in m[panel]['tasks'])/len(m[panel]['tasks'])),wall=elapsed)
    if panel=='tools':candidate['points']=m[panel]['points']
    else:candidate['officialScore']=m[panel]['score']
    m[panel]['selection']=selected([candidate],candidate)
   m[panel]['selection']['selectedSource']=m['source']
   assert abs(next(z['wall'] for z in m[panel]['selection']['candidates'] if z['passNumber']==m[panel]['selection']['passNumber'])-elapsed)<.001
 models.append(m)
# Preserve all five audited Halogen passes, with native stage rates on their own workload.
hp=halogenComparison['models'][0]['passes'];halogenLatest=dict(version='0.17.1',selectedRacePass=halogenBest['passNumber'],passes=[dict(passNumber=z['pass_number'],core=z['core']['score_percent'],hard=z['hard']['score_percent'],combined=z['combined_points']['score_percent'],hardWall=z['hard']['case_seconds'],native=z['native_timing']) for z in hp]);halogenLatest['hardMean']=sum(z['hard']['score_percent'] for z in hp)/5;halogenLatest['combinedMean']=sum(z['combined_points']['score_percent'] for z in hp)/5
for stage in ('prompt','decode'):
 halogenLatest[stage+'Rate']=sum(z['native_timing'][stage]['tokens'] for z in hp)/sum(z['native_timing'][stage]['seconds'] for z in hp)
assert len(models)==5 and all(len(m['tools']['tasks'])==15 for m in models);assert sum(len(m['hermes']['tasks']) for m in models if m['hermes'])==80
result=dict(title='Tom Turney Expert Optimization saves ROCmFPX',asOf='2026-10-12',models=models,halogenLatest=halogenLatest,sources=source,strictControlledRanking=False,inferencePerformed=False,oldPage='https://llm.ciru.ai/research/strix-showdown-20261001/',tomProfile='https://x.com/no_stp_on_snek?s=20',runtimeSource='https://github.com/ROCmFPX/ROCmFPX/tree/c4aa38b1987ee9cd390f56fb393ba93ac472769b',selectionPolicy=POLICY,method='Replay sums measured case durations, excluding gaps. Every displayed outcome is preserved. Different host policies, dates, workload history and protocols prevent a strict controlled ranking. No new model inference was performed to build this page.')
(R/'data/comparison.json').write_text(json.dumps(result,indent=2)+'\n');(R/'data/source-manifest.json').write_text(json.dumps(source,indent=2)+'\n')
with (R/'data/measurements.csv').open('w') as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['stack','date','he09_decode_tps_n_minus_1','cold_256k_pp_tps','KL','top1_percent','hard_points_best_pass','hard_selected_pass','hard_available_passes','hermes_best_pass','hermes_selected_pass','hermes_available_passes','package_gib'])
 for m in models:
  q=m['metrics'];w.writerow([m['name'],m['date'],q.get('decode'),next((t['pp'] for t in q.get('cold',[]) if t['depth']==256000),None),q.get('kl'),q.get('top1'),m['tools']['points'],m['tools']['selection']['passNumber'],m['tools']['selection']['availablePasses'],m['hermes']['score'] if m['hermes'] else None,m['hermes']['selection']['passNumber'] if m['hermes'] else None,m['hermes']['selection']['availablePasses'] if m['hermes'] else None,q.get('package')])
(R/'data/pass-selections.json').write_text(json.dumps(dict(policy=POLICY,models=[dict(id=m['id'],name=m['name'],tools=m['tools']['selection'],hermes=m['hermes']['selection'] if m['hermes'] else None) for m in models]),indent=2)+'\n')
print(json.dumps(dict(models=len(models),toolsCases=75,hermesCases=80,latestHalogenPasses=5,inferencePerformed=False)))
