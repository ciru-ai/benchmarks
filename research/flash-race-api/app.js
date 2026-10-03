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
const resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{for(const [id,{chart,key}] of charts){chart.resize();if(['comparison','context'].includes(REPORT.charts[key].kind))drawChart(id,key,false);}renderRace(true)})});resize.observe(document.body);

// The replay moves through measured task time. It does not invent tool timestamps.
let race={panel:'hermes',run:'mean',time:0,duration:0,playing:false,speed:30,lanes:[],last:0,frame:0};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)document.body.classList.add('no-motion');
function getLanes(){
 if(race.panel==='tools')return P.toolsRecommended.rows.map(m=>({id:m.modelId,name:m.model,score:m.score,passes:m.passed,wall:m.caseWallSeconds,tasks:P.toolsRecommended.cases.filter(t=>t.modelId===m.modelId).map(t=>({id:t.taskId,title:t.title,status:t.status,score:t.points*50,start:t.startSeconds,end:t.endSeconds,wall:t.durationSeconds,tools:t.toolCallCount,tool_names:t.toolCalls.map(s=>s.split('(')[0]),summary:t.summary,source:t,pass_count:t.status==='pass'?1:0}))}));
 return H.models.map(m=>{
  const mean=race.run==='mean',run=mean?null:m.runs.find(r=>r.pass===Number(race.run));
  return {id:m.id,name:m.name,host:m.host,score:mean?m.score_mean:run.official_score,passes:mean?m.passes_mean:run.passes,wall:mean?m.case_wall_seconds_mean:run.case_wall_seconds,tasks:(mean?m.tasks:run.tasks).map(t=>({id:t.id,title:H.tasks.find(x=>x.id===t.id).label,status:t.status,score:t.score,start:t.start_seconds,end:t.end_seconds,wall:t.wall_seconds,tools:t.tools,tool_names:t.tool_names,summary:t.verifier_summary||t.summary,pass_count:mean?t.pass_count/2:t.status==='pass'?1:0,source:t}))};
 });
}
function buildRace(){
 race.lanes=getLanes();race.duration=Math.max(...race.lanes.map(l=>l.wall));race.time=0;race.playing=false;
 const count=race.panel==='hermes'?20:15;
 const headers=race.lanes[0].tasks.map(t=>`<span title="${esc(t.title)}">${t.id.split('-')[1]}</span>`).join('');
 $('race-grid').innerHTML=`<div class="race-head"><span>STACK</span><div class="gate-heads" style="grid-template-columns:repeat(${count},1fr)">${headers}</div><span style="text-align:right">PASSED / DONE</span></div>`+race.lanes.map(l=>`<div class="lane " data-lane="${l.id}"><div class="entrant"><img src="${M[l.id].image}" alt=""><div><strong>${esc(M[l.id].short)}</strong></div></div><div class="track"><div class="racer" style="--racer-color:${M[l.id].color}"><img src="${M[l.id].image}" alt=""></div><div class="gates" style="grid-template-columns:repeat(${count},1fr)">${l.tasks.map((t,i)=>`<button class="gate" data-index="${i}" title="${esc(t.id+' '+t.title)}" aria-label="${esc(l.name+' '+t.id+' '+t.title)}">·</button>`).join('')}</div><div class="track-status">Ready at the start line</div></div><div class="lane-result"><strong>0</strong><span> / 0</span><small>0/${count} checkpoints</small></div></div>`).join('');
 $('race-grid').querySelectorAll('.lane').forEach(el=>{
  const l=race.lanes.find(l=>l.id===el.dataset.lane);l.el=el;l.gates=[...el.querySelectorAll('.gate')];l.racer=el.querySelector('.racer');l.track=el.querySelector('.gates');l.statusEl=el.querySelector('.track-status');l.resultEl=el.querySelector('.lane-result');l.lastDone=-1;
  l.gates.forEach((b,i)=>b.addEventListener('click',()=>inspectTask(l,i)));
 });
 $('run-field').hidden=race.panel!=='hermes';$('timeline-end').textContent=clock(race.duration);
 $('clock-label').textContent=race.panel==='tools'?'SCORED TASK WALL CLOCK':race.run==='mean'?'MEAN TASK WALL CLOCK':'SELECTED TASK WALL CLOCK';
 $('race-subtitle').textContent=race.panel==='hermes'?'20 checkpoints × 2 runs. Qwen API uses its official hosted settings.':`15 tool scenarios. ${race.lanes.length} stacks. Watch each agent work through the challenge.`;
 $('race-note').textContent=race.panel==='tools'?'Replay sums measured scored-case durations; the unscored transport probe is excluded. Mock tools executed in the evaluation environment. Selected final verdicts shown.':race.run==='mean'?'Mean mode averages task wall times and pass counts across both runs; fractional pass counts are expected. Gaps between tasks are excluded. Lights use verifier verdicts.':'Replay sums selected case wall times; between-case gaps are excluded. API run 1 uses the authorized corrected HA-04. Tool calls have no subcall timestamps.';
 renderRace(true);
}
function inspectTask(l,index){
 const t=l.tasks[index],isMean=race.panel==='hermes'&&race.run==='mean',src=t.source;
 let verdict=isMean?`Run 1: ${src.run_statuses[0]} (${src.scores[0]}/100)<br>Run 2: ${src.run_statuses[1]} (${src.scores[1]}/100)`:`${t.status.toUpperCase()} · ${num(t.score)}/100`;
 const tools=t.tools==null?'Unavailable after timeout':`${num(t.tools,1)} ${isMean?'mean ':''}${race.panel==='hermes'?'primary ':''}calls`;
 let note=race.panel==='tools'?(storyFor(l.id,t.id)?.explanation||t.summary):t.summary;
 if(isMean){const m=hById[l.id];note=m.runs.map(r=>`Run ${r.pass}: ${r.tasks[index].verifier_summary||r.tasks[index].summary}`).join(' ');}
 $('inspector').innerHTML=`<div><div class="eyebrow">${esc(M[l.id].short)} / ${esc(t.id)}</div><h3>${esc(t.title)}</h3><span class="tag ${t.status==='pass'?'live':'warn'}">${esc(t.status.toUpperCase())}${isMean?' · TWO-RUN VIEW':''}</span></div><div><div class="inspector-details"><div><span>VERDICT / CREDIT</span><b>${verdict}</b></div><div><span>MEASURED TASK WALL</span><b>${num(t.wall,3)} s</b></div><div><span>TOOL EXECUTION</span><b>${esc(tools)}</b></div></div><p class="inspector-summary">${esc(note||'No final verifier narrative was retained.')}</p><p class="inspector-summary"><span style="color:var(--subtle)">Recorded tools:</span> ${esc(t.tool_names.join(' · ')||'None recorded / unavailable')}. ${race.panel==='hermes'?'Tool types are verified from agent-originated calls and observations.':''}</p></div>`;
}
function renderRace(force=false){
 if(!race.lanes.length)return;
 const now=race.time;
 $('wall-clock').textContent=clock(now);$('scrub').value=race.duration?Math.round(now/race.duration*1000):0;$('scrub').setAttribute('aria-valuetext',`${clock(now)} of ${clock(race.duration)}`);
 $('clock-state').textContent=`${now>=race.duration?'COMPLETE':race.playing?'PLAYING':now>0?'PAUSED':'READY'} · ${race.speed}× ${race.speed===1?'REAL TIME':'PLAYBACK'}`;
 $('play').textContent=race.playing?'Ⅱ Pause':now>=race.duration?'↺ Replay':'▶ Play race';$('play').setAttribute('aria-label',race.playing?'Pause race':now>=race.duration?'Replay race':'Play race');
 for(const l of race.lanes){
  const done=l.tasks.filter(t=>t.end<=now).length;const current=l.tasks.findIndex(t=>t.end>now);const task=l.tasks[current];
  const activeKey=current+':'+Boolean(task&&now>=task.start);
  if(done!==l.lastDone||l.lastActive!==activeKey||force){
    l.gates.forEach((b,i)=>{const t=l.tasks[i],completed=t.end<=now,active=i===current&&now>=t.start;b.className='gate '+(completed?statusClass(t.status):active?'active-gate':'');b.textContent=completed?symbols[t.status]||'?':active?'•':'·';b.setAttribute('aria-label',`${l.name} ${t.id} ${completed?t.status:active?'in progress':'pending'}`)});
    const passes=l.tasks.filter(t=>t.end<=now).reduce((s,t)=>s+t.pass_count,0);
    l.resultEl.innerHTML=`<strong style="color:${done===l.tasks.length?'var(--text)':'var(--pass)'}">${num(passes,1)}</strong><span> / ${done}</span><small>${done===l.tasks.length?num(l.score,1)+'/100 · '+clock(l.wall):done+'/'+l.tasks.length+' checkpoints'}</small>`;
    l.lastDone=done;l.lastActive=activeKey;
  }
  let progress=done;
  if(task){const frac=now<task.start?0:Math.max(0,Math.min(1,(now-task.start)/(task.end-task.start)));progress=current+(reduced?0:frac);l.statusEl.textContent=now<task.start?'Between checkpoints':`${task.id} · ${task.title} · ${clock(Math.max(0,now-task.start))}`;}
  else l.statusEl.textContent=`FINISHED · ${clock(l.wall)} ${race.run==='mean'&&race.panel==='hermes'?'mean task wall':'wall time'}`;
  const x=Math.max(0,Math.min(l.track.clientWidth-29,progress/l.tasks.length*(l.track.clientWidth-29)));
  l.racer.style.transform=`translateX(${x}px)`;
 }
}
function frame(timestamp){
 if(!race.playing)return;
 if(race.last)race.time=Math.min(race.duration,race.time+(timestamp-race.last)/1000*race.speed);
 race.last=timestamp;if(race.time>=race.duration)race.playing=false;
 renderRace();if(race.playing)race.frame=requestAnimationFrame(frame);
}
function pause(){race.playing=false;race.last=0;cancelAnimationFrame(race.frame);renderRace()}
$('play').addEventListener('click',()=>{if(race.playing){pause();return;}if(race.time>=race.duration)race.time=0;race.playing=true;race.last=0;race.frame=requestAnimationFrame(frame);renderRace(true)});
$('restart').addEventListener('click',()=>{pause();race.time=0;renderRace(true)});
$('finish').addEventListener('click',()=>{pause();race.time=race.duration;renderRace(true)});
$('scrub').addEventListener('input',()=>{const position=Number($('scrub').value);pause();race.time=position/1000*race.duration;renderRace(true)});
$('speed-select').addEventListener('change',()=>{race.speed=Number($('speed-select').value);race.last=0;renderRace()});
$('race-panel').addEventListener('change',()=>{pause();race.panel=$('race-panel').value;buildRace()});
document.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>{pause();race.run=b.dataset.run;document.querySelectorAll('[data-run]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});buildRace()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&race.playing)pause()});
buildRace();
// Small read-only diagnostics used by the saved browser verification.
window.showdownState=()=>({race:{panel:race.panel,run:race.run,time:race.time,duration:race.duration,playing:race.playing,speed:race.speed,lanes:race.lanes.map(l=>({id:l.id,completed:l.tasks.filter(t=>t.end<=race.time).length,total:l.tasks.length}))},charts:charts.size,errors:0});
