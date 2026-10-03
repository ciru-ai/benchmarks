'use strict';
const REPORT = JSON.parse(document.getElementById('report-data').textContent);
const N = REPORT.nonhermes, H = REPORT.hermes, M = REPORT.models, P = N.panels;
const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v,p=2) => v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US',{maximumFractionDigits:p,minimumFractionDigits:0});
const clock = s => {s=Math.max(0,s);return `${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(1).padStart(4,'0')}`};
const model = (id,short=true) => M[id] ? `<span class="model-cell"><img src="${M[id].image}" alt="" loading="lazy"><span>${esc(short?M[id].short:M[id].name)}</span></span>` : esc(id);
const symbols = {pass:'✓',partial:'△',fail:'×',mixed:'◐',pending:'·'};
const pretty = x => typeof x === 'object' ? JSON.stringify(x) : String(x);
function table(target,columns,rows){
  if(!$(target))return;
  $(target).innerHTML=`<table><thead><tr>${columns.map(c=>`<th scope="col">${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td class="${c[2]?'':'numeric'}">${typeof c[1]==='function'?c[1](r):esc(typeof r[c[1]]==='number'?num(r[c[1]],3):r[c[1]]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const hById=Object.fromEntries(H.models.map(m=>[m.id,m]));
const sweepComparisons=REPORT.sweeps.comparison;
const comparisonValue=(metric,id)=>sweepComparisons[metric].rows.find(r=>r.modelId===id)?.value??null;
const scoreMetrics=[
 {id:'prefill',label:'Prefill ↑',unit:'256k · tok/s',value:r=>comparisonValue('pp',r.modelId),format:v=>num(v,1)},
 {id:'decode',label:'Decode ↑',unit:'HE0–9 · tok/s',value:r=>comparisonValue('tg',r.modelId),format:v=>num(v,2)},
 {id:'hermes',label:'Hermes ↑',unit:'mean /100',value:r=>hById[r.modelId]?.score_mean??null,format:v=>num(v,1)},
 {id:'wall',label:'Hermes wall ↓',unit:'mean · mm:ss',lower:true,value:r=>hById[r.modelId]?.case_wall_seconds_mean??null,format:v=>clock(v)},
 {id:'tools',label:'Tools ↑',unit:'score /100',value:r=>r.toolsOfficial,format:v=>num(v,0)},
 {id:'kl',label:'KL ↓',unit:'divergence',lower:true,value:r=>r.fidelityKl,format:v=>num(v,6)},
 {id:'package',label:'Package ↓',unit:'GiB',lower:true,value:r=>r.packageGiB,format:v=>num(v,2)}
];
for(const metric of scoreMetrics){const values=N.overview.map(metric.value).filter(Number.isFinite);metric.best=(metric.lower?Math.min:Math.max)(...values);metric.winners=N.overview.filter(r=>Number.isFinite(metric.value(r))&&Math.abs(metric.value(r)-metric.best)<=1e-10*Math.max(1,Math.abs(metric.best))).map(r=>r.modelId);}
$('overview').innerHTML=`<table class="scorecard-table"><thead><tr><th scope="col">Stack</th>${scoreMetrics.map(m=>`<th scope="col">${m.label}<small>${m.unit}</small></th>`).join('')}</tr></thead><tbody>${N.overview.map(r=>`<tr><th scope="row">${model(r.modelId)}</th>${scoreMetrics.map(m=>{const value=m.value(r),best=m.winners.includes(r.modelId);return `<td class="numeric ${best?'category-best':''}" data-metric="${m.id}" data-model="${r.modelId}"${best?' aria-label="'+esc(m.label+' category best: '+m.format(value))+'"':''}><span class="score-value">${value==null?'—':m.format(value)}</span>${best?'<span class="best-label">◆ '+(m.winners.length>1?'JOINT BEST':'BEST')+'</span>':''}</td>`}).join('')}</tr>`).join('')}</tbody></table>`;
table('hermes-table',[
  ['Stack',r=>model(r.modelId),true],['Run','pass'],['Score /100','official_score'],['Passed /20','passes'],['Partial','partials'],['Failed','fails'],['Case wall (s)',r=>num(r.case_wall_seconds,3)],['Elapsed (s)',r=>num(r.suite_elapsed_seconds,3)],['Known primary calls',r=>num(r.known_primary_tools)+(r.missing_tool_counts?' + unknown':'')]
],H.models.flatMap(m=>[...m.runs.map(r=>({...r,modelId:m.id,host:m.host})),{modelId:m.id,host:m.host,pass:'Mean',official_score:m.score_mean,passes:m.passes_mean,partials:m.partials_mean,fails:m.fails_mean,case_wall_seconds:m.case_wall_seconds_mean,suite_elapsed_seconds:m.suite_elapsed_seconds_mean,known_primary_tools:m.tools_mean,missing_tool_counts:m.tools_mean_is_lower_bound}]));
table('tools-table',[
 ['Stack',r=>model(r.modelId),true],['Score /100','score'],['Pass / partial / fail',r=>`${r.passed} / ${r.partial} / ${r.failed}`],['Benchmark (s)',r=>num(r.wallSeconds)],['Tool calls','toolCalls']
],P.toolsRecommended.rows);
table('he-table', [['Stack',r=>model(r.modelId),true],['Task','taskId'],['Native tok/s','nativeTps'],['Request (s)','wallSeconds'],['Output tokens','outputTokens'],['Convention','timing']],P.he09.cases);
table('fidelity-table',[['Stack',r=>model(r.modelId),true],['KL',r=>num(r.kl,6)],['Top-1 %',r=>num(r.top1Pct,4)],['Tie-aware %',r=>num(r.tieAwareTop1Pct,4)],['NLL',r=>num(r.nll,6)],['Perplexity',r=>num(r.perplexity,6)],['Logit RMSE',r=>num(r.logitRmse,6)],['Positions','positions']],P.fidelity.rows);
table('cold-table',[['Stack',r=>model(r.modelId),true],['Input tokens','inputTokens'],['Cold tok/s','tps'],['Cached tokens','cachedTokens']],P.coldPrefill.rows);
const gridColumns=[['Stack',r=>model(r.modelId),true],['Append','promptTokens'],['Cached depth','depthTokens'],['Prefill tok/s','pp']];
table('append-table',gridColumns,P.appendPrefill.rows);
table('memory-table',[['Stack',r=>model(r.modelId),true],['Package GiB','packageGiB'],['Serving GiB','servingGiB'],['GTT GiB','peakGttGiB'],['VRAM GiB','peakVramGiB']],P.memory.rows);
table('identities',[['Stack',r=>model(r.id),true],['Runtime / weights',r=>Object.entries(r.identity).filter(([k])=>k!=='model').map(([k,v])=>`<div><span style="color:var(--subtle)">${esc(k)}:</span> ${esc(pretty(v))}</div>`).join(''),true],['Pinned card',r=>r.cardUrl?`<a href="${esc(r.cardUrl)}" target="_blank" rel="noopener">${esc(r.card.repo)} ↗</a><p>${esc(r.samplerInheritance)}</p>`:'Hermes/storage extension only',true]],Object.values(M));

function conditionsList(conditions){return `<dl class="condition-list">${Object.entries(conditions).map(([k,v])=>`<dt>${esc(k.replaceAll('_',' '))}</dt><dd>${esc(Array.isArray(v)?v.join(', '):pretty(v))}</dd>`).join('')}</dl>`;}
$('panel-conditions').innerHTML=Object.entries(P).map(([k,p])=>`<article class="method"><h3>${esc(p.title)}</h3>${conditionsList(p.conditions)}<a href="data/${k}-rows.csv" download>Download measurements CSV ↗</a></article>`).join('')+`<article class="method"><h3>HermesAgent-20</h3>${conditionsList(H.protocol)}</article>`;
const storyFor=(mid,tid)=>REPORT.toolStories.models.find(m=>m.id===mid)?.failures.find(t=>t.taskId===tid);



function statusClass(status){return ['pass','partial','fail','mixed'].includes(status)?status:'pending'}
function renderHermesMatrix(){
 const tasks=H.tasks;
 $('hermes-matrix').innerHTML=`<table class="matrix"><thead><tr><th scope="col">Stack / task</th>${tasks.map(t=>`<th scope="col" title="${esc(t.label)}">${t.id.replace('HA-','')}</th>`).join('')}</tr></thead><tbody>${H.models.map(m=>`<tr><th scope="row">${esc(M[m.id].short)}</th>${m.tasks.map(t=>`<td><button class="cell ${statusClass(t.status)}" data-hermes-cell="${m.id}:${t.id}" aria-label="${esc(m.name+' '+t.id+' '+t.run_statuses.join(' and '))}" title="${esc(t.id+' · '+tasks.find(x=>x.id===t.id).label+' · '+t.scores.join(' / ')+' points')}">${t.run_statuses.map(s=>symbols[s]||'?').join('')}</button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
 $('hermes-matrix').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
   const [mid,tid]=b.dataset.hermesCell.split(':');const m=hById[mid],t=m.tasks.find(t=>t.id===tid),def=tasks.find(t=>t.id===tid);
   $('hermes-matrix-info').textContent=`${m.name} · ${tid} ${def.label}: Run 1 ${t.run_statuses[0]} (${t.scores[0]}/100), Run 2 ${t.run_statuses[1]} (${t.scores[1]}/100). Mean task wall ${num(t.wall_seconds)} s. Tools recorded: ${t.tool_names.join(', ')||'none / unavailable'}.`;
 }));
}
function renderToolsMatrix(){
 const p=P.toolsRecommended,tasks=p.taskDefinitions;
 $('tool-matrix').innerHTML=`<table class="matrix"><thead><tr><th scope="col">Stack / task</th>${tasks.map(t=>`<th scope="col" title="${esc(t.title)}">${esc(t.taskId.replace('TC-',''))}</th>`).join('')}</tr></thead><tbody>${p.rows.map(r=>`<tr><th scope="row">${esc(M[r.modelId].short)}</th>${tasks.map(def=>{
   const t=p.cases.find(c=>c.modelId===r.modelId&&c.taskId===def.taskId),points=t.points,status=t.status;
   return `<td><button class="cell ${status}" data-tool-cell="${r.modelId}:${def.taskId}" title="${esc(def.title)}" aria-label="${esc(M[r.modelId].short+' '+def.taskId+' '+status)}">${points}</button></td>`;
 }).join('')}</tr>`).join('')}</tbody></table>`;
 $('tool-matrix').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const [mid,tid]=b.dataset.toolCell.split(':');const t=p.cases.find(c=>c.modelId===mid&&c.taskId===tid);$('tool-matrix-info').textContent=`${M[mid].short} · ${tid}: ${t.title}. ${t.points}/2 points; ${num(t.durationSeconds)} s. ${storyFor(mid,tid)?.explanation||t.summary}`;}));
}
renderHermesMatrix();renderToolsMatrix();

// All base chart options below are generated by pyecharts in scripts/build_page.py.
const charts=new Map();
function drawChart(id,key,resetAxis=true){
 const el=$(id),spec=REPORT.charts[key];if(!el||!spec)return;
 if(!window.echarts){el.innerHTML='<p class="chart-unavailable">Chart library unavailable. Download the panel data below.</p>';return;}
 let state=charts.get(id);if(!state){state={chart:echarts.init(el,null,{renderer:'svg'}),key,zero:false};charts.set(id,state);}
 state.key=key;if(resetAxis)state.zero=false;
 const op=structuredClone(spec.option),small=el.clientWidth<500,mobile=innerWidth<701;
 if(mobile&&spec.kind==='dot'){op.grid.left=104;op.grid.right=48;op.yAxis[0].axisLabel.fontSize=9;op.series.forEach(s=>s.data.forEach(d=>{if(d.label)d.label.fontSize=10}));}
 if(spec.kind==='comparison'&&small){op.grid.left=96;op.grid.right=92;op.yAxis[0].axisLabel.fontSize=10;for(const s of op.series)if(s.type==='scatter')for(const d of s.data){if(d.label){d.label.distance=9;d.label.rich.speed.fontSize=13;d.label.rich.speed.lineHeight=19;d.label.rich.rank.fontSize=8;d.label.rich.rank.lineHeight=14;}}}
 if(spec.kind==='context'&&small){op.grid.left=46;op.grid.right=111;op.grid.top=28;op.xAxis[0].axisLabel.fontSize=9;op.yAxis[0].axisLabel.fontSize=9;for(const s of op.series){if(s.endLabel)s.endLabel.fontSize=9;}}
 const horizontal=['dot','comparison'].includes(spec.kind),axis=horizontal?'xAxis':'yAxis';if(state.zero){op[axis][0].min=0;delete op[axis][0].interval;}
 for(const name of ['xAxis','yAxis'])for(const a of op[name])if(a.type==='value'){a.axisLabel.formatter=v=>num(v,Math.abs(v)<1?4:Math.abs(v)<100?2:0);a.axisLabel.showMaxLabel=spec.kind==='context';}
 if(spec.kind==='comparison')op.tooltip.formatter=p=>{const d=p.data;return `<strong>${esc(d.model||p.name)}</strong><br>${num(p.value[0],2)} tok/s<br>Rank ${d.rank}${d.gapPct?' · '+num(d.gapPct,1)+'% behind the leader':' · fastest'}`};
 else if(spec.kind==='dot')op.tooltip.formatter=p=>`${esc(p.name)}<br><b>${num(p.value[0],6)}</b> ${esc(spec.unit)}`;
 else if(spec.kind==='context')op.tooltip.formatter=ps=>{
   const items=ps.filter(p=>p.seriesType==='line'&&p.value?.[1]!=null).sort((a,b)=>b.value[1]-a.value[1]);
   const title=spec.taskSeries?`HumanEval/${ps[0]?.axisValue??''}`:`${num(Number(ps[0]?.axisValue)*1000,0)} ${spec.metric==='cold'?'input':'cached context'} tokens`;
   return `<strong>${title}</strong><br>`+items.map((p,i)=>`${p.marker}${esc(p.seriesName)}: <b>${num(p.value[1],2)} tok/s</b>${i===0?' ◆':''}`).join('<br>');
 };
 else op.tooltip.formatter=ps=>`${esc(ps[0]?.axisValue||'')} tokens<br>`+ps.map(p=>`${p.marker}${esc(p.seriesName)}: <b>${p.value?.[1]==null?'—':num(p.value[1],3)}</b>`).join('<br>');

 state.chart.setOption(op,true);el.setAttribute('role','img');el.setAttribute('aria-label',`${spec.unit}. ${spec.description||''} ${state.zero?'Zero baseline.':'Focused axis.'}`);
 const btn=document.querySelector(`[data-axis="${id}"]`);if(btn)btn.textContent=state.zero?'Focus axis':'Show zero';
}
document.querySelectorAll('[data-chart]').forEach(el=>drawChart(el.id,el.dataset.chart));
document.querySelectorAll('[data-axis]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.axis,s=charts.get(id);s.zero=!s.zero;drawChart(id,s.key,false)}));
[['he-mode','he-speed'],['fidelity-mode','fidelity-error'],['agreement-mode','fidelity-top1']].forEach(([sel,id])=>$(sel).addEventListener('change',()=>drawChart(id,$(sel).value)));
for(const [metric,target] of [['pp','prefill-award'],['tg','decode-award']]){
 const rows=sweepComparisons[metric].rows,ranked=[...rows].sort((a,b)=>b.value-a.value),winner=ranked[0],runner=ranked[1],entry=M[winner.modelId];
 $(target).style.setProperty('--leader-color',entry.color);
 $(target).innerHTML=`<img src="${entry.image}" alt=""><div><strong><span>01 / LEADER</span>${esc(entry.short)}</strong><small>${num((winner.value/runner.value-1)*100,1)}% ahead of ${esc(M[runner.modelId].short)} ${metric==='pp'?'at 256k input':'on HE0–9'}</small></div>`;
}
$('sweep-legend').innerHTML=REPORT.sweeps.modelOrder.map(id=>`<span style="--model-color:${M[id].color}"><i></i>${esc(M[id].short)}</span>`).join('');
let resizeFrame;
const resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{for(const [id,{chart,key}] of charts){chart.resize();if(['comparison','context'].includes(REPORT.charts[key].kind))drawChart(id,key,false);}window.classicRaceResize?.()})});resize.observe(document.body);
