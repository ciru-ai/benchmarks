import importlib.util,json,sys
from pathlib import Path
V=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('official_recorder',str(Path.home()/'.codex/skills/llama-benchmark/scripts/llama_benchmark.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
devices=[p for p in Path('/sys/class/drm').glob('card[0-9]*/device') if (p/'mem_info_vram_used').exists()];assert len(devices)==1;m.GPU=devices[0]
i=sys.argv.index('--payload-file');payload=json.loads(Path(sys.argv[i+1]).read_text());sys.argv[i:i+2]=['--payload-json',json.dumps(payload)]
orig=m.store_rows
def store(out,rows):
 identity=json.loads((V/'current-server.json').read_text())
 for row in rows:
  row['profile_id']=identity['arm'];row['server_identity']=identity;row['protocol_lock']=identity['protocol_lock'];row['request_parameters']={k:v for k,v in payload.items() if k!='prompt'}
 orig(out,rows)
m.store_rows=store;m.main()
