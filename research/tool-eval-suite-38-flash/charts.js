'use strict';
(async()=>{
const response=await fetch('data/results.json');
if(!response.ok)throw new Error('Results unavailable');
const D=await response.json(), M=D.models;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,n=2)=>v==null?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const time=s=>`${Math.floor(s/60)}m ${String(Math.round(s%60)).padStart(2,'0')}s`;
const mono='IBM Plex Mono', verdictColor={pass:'#20d1a2',partial:'#f6c046',fail:'#ff4e5f'};
let group='all';
const selected=()=>M.filter(m=>group==='all'||m.group===group);
const chart={};
for(const name of ['quality','wall','passes','tradeoff','tg','pp','categories'])chart[name]=echarts.init($('#'+name+'-chart'),null,{renderer:'svg'});
const axis={axisLine:{lineStyle:{color:'#ffffff25'}},axisTick:{show:false},axisLabel:{color:'#a3a8ad',fontFamily:mono,fontSize:10},splitLine:{lineStyle:{color:'#ffffff0b'}}};
const tooltip={backgroundColor:'#121216',borderColor:'#ffffff30',textStyle:{color:'#f2f2ed',fontFamily:mono,fontSize:11},extraCssText:'box-shadow:0 12px 30px #0008;max-width:340px;white-space:normal'};
const base={animationDuration:450,textStyle:{fontFamily:mono,color:'#a3a8ad'},tooltip,grid:{top:38,bottom:34,left:84,right:34},legend:{textStyle:{color:'#a3a8ad',fontFamily:mono,fontSize:10},top:3},aria:{enabled:true}};
const ref=m=>m.group==='reference'?' · ref':'';
$('#results-table tbody').innerHTML=M.map(m=>`<tr class="${m.group==='reference'?'ref-row':''}"><td><div class="model-cell" style="--c:${m.color}"><img src="${m.badge}" alt=""><div><b>${esc(m.name)}</b><small>${esc(m.config.instruction_variant)}${m.group==='reference'?' · reference':''}</small></div></div></td><td>${fmt(m.means.core)}%</td><td>${fmt(m.means.hard)}%</td><td>${fmt(m.means.combined)}%</td><td>${time(m.means.wall_seconds)}</td><td>${fmt(m.native_timing.tg)}</td><td>${fmt(m.native_timing.pp)}</td></tr>`).join('');

function render(){
 const models=selected(),names=models.map(m=>m.short+ref(m));
 chart.quality.setOption({...base,grid:{top:46,bottom:57,left:40,right:10},xAxis:{...axis,type:'category',data:names,axisLabel:{...axis.axisLabel,rotate:20}},yAxis:{...axis,type:'value',min:0,max:100},tooltip:{...tooltip,trigger:'axis'},series:[['Core 69','core','#39d0ff'],['Hard 15','hard','#ff9858'],['Combined','combined','#f2f2ed']].map(([name,k,color])=>({name,type:'bar',color,itemStyle:{color},barMaxWidth:17,data:models.map(m=>({value:m.means[k],itemStyle:{color,borderColor:m.group==='reference'?m.color:color,borderType:m.group==='reference'?'dashed':'solid',borderWidth:m.group==='reference'?1:0,opacity:m.group==='reference'?.65:1}}))}))},true);
 const walls=models.map(m=>[m.short+ref(m),m.means.wall_seconds/60,Math.min(...m.passes.map(p=>p.wall_seconds))/60,Math.max(...m.passes.map(p=>p.wall_seconds))/60]);
 chart.wall.setOption({...base,grid:{top:25,bottom:32,left:95,right:62},xAxis:{...axis,type:'value',name:'min',nameTextStyle:{fontSize:10}},yAxis:{...axis,type:'category',data:names,inverse:true},series:[{type:'custom',data:walls.map((w,i)=>[w[1],i,w[2],w[3]]),renderItem:(params,api)=>{const i=api.value(1),a=api.coord([api.value(2),i]),b=api.coord([api.value(3),i]),c=api.coord([api.value(0),i]),color=models[i].color;return {type:'group',children:[{type:'line',shape:{x1:a[0],y1:a[1],x2:b[0],y2:b[1]},style:{stroke:color,lineWidth:3,lineDash:models[i].group==='reference'?[4,3]:null}},{type:'circle',shape:{cx:c[0],cy:c[1],r:6},style:{fill:color,stroke:'#111114',lineWidth:2}},{type:'text',style:{x:b[0]+12,y:b[1],text:api.value(0).toFixed(2),fill:'#f2f2ed',font:`11px ${mono}`,verticalAlign:'middle'}}]};}}],tooltip:{...tooltip,formatter:p=>{const m=models[p.data[1]];return `<b>${esc(m.name)}</b><br>Mean ${time(m.means.wall_seconds)}<br>Range ${time(Math.min(...m.passes.map(p=>p.wall_seconds)))} – ${time(Math.max(...m.passes.map(p=>p.wall_seconds)))}`;}}},true);
 const metric=$('#pass-metric').value;
 chart.passes.setOption({...base,grid:{top:65,bottom:32,left:40,right:20},xAxis:{...axis,type:'category',data:['Pass 1','Pass 2','Pass 3','Pass 4','Pass 5'],boundaryGap:false},yAxis:{...axis,type:'value',min:metric==='hard'?50:75,max:100},tooltip:{...tooltip,trigger:'axis',valueFormatter:v=>fmt(v)+'%'},series:models.map(m=>({name:m.short+ref(m),type:'line',symbol:m.group==='reference'?'diamond':'circle',symbolSize:7,data:m.passes.map(p=>p[metric]),lineStyle:{color:m.color,width:2,type:m.group==='reference'?'dashed':'solid'},itemStyle:{color:m.color}}))},true);
 chart.tradeoff.setOption({...base,legend:{show:false},grid:{top:25,bottom:38,left:46,right:80},xAxis:{...axis,type:'value',min:10,max:24,name:'suite min',nameTextStyle:{fontSize:10}},yAxis:{...axis,type:'value',min:80,max:90,name:'score %',nameTextStyle:{fontSize:10}},series:models.map(m=>({name:m.short,type:'scatter',symbol:m.group==='reference'?'diamond':'circle',symbolSize:14,itemStyle:{color:m.color},label:{show:true,formatter:m.short+ref(m),position:m.id==='api'?'bottom':'right',fontFamily:mono,fontSize:10,color:m.color},data:[[m.means.wall_seconds/60,m.means.combined]]})),tooltip:{...tooltip,formatter:p=>`<b>${esc(p.seriesName)}</b><br>${fmt(p.value[1])}% combined<br>${fmt(p.value[0])} minutes`}},true);
 for(const k of ['tg','pp']){
  const ms=models.filter(m=>m.native_timing[k]!=null);
  chart[k].setOption({...base,grid:{top:18,bottom:35,left:97,right:64},xAxis:{...axis,type:'value',name:'tok/s',nameTextStyle:{fontSize:10}},yAxis:{...axis,type:'category',data:ms.map(m=>m.short+ref(m)),inverse:true},series:[{type:'bar',barMaxWidth:16,label:{show:true,position:'right',color:'#f2f2ed',fontSize:11,formatter:p=>fmt(p.value,k==='pp'?1:2)},data:ms.map(m=>({value:m.native_timing[k],itemStyle:{color:m.color,borderRadius:[0,3,3,0],opacity:m.group==='reference'?.65:1,borderType:m.group==='reference'?'dashed':'solid',borderWidth:m.group==='reference'?1:0,borderColor:m.color}}))}],tooltip:{...tooltip,trigger:'axis',valueFormatter:v=>fmt(v)+' tok/s'},graphic:ms.length?[]:[{type:'text',left:'center',top:'middle',style:{text:'Native timing unavailable',fill:'#a3a8ad',font:`12px ${mono}`}}]},true);
 }
 const cats=M[0].passes[0].categories;
 chart.categories.setOption({...base,grid:{top:20,bottom:62,left:98,right:16},xAxis:{...axis,type:'category',data:cats.map(c=>c.id),splitArea:{show:false}},yAxis:{...axis,type:'category',data:names,inverse:true},visualMap:{min:0,max:100,calculable:false,orient:'horizontal',left:'center',bottom:0,itemWidth:12,itemHeight:140,inRange:{color:['#592330','#6f5850','#478f7f','#20d1a2']},textStyle:{color:'#a3a8ad',fontSize:10},text:['100%','0%']},series:[{type:'heatmap',data:models.flatMap((m,i)=>cats.map((c,j)=>[j,i,m.passes.reduce((s,p)=>s+p.categories[j].score,0)/5])),label:{show:true,color:'#fff',fontSize:10,formatter:p=>Math.round(p.value[2])},itemStyle:{borderWidth:3,borderColor:'#111114'},emphasis:{itemStyle:{borderColor:'#fff',borderWidth:1}}}],tooltip:{...tooltip,formatter:p=>`<b>${esc(models[p.value[1]].name)}</b><br>${esc(cats[p.value[0]].label)}<br>${fmt(p.value[2])}%`}},true);
}
$('#pass-metric').addEventListener('change',render);
document.querySelectorAll('.chart-filters button').forEach(b=>b.addEventListener('click',()=>{group=b.dataset.group;document.querySelectorAll('.chart-filters button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
let caseIndex=0;
$('#case-model').innerHTML=M.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
function cases(){
 const m=M.find(x=>x.id===$('#case-model').value);
 $('#case-grid').innerHTML=m.passes[0].tasks.map((t,i)=>{const pts=m.passes.reduce((s,p)=>s+p.tasks[i].points,0)/5,col=pts===2?'#20d1a2':pts===0?'#ff4e5f':'#f6c046';return `<button class="case-tile" data-index="${i}" aria-pressed="${i===caseIndex}" aria-label="${esc(t.id+' '+t.title)}" title="${esc(t.title)}" style="--case-color:${col}">${t.id}<small>${fmt(pts,1)}/2</small></button>`;}).join('');
 const t=m.passes[0].tasks[caseIndex];
 $('#case-detail').innerHTML=`<h3>${esc(t.id)} · ${esc(t.title)}</h3><div class="case-outcomes">${m.passes.map(p=>{const c=p.tasks[caseIndex];return `<div style="--c:${verdictColor[c.status]}"><b>Pass ${p.number}</b><small>${esc(c.status)} · ${c.points}/2</small><span>${fmt(c.seconds)} s</span><small>${c.tools} tool calls · ${c.turns} turns</small></div>`;}).join('')}</div>`;
}
$('#case-model').addEventListener('change',cases);
$('#case-grid').addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;caseIndex=+b.dataset.index;cases();});
const fact=(k,v)=>`<div><dt>${esc(k)}</dt><dd>${esc(v??'Provider managed / not exposed')}</dd></div>`;
$('#config-ledger').innerHTML=M.map(m=>{
 const c=m.config,card=c.model_card||{},sampler=c.sampler_card||{},s=c.sampler;
 const facts=[['Weights',m.quant],['Runtime',m.runtime],['Runtime libraries',m.library],['Speculation',m.mtp],['KV cache',m.kv],['Batch / microbatch',m.batch],['Cache',m.cache],['Context',m.id==='api'?'262,144 evaluation · 1,000,000 provider capacity':'262,144 tokens'],['Tool instruction variant',c.instruction_variant],['Template',m.id==='api'?'Provider managed':m.id==='gufo'?'Native Qwen renderer':m.id==='halogen'?'Pinned image Qwen tokenizer':'Native Qwen / Jinja'],['Output',c.output_policy],['Sampling source',c.sampler_source]];
 const sampling=Object.entries(s).map(([k,v])=>`${k}=${v}`).join(' · ');
 const pins={weight_revision:c.weight_revision,runtime_revision:c.runtime_revision,executable_sha256:c.executable_sha256,image:c.image,image_digest:c.image_digest,chat_template_sha256:c.chat_template_sha256,weights:c.weights,libraries:c.libraries,engine_info:c.engine_info};
 Object.keys(pins).forEach(k=>pins[k]==null&&delete pins[k]);
 return `<details class="config-card" style="--c:${m.color}" ${m.id==='ciru'?'open':''}><summary><img src="${m.badge}" alt=""><div><b>${esc(m.name)}</b><small>${esc(m.quant)} · ${esc(m.runtime)}</small></div></summary><div class="config-body"><dl class="config-facts">${facts.map(([k,v])=>fact(k,v)).join('')}</dl><div class="config-links">${card.url?`<a href="${esc(card.url)}" target="_blank" rel="noopener">Pinned model card ↗</a>`:''}${sampler.url?`<a href="${esc(sampler.url)}" target="_blank" rel="noopener">Sampler card ↗</a>`:sampler.repo?`<a href="https://huggingface.co/${esc(sampler.repo)}/blob/${esc(sampler.revision)}/README.md" target="_blank" rel="noopener">Pinned sampler card ↗</a>`:''}${m.id==='strata'?'<a href="https://github.com/Niko1221/Strata/releases/tag/v0.1.40" target="_blank" rel="noopener">Strata release ↗</a>':''}${m.id==='api'?'<a href="https://docs.qwencloud.com/developer-guides/getting-started/latest-model" target="_blank" rel="noopener">Official hosted guide ↗</a>':''}</div><div class="config-code-label">EFFECTIVE REQUEST SAMPLER · SEEDS 123–127</div><pre>${esc(sampling)}</pre>${c.server_flags.length?`<div class="config-code-label">SERVING ARGUMENTS · ARTIFACT NAMES SHOWN</div><pre>${esc(c.server_flags.join(' '))}</pre>`:''}${Object.keys(c.environment).length?`<div class="config-code-label">RUNTIME ENVIRONMENT</div><pre>${esc(JSON.stringify(c.environment,null,2))}</pre>`:''}<div class="config-code-label">PINNED IDENTITIES</div><pre>${esc(JSON.stringify(pins,null,2))}</pre></div></details>`;
}).join('');
render();cases();
new ResizeObserver(()=>Object.values(chart).forEach(c=>c.resize())).observe($('main'));
window.addEventListener('resize',()=>Object.values(chart).forEach(c=>c.resize()));
})();
