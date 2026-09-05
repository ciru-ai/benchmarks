import hashlib,json,math,socket,sqlite3,tarfile
from pathlib import Path
R=Path(__file__).resolve().parent;host=socket.gethostname();store=Path('/srv/llm/bench-results/llama') if host=='sozo' else Path('/home/crown/bench-results/llama')
c=sqlite3.connect(f'file:{store}/results.sqlite3?mode=ro',uri=True);c.row_factory=sqlite3.Row
arms=['laurent','unsloth'] if host=='sozo' else ['ciru'];results={};audit=[];files=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for arm in arms:
 d=R/'benchmarks'/arm;assert (d/'COMPLETE.json').exists();a=json.loads((d/'summary.json').read_text());assert a['completed']==10
 for row in a['rows']:
  p=Path(row['row']);raw=json.loads(p.read_text());records=c.execute('SELECT seq,row_json,row_hash,chain_hash FROM benchmark_rows WHERE label=?',(raw['label'],)).fetchall();assert len(records)==1
  sr=dict(records[0]);stored=json.loads(sr.pop('row_json'));assert stored==raw
  rp=Path(raw['raw_output']);events=[]
  for line in rp.read_text().splitlines():
   if line.startswith('data: '):
    try:events.append(json.loads(line[6:]))
    except json.JSONDecodeError:pass
  f=events[-1];assert f['stop'] and f['stop_type']=='eos' and not f['truncated'];assert raw['tokens_predicted']==f['tokens_predicted']
  text=''.join(e.get('content','') for e in events);assert text==(p.parent/'completion.txt').read_text();assert '<think>' not in text and '</think>' not in text
  assert raw['timings']['draft_n']==row['drafted'] and raw['timings']['draft_n_accepted']==row['accepted']
  effective=raw['timings']['predicted_per_second']*raw['timings']['predicted_ms']/1000
  assert math.isclose(effective,raw['tokens_predicted']-1,abs_tol=1e-6)
  row['decode_timed_tokens']=round(effective);row['source_row_sha256']=sha(p);row['source_raw_sha256']=sha(rp)
  row['store']={'host':host,**sr};audit.append({'arm':arm,'task':row['task'],**row['store'],'row_sha256':sha(p),'raw_sha256':sha(rp),'natural_eos':True,'nonthinking':True,'mtp_active':True})
  row['row']=f'evidence/{arm}/{p.parent.name}/row.json';row['raw_output']=f'evidence/{arm}/{p.parent.name}/stream.raw'
  files.append((rp,row['raw_output']))
  for n in ['row.json','payload.json','prompt.txt','completion.txt','before.json','after.json']:
   files.append((p.parent/n,f'evidence/{arm}/{p.parent.name}/{n}'))
 a['decode_timed_tokens']=sum(x['decode_timed_tokens'] for x in a['rows']);a['weighted_tg']=a['decode_timed_tokens']/a['decode_seconds']
 a['note']='Server TG excludes the first generated token from decode timing. Generated/total token counts retain every token; aggregate TG uses sum(n_generated-1)/sum(predicted_ms/1000), consistent with per-task server TG.'
 a['protocol']=json.loads((d/'protocol.lock.json').read_text());a['identity']=json.loads((d/'identity.json').read_text());results[arm]=a
 for n in ['protocol.lock.json','identity.json','rendered-requests.json','rendered-diff.txt','server.log']:
  files.append((d/n,f'evidence/{arm}/{n}'))
(R/f'{host}-results.json').write_text(json.dumps(results,indent=2)+'\n');(R/f'{host}-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
with tarfile.open(R/f'{host}-evidence.tar.gz','w:gz') as t:
 for p,n in files:t.add(p,arcname=n)
 for n in ['preflight.json','cleanup.json',f'{host}-audit.json','he_nonthinking.py','recorder.py']:
  t.add(R/n,arcname=f'evidence/{host}/{n}')
print(json.dumps({k:{f:v[f] for f in ['completed','weighted_tg','generated_tokens','total_tokens','request_wall_seconds','panel_wall_seconds','acceptance']} for k,v in results.items()},indent=2))
