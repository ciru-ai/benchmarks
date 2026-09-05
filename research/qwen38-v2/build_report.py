#!/usr/bin/env python3
"""Rebuild this static research report and ECharts options from results.json."""
import hashlib,html,json
from pathlib import Path
from string import Template
from pyecharts import options as opts
from pyecharts.charts import Bar,Line
R=Path(__file__).resolve().parent
D=json.loads((R/'results.json').read_text());ORDER=D['order'];P=D['profiles'];H=D['humaneval'];Q=D['bf16'];S=D['sweep']
COLORS=[P[k]['color'] for k in ORDER];MUTED='#a8adb7';GRID='rgba(255,255,255,.10)';charts={}
def finish(c,name,unit,desc):
 c.set_global_opts(legend_opts=opts.LegendOpts(pos_top='0',textstyle_opts=opts.TextStyleOpts(color='#e4e6ed',font_family='Space Grotesk')),tooltip_opts=opts.TooltipOpts(trigger='axis',axis_pointer_type='shadow' if isinstance(c,Bar) else 'line'),xaxis_opts=opts.AxisOpts(axislabel_opts=opts.LabelOpts(color=MUTED,font_family='IBM Plex Mono')),yaxis_opts=opts.AxisOpts(name=unit,min_=0,axislabel_opts=opts.LabelOpts(color=MUTED,font_family='IBM Plex Mono'),splitline_opts=opts.SplitLineOpts(is_show=True,linestyle_opts=opts.LineStyleOpts(color=GRID))))
 o=json.loads(c.dump_options());o.update({'backgroundColor':'transparent','animation':False,'color':COLORS,'grid':{'left':62,'right':25,'top':68,'bottom':40,'containLabel':False},'textStyle':{'fontFamily':'Space Grotesk','color':'#e4e6ed'},'aria':{'enabled':True,'label':{'description':desc}}})
 if isinstance(o['legend'],list):o['legend']=o['legend'][0]
 o['tooltip'].update({'backgroundColor':'#17191e','borderColor':'#454a53','textStyle':{'color':'#f7f7f4'},'confine':True,'valueFormatter':None})
 for ax in o['xAxis']+o['yAxis']:
  ax['nameTextStyle']={'color':MUTED,'fontFamily':'IBM Plex Mono','fontSize':11};ax['axisLine']={'lineStyle':{'color':'#50535b'}};ax['axisTick']={'show':False}
 o['xAxis'][0]['splitLine']={'show':False}
 o['yAxis'][0]['splitLine']={'show':True,'lineStyle':{'color':GRID,'width':1}}
 charts[name]=o;return o

def linechart(name,x,series,unit,desc):
 c=Line().add_xaxis(x)
 for i,(key,ys) in enumerate(series.items()):
  c.add_yaxis(P[key]['name'],ys,is_smooth=False,symbol=['circle','rect','triangle'][i],symbol_size=7,is_symbol_show=True,label_opts=opts.LabelOpts(is_show=False),linestyle_opts=opts.LineStyleOpts(width=3),itemstyle_opts=opts.ItemStyleOpts(color=P[key]['color']))
 return finish(c,name,unit,desc)
def bar(name,labels,values,colors,unit,desc,precision=3):
 c=Bar().add_xaxis(labels).add_yaxis('',[opts.BarItem(name=l,value=round(v,precision),itemstyle_opts=opts.ItemStyleOpts(color=color)) for l,v,color in zip(labels,values,colors)],bar_max_width=62,label_opts=opts.LabelOpts(is_show=True,position='top',color='#f7f7f4',font_family='IBM Plex Mono'))
 o=finish(c,name,unit,desc);o['legend']['show']=False;o['grid']['top']=45;o['yAxis'][0].pop('max',None)
 return o
labels=[P[k]['name'] for k in ORDER]
linechart('he-tg',[str(n) for n in range(10)],{k:[round(r['tg'],3) for r in H[k]['rows']] for k in ORDER},'tok/s','Generation speed for HumanEval tasks 0–9. Exact values in the per-task table.');charts['he-tg']['yAxis'][0]['max']=75
bar('he-aggregate',labels,[H[k]['weighted_tg'] for k in ORDER],COLORS,'tok/s','Aggregate non-thinking MTP generation speed.',2)
for metric,unit in [('acceptance','%'),('wall_seconds','seconds'),('generated_tokens','tokens')]:
 linechart('he-'+metric,[str(n) for n in range(10)],{k:[round(r[metric]*(100 if metric=='acceptance' else 1),3) for r in H[k]['rows']] for k in ORDER},unit,'HumanEval per-task '+metric.replace('_',' ')+'. Exact data in the CSV.')
 if metric=='acceptance':charts['he-'+metric]['yAxis'][0]['max']=100
for metric in ['mean_kl','median_kl','p95_kl','max_kl']:
 bar('bf-'+metric,labels,[Q['rows'][k][metric] for k in ORDER],COLORS,'KL · nats','BF16 to candidate forward KL, '+metric.replace('_',' ')+', over 64 distributions.',5)
bar('bf-ppl',['BF16']+labels,[Q['bf16_ppl_60']]+[Q['rows'][k]['ppl_60'] for k in ORDER],['#d2d7df']+COLORS,'PPL','Perplexity on 60 observed next tokens. Lower is better.',4)
bar('bf-ppl-delta',labels,[(Q['rows'][k]['ppl_60']/Q['bf16_ppl_60']-1)*100 for k in ORDER],COLORS,'% over BF16','Perplexity increase relative to the BF16 reference on 60 observed tokens.',2)
x=['512','2K','8K','16K','32K','64K','128K']
for metric,unit in [('pp','tok/s'),('tg','tok/s'),('ttfp_ms','seconds'),('total_ms','seconds')]:
 linechart('sweep-'+metric,x,{k:[round(r[metric]/(1000 if metric.endswith('_ms') else 1),3) for r in S[k]] for k in ORDER},unit,'MTP-off context sweep '+metric+'. 512 through 131072 prompt tokens, 128 generated tokens.')
for metric in ['peak_ram_used_bytes','delta_ram_used_bytes','peak_gtt_used_bytes']:
 linechart('sweep-'+metric,x,{k:[round(r['memory'][metric]/2**30,3) for r in S[k]] for k in ORDER},'GiB','Whole-system '+metric.replace('_',' ')+'. Shared memory counters overlap and are not added together.')
(R/'chart-options.json').write_text(json.dumps(charts,separators=(',',':'))+'\n')
def e(x):return html.escape(str(x))
def f(x,n=2):return f'{x:,.{n}f}'
def table(headers,rows,caption=''):
 return '<div class="table-scroll" tabindex="0"><table>'+('<caption>'+caption+'</caption>' if caption else '')+'<thead><tr>'+''.join('<th scope="col">'+x+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td>')+str(v)+('</th>' if i==0 else '</td>') for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table></div>'
def model(k):return f'<span class="model-name" style="--model:{P[k]["color"]}">{e(P[k]["name"])}</span>'
summary=table(['Candidate / host','TG tok/s','Prompt tokens','Generated tokens','Total tokens','Request wall','Panel elapsed','MTP accepted'],[[model(k)+f'<small>{P[k]["backend"]} · {P[k]["host"]}</small>',f(H[k]['weighted_tg']),f(H[k]['prompt_tokens'],0),f(H[k]['generated_tokens'],0),f(H[k]['total_tokens'],0),f(H[k]['request_wall_seconds'])+' s',f(H[k]['panel_wall_seconds'])+' s',f(H[k]['acceptance']*100)+'%'] for k in ORDER],'Ten completed requests per candidate. TG uses server decode time; wall time includes prefill.')
per=[]
for n in range(10):
 row=[f'HumanEval/{n}']
 for k in ORDER:
  r=H[k]['rows'][n];row += [f(r['tg']),str(r['generated_tokens']),f(r['wall_seconds'])+' s']
 per.append(row)
per_table=table(['Task']+[P[k]['name']+' '+z for k in ORDER for z in ['TG','tokens','wall']],per,'Per-task measurements · TG in tok/s · tokens are generated tokens')
bf_table=table(['Candidate','Mean KL ↓','Median KL ↓','P95 KL ↓','Max KL ↓','Top1 agreement ↑','PPL ↓'],[[model(k)]+[f(Q['rows'][k][m],5) for m in ['mean_kl','median_kl','p95_kl','max_kl']]+[f'{Q["rows"][k]["top1_agreement"]}/64',f(Q['rows'][k]['ppl_60'],4)] for k in ORDER],'BF16 reference PPL: '+f(Q['bf16_ppl_60'],4)+' · 64 distributions / 60 observed next tokens')
sweep_table=table(['Prompt tokens']+[P[k]['name']+' '+z for k in ORDER for z in ['PP','TG']],[[f(S[ORDER[0]][i]['prompt_tokens'],0)]+[f(S[k][i][m]) for k in ORDER for m in ['pp','tg']] for i in range(7)],'MTP off · 128 generated tokens per request · PP and TG in tok/s')
profiles=table(['Package','Runtime / backend','MTP recipe','Target KV','b / ub','Context','Threads'],[[f'<a href="{P[k]["model_url"]}">{model(k)}</a>',f'<a href="{P[k]["runtime_url"]}">{P[k]["runner"]}</a><small>{P[k]["backend"]}</small>',e(P[k]['mtp']),e(P[k]['target_kv']),e(P[k]['batch']),f(P[k]['context'],0),str(P[k]['threads'])] for k in ORDER],'HumanEval serving profiles. Full commands, binary hashes and templates are in the protocol download.')
chips=''.join(f'<span class="package-chip">{model(k)}<small>{P[k]["backend"]}</small></span>' for k in ORDER)
t=Template((R/'report-template.html').read_text())
values={'chips':chips,'he_summary':summary,'he_table':per_table,'bf_table':bf_table,'sweep_table':sweep_table,'profiles':profiles,'ciru_tg':f(H['ciru']['weighted_tg']),'ciru_kl':f(Q['rows']['ciru']['mean_kl'],5),'ciru_ppl':f(Q['rows']['ciru']['ppl_60'],4),'ciru_pp128':f(S['ciru'][-1]['pp']),'delta_laurent':f((H['ciru']['weighted_tg']/H['laurent']['weighted_tg']-1)*100,1),'delta_unsloth':f((H['ciru']['weighted_tg']/H['unsloth']['weighted_tg']-1)*100,1)}
(R/'index.html').write_text(t.substitute(values))
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in R.iterdir() if p.is_file() and p.name!='SHA256.json'}
(R/'SHA256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Built {len(charts)} ECharts views and accessible tables.')
