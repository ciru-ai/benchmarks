// The station and its waters are drawn in layers, like plates in a maritime engraving.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const horizon = .205;

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function trace(ctx, points, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (close) ctx.closePath();
  }

  function shape(ctx, points, fill, stroke, width = 1) {
    trace(ctx, points, true);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function line(ctx, points, color, width = 1) {
    trace(ctx, points);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function glow(ctx, x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function dot(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function radialEllipse(ctx, x, y, rx, ry, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    glow(ctx, 0, 0, rx, color);
    ctx.restore();
  }

  function strata(ctx, polygon, rng, colors, amount, slope = -.3) {
    const xs = polygon.map(p => p[0]);
    const ys = polygon.map(p => p[1]);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const w = Math.max(...xs) - left;
    const h = Math.max(...ys) - top;
    ctx.save();
    trace(ctx, polygon, true);
    ctx.clip();
    for (let i = 0; i < amount; i++) {
      const x = left + rng() * (w + 10) - 6;
      const y = top + rng() * (h + 7);
      const len = (2 + rng() ** 2 * 22);
      line(ctx, [[x, y], [x + len * .56, y + len * slope * .55 + rng() * .8], [x + len, y + len * slope]], colors[i % colors.length], .4 + rng() * .45);
    }
    ctx.restore();
  }

  function seaSky(ctx, w, h, day) {
    const rng = random(41711);
    const waterline = h * horizon;
    const sky = ctx.createLinearGradient(0, 0, 0, waterline * 1.08);
    const skyColors = day ? ['#3B5368', '#617688', '#a3aaa4'] : ['#07131F', '#0c1d2b', '#203547'];
    skyColors.forEach((c, i) => sky.addColorStop(i / 2, c));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, waterline + 2);

    const water = ctx.createLinearGradient(0, waterline, w * .08, h);
    const waterColors = day ? ['#5a737f', '#415f70', '#324d5c', '#263e4c'] : ['#122c3a', '#0e2636', '#0b202e', '#081925'];
    waterColors.forEach((c, i) => water.addColorStop(i / 3, c));
    ctx.fillStyle = water;
    ctx.fillRect(0, waterline, w, h - waterline);

    const mx = w * .815, my = h * .091;
    const moonSize = Math.max(6.5, Math.min(13.5, h * .015));
    if (!day) {
      radialEllipse(ctx, mx - w * .01, my + 5, w * .29, waterline * .91, 'rgba(74,100,119,.21)');
      for (let i = 0; i < Math.max(55, w * .15); i++) {
        const x = rng() * w, y = rng() * waterline * .85;
        const r = rng() ** 3 * .65 + .2;
        dot(ctx, x, y, r, 'rgba(184,203,205,' + (.11 + rng() ** 2 * .48) + ')');
        if (r > .81 && rng() < .29) {
          line(ctx, [[x - 1.7, y], [x + 1.7, y]], 'rgba(152,184,189,.26)', .5);
        }
      }
      glow(ctx, mx, my, moonSize * 5.3, 'rgba(214,209,162,.065)');
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-.48);
      ctx.scale(moonSize, moonSize);
      ctx.beginPath();
      ctx.moveTo(.3, -.96);
      ctx.bezierCurveTo(-1.2, -.64, -1.17, .9, .13, 1.04);
      ctx.bezierCurveTo(.62, 1.08, .91, .84, 1, .66);
      ctx.bezierCurveTo(-.12, 1.02, -.68, -.18, .3, -.96);
      ctx.fillStyle = '#d5d6bb';
      ctx.fill();
      ctx.restore();
    }

    // Scud at the horizon consists of flat ribbons of differently shaded air.
    for (let i = 0; i < 88; i++) {
      const x = (rng() * 1.25 - .15) * w;
      const y = waterline * (.22 + rng() ** .56 * .74);
      const length = w * (.017 + rng() ** 2 * .19);
      const height = .4 + rng() * h * .0045;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * .24, y - height * .15, x + length * .48, y - height * 1.6, x + length * .59, y - height);
      ctx.bezierCurveTo(x + length * .73, y - height * .9, x + length * .85, y - height * .1, x + length, y);
      ctx.quadraticCurveTo(x + length * .46, y + height * .32, x, y);
      ctx.fillStyle = day ? 'rgba(208,200,176,.065)' : i % 4 === 0 ? 'rgba(105,130,144,.11)' : 'rgba(7,19,31,.24)';
      ctx.fill();
    }

    for (let i = 0; i < 30; i++) {
      const x = rng() * w;
      const y = waterline - h * (.002 + rng() * .024);
      line(ctx, [[x, y], [x + w * .055 * rng(), y - .3]], day ? 'rgba(219,210,190,.18)' : 'rgba(103,135,147,.16)', .55);
    }

    // Far headlands have eroded cliff faces and a barely visible line of surf.
    const ranges = [
      {points: [[-.03,.187],[.006,.181],[.038,.184],[.066,.16],[.095,.162],[.116,.172],[.144,.176],[.164,.192],[.19,.19],[.235,.203],[.251,.206]], near: false},
      {points: [[-.02,.163],[.012,.17],[.033,.165],[.054,.177],[.076,.181],[.08,.192],[.107,.194],[.124,.2],[.158,.206]], near: true},
      {points: [[.707,.204],[.737,.198],[.754,.184],[.777,.186],[.794,.172],[.83,.166],[.846,.149],[.878,.145],[.898,.154],[.934,.159],[.956,.147],[.998,.142],[1.02,.15]], near: false},
      {points: [[.816,.206],[.849,.197],[.872,.198],[.889,.187],[.913,.185],[.93,.16],[.948,.163],[.964,.153],[.984,.158],[1.02,.142]], near: true}
    ];
    for (const range of ranges) {
      const p = [];
      const pts = range.points;
      for (let k = 0; k < pts.length - 1; k++) {
        const [a,b] = [pts[k],pts[k+1]];
        const steps = Math.max(2, Math.floor(Math.abs(b[0]-a[0])*w / 5.2));
        for (let j=0; j<steps; j++) {
          const t = j/steps;
          p.push([(a[0]+(b[0]-a[0])*t)*w,(a[1]+(b[1]-a[1])*t)*h + (rng()-.5)*1.7]);
        }
      }
      const last = pts[pts.length-1];
      p.push([last[0]*w,last[1]*h], [last[0]*w,waterline + 1.2], [pts[0][0]*w,waterline+1.3]);
      shape(ctx,p,day ? (range.near?'#405665':'#5a6e78') : (range.near?'#0a1c2a':'#172b3b'));
      strata(ctx,p,rng,day?['rgba(198,205,192,.18)']:['rgba(89,117,132,.17)','rgba(3,13,22,.28)'],range.near?76:53,-1.5);
      line(ctx, p.slice(0,-2), day?'rgba(187,197,184,.25)':'rgba(74,102,114,.29)',.55);
    }
    for (let i=0; i<25; i++) {
      const x = (rng() > .52 ? rng() * .15 : .84 + rng() * .18)*w;
      const y = waterline + rng()*2;
      line(ctx,[[x,y],[x + 2+rng()*21,y]],day?'rgba(195,210,200,.23)':'rgba(89,118,131,.25)',.6);
    }

    // Thin, low water bands break the uniformity of the open sea.
    for (let i = 0; i < 53; i++) {
      const x = (rng() * 1.25 - .16) * w, u = rng() ** 1.3;
      const y = waterline + u * (h - waterline);
      const bandWidth = (.09 + rng() * .43) * w;
      const bandH = (.002 + .008 * u) * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + bandWidth*.32,y-bandH*.22,x+bandWidth*.65,y-bandH*1.2,x+bandWidth,y-bandH*.5);
      ctx.bezierCurveTo(x+bandWidth*.6,y-bandH*.6,x+bandWidth*.45,y+bandH*.4,x,y);
      ctx.fillStyle = day ? 'rgba(150,183,176,.045)' : i % 3 ? 'rgba(56,91,108,.065)' : 'rgba(3,12,24,.095)';
      ctx.fill();
    }

    // Ink grain is permanently attached to the paper, including behind the sea.
    for (let i = 0, n = Math.min(105000, Math.floor(w*h*.085)); i < n; i++) {
      const shade = i % 5 ? 'rgba(165,186,188,.045)' : 'rgba(1,6,13,.125)';
      ctx.fillStyle = shade;
      ctx.fillRect(rng()*w,rng()*h,.45+rng()*.7,.45+rng()*.7);
    }
  }

  function buildWavePlate(ctx, w, h, layer, lit, day) {
    const rng = random(191713 + layer * 2521);
    const horizonY = h * horizon + 1;
    const count = Math.max(285, Math.min(1150, w * h / 780));
    for (let i=0; i<count; i++) {
      const depth = rng() ** 1.27;
      const x = -36 + rng()*(w + 72);
      const y = horizonY + depth*(h-horizonY+10);
      const waveScale = .38 + depth * .95;
      const length = (4 + rng() ** 1.6 * 44) * waveScale * Math.min(1.15, w/800 + .35);
      const height = (rng()*.84 + .19)*(.3+depth*1.33);
      const a = (lit ? .12 : .08) + rng() ** 1.5 * (lit ? .46 : .21);
      ctx.strokeStyle = lit ? 'rgba(226,219,161,'+a+')' : day ? 'rgba(181,208,201,'+ a +')' : 'rgba(76,119,137,' + a + ')';
      ctx.lineWidth = .37 + waveScale * rng() * .53;
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.bezierCurveTo(x+length*.18,y+height*.2,x+length*.19,y-height*.85,x+length*.34,y-height);
      ctx.bezierCurveTo(x+length*.49,y-height*1.28,x+length*.58,y-height*.19,x+length*.73,y-height*.42);
      ctx.quadraticCurveTo(x+length*.85,y-height*.36,x+length,y-height*.64);
      ctx.stroke();
      if (rng() < .52) {
        const start = x+length*(.2+rng()*.22), yy = y+.3+waveScale*(.6+rng()*.7);
        line(ctx,[[start,yy],[start+length*.22,yy-height*.42],[start+length*.42,yy-height*.32]],
          lit?'rgba(232,225,173,.16)':day?'rgba(13,39,55,.15)':'rgba(0,9,17,.38)',.54 + waveScale * .32);
      }
      if (rng() < .11 && depth>.12) {
        line(ctx,[[x+length+1.8,y-height],[x+length+3.5+rng()*4,y-height*.78]],lit?'rgba(231,225,182,.25)':day?'rgba(159,184,177,.35)':'rgba(76,115,129,.27)',.63);
      }
    }
  }

  function engravedWater(ctx,w,h,lit,day,portrait) {
    const rng=random(683912);
    const tone = (a) => lit ? 'rgba(244,230,163,'+a*.94+')' : day ? 'rgba(166,201,195,'+a+')' : 'rgba(106,151,160,'+a+')';
    // Each oblique swell has a long taper, a small shoulder and a trailing echo.
    function swell(x,y,length,rise,opacity) {
      const shoulder=.54+rng()*.23;
      const end = rise*(rng()*.4-.05);
      const dx=(t) => length*t;
      const dy=(t) => -rise*Math.sin(Math.PI*Math.min(1,t/shoulder)*.54)**2*Math.sin(Math.PI*t)**1.4 + end*t;
      const offsets = [0,1.28,2.48,4.25,6.4];
      const rows = 2+Math.floor(rng()**1.2*4);
      for (let j=0;j<rows;j++) {
        const start=j ? rng()*.38+j*.017 : 0, stop=j ? .52+rng()*(.49-j*.019) : 1;
        const thick = (j ? .35+rng()*.31 : .53+rng()*.67)*Math.max(.6,Math.min(1.16,h/660));
        ctx.beginPath();
        for(let k=0;k<=18;k++) {
          const t=start+(stop-start)*k/18, bob=(offsets[j]||8)*(1-t*.4);
          const xx=x+dx(t), yy=y+dy(t)+bob+Math.sin(t*8+j*.28)*Math.sin(t*Math.PI)*.55;
          if(!k)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
        }
        ctx.strokeStyle=tone(opacity*(j?.38:1));ctx.lineWidth=thick;ctx.stroke();
      }
      if (rng()<.52) {
        const start=.28+rng()*.21, stop=start+.07+rng()*.17;
        ctx.beginPath();
        for(let k=0;k<10;k++){
          const t=start+(stop-start)*k/9;
          const xx=x+dx(t), yy=y+dy(t)-.52+Math.sin(t*34)*.47;
          if(k===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
        }
        ctx.lineWidth=.7+rng()*.55;ctx.strokeStyle=tone(opacity*1.46);ctx.stroke();
        for(let k=0;k<7;k++) {
          const t=start+(stop-start)*rng();
          dot(ctx,x+dx(t)+rng()*1.6,y+dy(t)-1.0-rng()*1.9,.19+rng()*.35,tone(opacity*1.65));
        }
      }
    }

    const clusters=Math.max(56,Math.min(170,Math.round(w*h/5800)));
    for(let i=0;i<clusters;i++){
      const depth = rng()**.54, u = rng()*1.12-.08;
      const y = h*(.29+depth*.74);
      const len = (.031+rng()**1.5*.126)*w*(.46+depth*.63);
      swell(w*u, y, len, (.8+rng()**1.15*5.7)*depth, (.08+rng()*.17)*depth);
    }

    // Wash sweeps around the lee of the island and the two stone harbour arms.
    const lx=w*(portrait?.47:.31),ly=h*(portrait?.735:.705);
    const ss=Math.min(h*(portrait?.00139:.00146),w*(portrait?.00215:.00149),1.65);
    ctx.save();ctx.translate(lx,ly);ctx.scale(ss,ss);
    for(let i=0;i<54;i++){
      const right = i%2;
      const x=right? 53+rng()**.8*140 : -206+rng()*127;
      const y=135+rng()*56 + Math.sin(x*.046)*3;
      const len=(9+rng()**1.32*51)*(1-Math.min(.33,Math.abs(x)*.0009));
      swell(x,y,len,1.3+rng()*2.9,.15+rng()*.22);
    }
    for(let k=0;k<6;k++){
      const start=-157-rng()*16, end=135+rng()*22, y=153+k*4.6;
      ctx.beginPath();
      let drawing=false;
      for(let j=0;j<=120;j++){
        if(rng()<.044) drawing=false;
        const t=j/120, x=start+(end-start)*t;
        const yy=y+Math.sin(t*Math.PI)*21+Math.sin(t*24+k*.4)*1.65 + Math.sin(t*76)*.41;
        if(!drawing){ctx.moveTo(x,yy);drawing=true;}else ctx.lineTo(x,yy);
      }
      ctx.lineWidth=.52+k*.035;
      ctx.strokeStyle=tone(.15-k*.014);ctx.stroke();
    }
    ctx.restore();
    for(let k=0;k<14;k++) swell(w*(rng()*.145-.05), h*(.83+rng()*.1), (12+rng()*43)*Math.min(1.3,h/690),.7+rng()*2.2,.12+rng()*.2);

    if(lit || day) return;
    // The moon's silver is broken into ripples, broadening as it nears the eye.
    const cx=.815*w, hy=h*horizon;
    radialEllipse(ctx,cx,hy+h*.021,w*.068,h*.034,'rgba(167,189,181,.068)');
    for(let i=0;i<520;i++) {
      const d = rng()**2.0, v=rng()+rng()+rng()-1.5;
      const x = cx + v*w*(.015+d*.067)+Math.sin(d*9)*w*.004;
      const y = hy+2+d*h*.35;
      const len = (.5+rng()**2*13)*(.87+d*.85);
      const weight=(1-d)**1.9*Math.max(0,1-Math.abs(v)/1.6);
      line(ctx,[[x,y],[x+len*.36,y-.27],[x+len*.67,y-.12],[x+len,y-.47]],
        'rgba(170,191,181,'+((.07+rng()*.34)*weight)+')',.4+rng()*.35);
    }
  }

  function surf(ctx, x, y, rx, ry, seed, intensity=1) {
    const rng = random(seed);
    ctx.save();
    ctx.translate(x,y);
    for (let ring=0; ring<4; ring++) {
      const span = 23 + ring*3;
      for (let j=0; j<span; j++) {
        if (rng() < .24) continue;
        const angle = (j + rng()*.42)*TAU/span;
        const length = (.16 + rng()*.72)*TAU/span;
        const u = rx + ring*(2.7+rx*.012);
        const v = ry + ring*(.8+ry*.018);
        ctx.beginPath();
        for (let k=0;k<7;k++) {
          const a = angle + length*k/6;
          const dx = Math.cos(a)*(u + Math.sin(a*7+.8)*rx*.055) + (rng()-.5)*2;
          const dy = Math.sin(a)*(v + Math.cos(a*9)*ry*.075) + (rng()-.5)*.9;
          if (!k) ctx.moveTo(dx,dy); else ctx.lineTo(dx,dy);
        }
        ctx.strokeStyle = 'rgba(134,169,167,'+((.16 + rng()*.28)*(1-ring*.14)*intensity)+')';
        ctx.lineWidth = .46 + rng()*.76;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function stone(ctx, x, y, w, h, seed, light = 1) {
    const r = random(seed);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate((r()-.5)*.25);
    if (r()>.63) ctx.scale(-1,1);
    const left = [-w*(.49+r()*.09), h*(r()-.42)*.24];
    const baseL = [-w*(.26+r()*.2),h*(.23+r()*.19)];
    const foot = [w*(r()*.49-.18),h*(.34+r()*.27)];
    const baseR = [w*(.34+r()*.19),h*(.16+r()*.19)];
    const right = [w*(.45+r()*.12),h*(r()-.65)*.26];
    const ridge = [w*(r()*.47-.12),-h*(.29+r()*.29)];
    const back = [-w*(.10+r()*.21),-h*(.22+r()*.23)];
    const topL = [-w*(.32+r()*.16),-h*(.10+r()*.19)];
    const knuckle = [w*(r()*.42-.25),h*(r()*.25-.13)];
    shape(ctx,[left,topL,back,ridge,right,baseR,foot,baseL], '#101f27', '#09151e', .95);
    const pick = (a,b) => light > .8 ? a : b;
    const top = [left,topL,back,ridge,[w*.23,-h*.17],knuckle];
    const faceLeft = [left,knuckle,foot,baseL];
    const faceMain = [knuckle,[w*.23,-h*.17],ridge,right,baseR,foot];
    shape(ctx,top,pick('#58615b','#3d4948'));
    shape(ctx,faceLeft,pick('#36454a','#27383d'));
    shape(ctx,faceMain,pick('#28383e','#202f36'));
    shape(ctx,[ridge,[w*.36,-h*.18],right,baseR,[w*.27,h*.13]], pick('#435052','#344348'));
    strata(ctx,top,r,['rgba(195,182,139,.46)','rgba(18,36,40,.55)'],Math.max(8,w*.8),-.18);
    strata(ctx,faceLeft,r,['rgba(134,151,143,.33)','rgba(9,24,30,.59)'],w*.85,-.67);
    strata(ctx,faceMain,r,['rgba(142,151,140,.27)','rgba(8,22,31,.68)'],w*1.37,-1.14);
    line(ctx,[topL,back,ridge,[w*.25,-h*.25]],'rgba(169,170,146,.53)',.7);
    line(ctx,[left,knuckle,[w*.23,-h*.17]],'rgba(155,157,133,.39)',.72);
    line(ctx,[[w*.23,-h*.17],[w*.14,h*.07],[w*.18,h*.13],foot],'rgba(9,23,30,.78)',1);
    if (w>20) {
      line(ctx,[[w*.17,-h*.32],[w*.04,-h*.16],[-w*.03,-h*.18],[-w*.15,-h*.06]],'#324342',.8);
      line(ctx,[[-w*.25,h*.21],[-w*.12,h*.17],[-w*.08,h*.21],[-w*.15,h*.35]],'#1c2e35',.8);
    }
    ctx.restore();
  }

  function island(ctx) {
    const rng = random(83939);
    radialEllipse(ctx, 3, 151, 159, 25, 'rgba(0,9,16,.57)');
    surf(ctx, 4, 143, 137, 24, 5721);
    const base = [[-136,143],[-128,137],[-118,137],[-112,125],[-95,121],[-89,114],[-69,111],[-62,104],[-35,102],[-28,95],[-10,94],[12,93],[21,97],[41,93],[58,101],[68,99],[76,108],[88,110],[95,116],[110,117],[115,126],[128,130],[133,140],[146,144],[142,149],[130,151],[122,157],[97,156],[76,163],[66,163],[53,168],[31,167],[23,172],[1,170],[-23,174],[-42,169],[-64,169],[-74,162],[-94,163],[-99,158],[-115,155],[-124,151],[-137,148]];
    shape(ctx,base,'#26383d','#091a24',1.3);
    // The low ridge is broken into tilted strata and overlapping granite slabs.
    const crest = [[-130,141],[-108,127],[-89,119],[-72,115],[-63,108],[-39,106],[-23,99],[14,97],[33,99],[44,98],[63,104],[78,112],[94,116],[113,124],[125,138],[91,136],[62,133],[38,133],[18,125],[-13,132],[-34,125],[-59,133],[-86,132],[-106,140]];
    shape(ctx,crest,'#4e5951');
    strata(ctx,crest,rng,['#657064','#34463f','rgba(169,164,125,.53)'],840,-.18);
    // A single folded rock face runs across the island. Its faults continue
    // from the sunward shelf down to the dark, undercut bed at the waterline.
    const ridge=[[-137,144],[-116,137],[-99,124],[-83,127],[-62,118],[-39,122],[-24,115],[-8,109],[13,115],[24,125],[43,112],[61,119],[82,131],[100,125],[121,135],[143,145]];
    const toe=[[-135,148],[-120,151],[-110,157],[-94,158],[-79,163],[-54,163],[-35,170],[-21,169],[2,169],[15,165],[30,168],[52,164],[67,161],[91,158],[112,156],[142,149]];
    const shale=['#344449','#435251','#2e4044','#3c4b4b','#48544e','#34464a','#414e4c','#4b5550','#2e4146','#42504d','#46524e','#37494a','#3c4c4d','#35484b','#37494a'];
    for(let i=0;i<ridge.length-1;i++){
      const a=ridge[i],b=ridge[i+1],c=toe[i+1],d=toe[i];
      const face=[a,b,c,d], lip=[(a[0]+b[0])*.5+3,(a[1]+b[1])*.5+1.7-rng()*3];
      shape(ctx,face,shale[i]);
      const bend=[b[0]+(c[0]-b[0])*(.33+rng()*.33)+1+rng()*4,(b[1]+c[1])*.5];
      shape(ctx,[lip,b,bend,c,[c[0]-2.5,c[1]-3]],i%3 ? 'rgba(10,30,36,.23)' : 'rgba(139,148,130,.13)');
      strata(ctx,face,rng,['rgba(15,33,38,.68)','rgba(151,159,141,.31)','rgba(95,115,110,.65)'],Math.ceil((Math.abs(a[0]-b[0])+Math.abs(a[1]-d[1]))*2.2),-.83-rng()*1.25);
      line(ctx,[a,lip,b],'rgba(164,166,139,.63)',.7+rng()*.44);
      line(ctx,[b,bend,[bend[0]-2,bend[1]+3],c],'rgba(15,32,37,.78)',.8+rng()*.93);
      line(ctx,[[b[0]+1,b[1]+1],[bend[0]+.8,bend[1]-1]],'rgba(153,157,136,.40)',.65);
      line(ctx,[d,[d[0]+(c[0]-d[0])*.35,d[1]+2],c],'rgba(7,23,29,.61)',2.5);
    }
    const shelf=[[-123,137],[-98,122],[-72,111],[-36,104],[-14,97],[20,96],[50,100],[80,114],[109,121],[135,141],...ridge.slice().reverse()];
    shape(ctx,shelf,'#566050');
    strata(ctx,shelf,rng,['rgba(163,164,130,.48)','#3f5048','rgba(100,116,97,.74)'],650,-.22);
    line(ctx,ridge,'rgba(171,171,141,.58)',.83);
    // Bedding planes cross the individual vertical fractures in uneven ledges.
    ctx.save();trace(ctx,[...ridge,...toe.slice().reverse()],true);ctx.clip();
    for(let band=0;band<11;band++){
      const yy=121+band*4.1,phase=rng()*TAU;
      const p=[];
      for(let xx=-145;xx<150;xx+=3+rng()*7){
        p.push([xx,yy+Math.sin(xx*.035+phase)*1.9-xx*.057+Math.sin(xx*.16)*.82]);
      }
      line(ctx,p,band%3?'rgba(13,31,34,.34)':'rgba(140,149,127,.44)',.5+rng()*.71);
    }
    ctx.restore();
    // Large boulders only interrupt the cliff at its weathered, wave-cut foot.
    [[-121,148,28,14],[-93,152,24,13],[-61,160,36,18],[-30,164,24,11],[5,162,42,21],[38,161,27,18],[91,154,39,18],[123,149,27,15],[-79,125,27,12],[60,122,20,12]].forEach(([x,y,w,h],i)=>stone(ctx,x,y,w,h,138113+i*243,i===8?.9:.65));
    // Wind-combed thrift, grass and dark sod between the outcropping and tower.
    for (let i=0;i<295;i++) {
      const x = (rng()-.5)*162;
      const y = 99 + Math.abs(x)*.225 + rng()*(3+Math.abs(x)*.06);
      const blade = 1+rng()**1.2*4.5;
      line(ctx,[[x,y],[x+blade*.47,y-blade],[x+blade*.88,y-blade*1.16]],
        ['#626958','#293e39','#81826a','#475448'][i%4],.5+rng()*.34);
    }

    const islets = [[-137,152,13,5],[-148,144,13,7],[-126,165,12,6],[-103,168,18,7],[106,165,20,8],[127,160,13,6],[150,147,9,4],[72,177,13,6],[-32,183,13,4]];
    islets.forEach(([x,y,w,h],i)=>{
      surf(ctx,x,y+2,w*.63,h*.45,5019+i,.59);
      stone(ctx,x,y,w,h,5112+i,.58);
    });
    // A flight of uneven steps leads from the keeper's door down to the landing.
    for(let i=0;i<12;i++){
      const x = 24+i*3.4, y = 106+i*.97 + Math.max(0,i-6)*.72;
      line(ctx,[[x-1,y],[x+3.7,y-.4],[x+5.2,y+.1]],'rgba(150,148,126,.63)',.78);
    }
  }

  function keeperHouse(ctx) {
    const front=[[17,86],[42,82],[42,103],[17,107]], side=[[42,82],[58,90],[58,103],[42,103]];
    shape(ctx,front,'#70776b','#1d3036',1);
    shape(ctx,side,'#455251','#1d3036',.8);
    strata(ctx,front,random(43),['rgba(206,199,166,.39)','rgba(25,45,49,.6)'],95,-.12);
    for(let i=0;i<5;i++) line(ctx,[[17.4,89+i*3.1],[42,85.5+i*3.25]],'rgba(29,47,49,.49)',.58);
    shape(ctx,[[14,87],[24,73],[46,70],[43,83]],'#3b4b50','#172b34',1);
    shape(ctx,[[43,83],[46,70],[61,90],[56,90]],'#283940','#162932',1);
    line(ctx,[[23,73],[46,70],[61,90]],'#798274',.9);
    for(let i=0;i<8;i++) line(ctx,[[17+i*3,84-i*.4],[24+i*2.9,74-i*.34]],'#62706d',.65);
    shape(ctx,[[33,73],[33,65],[36.5,64.5],[36.5,72]],'#626a61','#203038',.7);
    line(ctx,[[32.3,65],[37.2,64.4]],'#aaa88e',1.1);
    shape(ctx,[[20,94],[24.1,93.5],[24.1,105.4],[20,106]],'#26393d');
    [[30,93],[37,92],[49,92.7]].forEach(([x,y])=>{
      ctx.fillStyle='#243537';ctx.fillRect(x-1.25,y-1.2,4.85,6.3);
      ctx.fillStyle='#c3ae74';ctx.fillRect(x,y,2.4,3.8);
      line(ctx,[[x-.2,y+2],[x+2.5,y+1.7]],'#4e5446',.66);
    });
  }

  function tower(ctx,daylight = false) {
    const rng = random(21467);
    keeperHouse(ctx);
    const body=[[-10.8,12],[10.7,12],[12.3,40],[15.8,70],[20.4,100],[21.4,104],[19.5,108],[11,110],[-5,111.3],[-18.6,109.3],[-21.1,106],[-18.9,97.5],[-14.9,69],[-12.2,39]];
    const stoneGrad = ctx.createLinearGradient(-22,0,22,0);
    [[0,'#35484c'],[.13,'#6d7a75'],[.33,'#c0bd9f'],[.47,'#d0c6a1'],[.63,'#a7aa92'],[.82,'#737f75'],[1,'#3b4d4f']].forEach(([stop,c])=>stoneGrad.addColorStop(stop,c));
    shape(ctx,body,stoneGrad,'#162730',1.35);
    ctx.save();
    trace(ctx,body,true);
    ctx.clip();

    function belt(yTop,yBottom) {
      const g=ctx.createLinearGradient(-17,0,18,0);
      [[0,'#25383e'],[.3,'#495753'],[.52,'#53615a'],[.83,'#34474a'],[1,'#273a40']].forEach(([stop,c])=>g.addColorStop(stop,c));
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.moveTo(-24,yTop-2);
      ctx.quadraticCurveTo(-1,yTop+4,24,yTop-2);
      ctx.lineTo(24,yBottom-2);
      ctx.quadraticCurveTo(0,yBottom+4,-24,yBottom-2);
      ctx.fill();
      ctx.strokeStyle='rgba(218,208,165,.35)';
      ctx.lineWidth=.66;
      ctx.beginPath();ctx.moveTo(-23,yTop-2);ctx.quadraticCurveTo(0,yTop+4,23,yTop-2);ctx.stroke();
    }
    belt(28,43);
    belt(64.5,83);
    for (let i=0;i<1180;i++) {
      const x = (rng()-.5)*45,y=12+rng()*98;
      ctx.fillStyle=i%3?'rgba(22,39,42,'+(.05+rng()*.23)+')':'rgba(238,226,183,.32)';
      ctx.fillRect(x,y,.25+rng()*.8,.32+rng()*.8);
    }
    // The tiny offset joints follow the round lens-house beneath its whitewash.
    for(let course=0;course<24;course++) {
      const y=14+course*4.05;
      for(let k=0;k<6;k++) {
        const x=-24+k*8+(course%2)*3.9+rng()*1.4;
        const dip=1.2-(x/21)**2*.85;
        line(ctx,[[x,y+dip],[x+2+rng()*5.2,y+dip+.1]],'rgba(36,53,49,.37)',.37+rng()*.25);
        if(rng()<.67) line(ctx,[[x+.6,y+dip],[x+.5,y+dip+2+rng()*1.6]],'rgba(42,55,51,.31)',.49);
      }
    }
    for(let i=0;i<65;i++) {
      const x=10+rng()*13, y=14+rng()*91;
      line(ctx,[[x,y],[x+2.1,y-2.8-rng()*3.8]],'rgba(22,39,43,.36)',.5);
    }
    ctx.restore();
    line(ctx,[[-10.2,14],[-12.4,43],[-15.6,72],[-19.8,101]],'rgba(201,198,164,.65)',.65);
    function cornice(y,rw,deep) {
      ctx.beginPath();ctx.moveTo(-rw,y);ctx.quadraticCurveTo(0,y+3.5,rw,y);
      ctx.lineTo(rw-.3,y+deep);ctx.quadraticCurveTo(0,y+deep+4,-rw+.3,y+deep);ctx.closePath();
      ctx.fillStyle='#495854';ctx.fill();ctx.strokeStyle='#263b3d';ctx.lineWidth=.7;ctx.stroke();
      ctx.strokeStyle='#a4a68e';ctx.beginPath();ctx.moveTo(-rw,y);ctx.quadraticCurveTo(0,y+3.5,rw,y);ctx.stroke();
    }
    cornice(100.8,20.9,2.7);cornice(105.5,22.2,2.5);
    // Narrow, deeply recessed stairside windows.
    [[-2,20,2.5,4.3],[-4.1,49.5,3.4,6.1],[2.8,73.5,3.1,5.1]].forEach(([x,y,w,h],i)=>{
      ctx.fillStyle='#c0b89a';ctx.fillRect(x-.6,y-.6,w+1.4,h+1.4);
      shape(ctx,[[x,y+.8],[x+w*.45,y-.45],[x+w,y+.2],[x+w,y+h],[x,y+h]],'#192c34');
      if(i===1) {ctx.fillStyle='#c4b883';ctx.fillRect(x+.7,y+1.1,.7,2.6);}
      line(ctx,[[x-.7,y+h+.8],[x+w+.9,y+h+.5]],'#687770',.9);
    });
    ctx.fillStyle='#4d5f58';ctx.beginPath();ctx.moveTo(-4.8,108);ctx.lineTo(-4.8,96);ctx.quadraticCurveTo(-1.7,91.4,1.5,95.4);ctx.lineTo(1.5,108);ctx.fill();
    ctx.fillStyle='#263739';ctx.fillRect(-3.8,96.6,4.2,11.6);
    line(ctx,[[-5.3,108.4],[2.5,108.1]],'#a5a48a',.8);

    cornice(12,11.6,3.3);
    shape(ctx,[[-15.8,8.6],[-10.6,9.2],[11,8.8],[15.8,8.1],[12.7,12.1],[7,14],[-8,14.1],[-12.6,12.4]], '#40504e','#1d3037',.86);
    [-11,-6.2,0,6,11].forEach(x=>line(ctx,[[x,9.6],[x*.85,13]],'#a6aa90',.68));
    shape(ctx,[[-15.8,7.9],[-7.4,9.3],[7.6,9.1],[15.8,7.8],[15.6,10],[7.5,11.2],[-7.4,11.3],[-15.8,10]],'#273b41','#162b34',.74);
    line(ctx,[[-15.8,7.8],[-7,9],[8,8.9],[15.8,7.6]],'#acb19b',1.05);

    // The glass lantern has a warm centre and cool leaded panes on either side.
    const glass=ctx.createLinearGradient(-9,0,9,0);
    (daylight ? [[0,'#465963'],[.18,'#71858b'],[.42,'#a3b4b5'],[.58,'#bac6c1'],[.8,'#7b8f93'],[1,'#5b6d74']] : [[0,'#647d76'],[.18,'#a6ac8c'],[.42,'#fae7a8'],[.58,'#fff1b9'],[.8,'#b5af88'],[1,'#627773']]).forEach(([stop,c])=>glass.addColorStop(stop,c));
    shape(ctx,[[-8.8,-6.8],[-3.7,-8.3],[4.5,-8.2],[8.9,-6.8],[8.9,5.9],[4,7],[-4,7],[-8.8,5.8]],glass,'#263a3f',1);
    ctx.fillStyle=daylight?'#b3bdb6':'#eddea3';ctx.fillRect(-2.2,-4,4.5,7.9);
    for(let i=0;i<8;i++) line(ctx,[[-2.6,-3.7+i], [2.9,-3.7+i]], daylight ? (i%2?'#c0c7be':'#8a9a98') : (i%2?'#fff3c6':'#c7b77e'),.38);
    [[-8.5,-6.3,5.5],[-4.2,-7.7,6.8],[4.8,-7.5,6.5],[8.6,-6.1,5.5]].forEach(([x,t,b])=>{line(ctx,[[x,t],[x,b]],'#35474a',1.1);line(ctx,[[x+.55,t],[x+.55,b]],'#d2c8a0',.43);});
    line(ctx,[[-8.5,-1.1],[-4.2,-.4],[4.5,-.4],[8.5,-1.2]],'rgba(81,92,72,.47)',.56);
    shape(ctx,[[-11.7,-7],[-11.3,-8.5],[-8.6,-9.4],[-6.6,-13.4],[-3.8,-15.6],[-.8,-18.2],[1.7,-16.5],[6.4,-13.6],[8.7,-9.7],[11.5,-8.5],[11.5,-7.1],[4.4,-6.5],[-4.4,-6.6]],'#354a50','#122b36',1);
    line(ctx,[[-10.6,-9],[-6.4,-11],[-4.6,-14.7],[-1.2,-17.7]],'#adb29f',.87);
    line(ctx,[[-.7,-17.5],[1.7,-14.4],[4.3,-9.5]],'#738780',.9);
    line(ctx,[[-11.4,-8.2],[-3.2,-7.4],[4.7,-7.4],[11.3,-8.2]],'#a5ada0',.9);
    line(ctx,[[-.8,-17.5],[-.8,-23.7]],'#b4b7a0',.8);dot(ctx,-.8,-20.1,1.08,'#70817d');
    // Gallery railings wrap in front of the lamp and around to its back.
    [-15,-10,-5,0,5,10,15].forEach(x=>{
      const a=1-Math.abs(x)/15;
      line(ctx,[[x,8+.92*a],[x,2.7+.95*a]],'#344e51',.95);
      line(ctx,[[x-.35,2.6+a],[x-.35,7.7+a]],'#9da99c',.45);
    });
    [[2.5,.91],[5.4,.94]].forEach(([y,d])=>line(ctx,[[-15.2,y],[-8.2,y+d*.8],[1,y+d],[8,y+d*.68],[15,y-.1]],'#a1aaa0',.66));
  }

  function harbour(ctx,w,h,portrait) {
    const mouthX=.074*w, mouthY=.827*h;
    const s=Math.min(h*.00118, w*(portrait?.00245:.00142),1.5);
    ctx.save();
    ctx.translate(mouthX,mouthY);
    ctx.scale(s,s);
    const edge = -mouthX/s-8;
    const rng=random(7309);
    // The breakwater tips bracket the actual navigation target.
    [[-5,-13,-1], [10,14,1]].forEach(([tipX,tipY,dir],index)=>{
      const yOuter=tipY+dir*12;
      const points = [[edge,yOuter+dir*4],[edge*.53,yOuter],[edge*.26,tipY+dir*4],[tipX,tipY-1],[tipX+2,tipY+2],[edge*.22,tipY+6+dir*3],[edge*.47,yOuter+7],[edge,yOuter+12]];
      shape(ctx,points,'#354447','#122833',1.2);
      strata(ctx,points,rng,['#606b62','#21353d','#798071'],190,-.45);
      line(ctx,[points[0],points[1],points[2],points[3]],'#748078',1.32);
      for(let i=0;i<24;i++){
        const t=i/24,x=tipX+(edge-tipX)*t,y=tipY+dir*12*t;
        line(ctx,[[x,y+.6],[x-1.8,y+4.2]],'rgba(12,29,36,.64)',.68);
        if(i%2===0) line(ctx,[[x-2.1,y+7],[x+2.4,y+6.8]],'rgba(131,154,149,.46)',.7);
      }
      line(ctx,[[tipX,tipY],[tipX,tipY-6.1]],'#718382',1.15);
      const beacon = index?'#9ebd94':'#dc7560';
      glow(ctx,tipX,tipY-6.5,8,index?'rgba(145,190,132,.51)':'rgba(229,99,70,.53)');
      dot(ctx,tipX,tipY-6.5,1.25,beacon);
      for(let i=0;i<11;i++){
        const y=tipY+6+i*1.5, x=tipX+Math.sin(i*31)*3.2;
        line(ctx,[[x-1.8,y],[x+2.5,y-.2]],index?'rgba(157,189,148,.19)':'rgba(204,111,86,.19)',.57);
      }
    });
    const sizes=[[.98,-26,16,12],[.77,-23,14,10],[.55,-21,13,9],[.36,-18.5,8.5,6.8]];
    sizes.forEach(([u,y,ww,hh],i)=>{
      const x=edge*u;
      shape(ctx,[[x,y],[x+ww,y-1.8],[x+ww,y+hh-1],[x,y+hh]],'#4c595a','#192e38',.75);
      shape(ctx,[[x-2,y],[x+ww*.28,y-hh*.62],[x+ww*.86,y-hh*.64-1],[x+ww+2,y-2]],'#283b46','#182c36',.86);
      line(ctx,[[x+ww*.28,y-hh*.62],[x+ww*.87,y-hh*.64-1]],'#77817b',.66);
      if (i===1) {ctx.fillStyle='#35464c';ctx.fillRect(x+ww*.67,y-hh*.98,2,hh*.53);}
      for(let j=0;j<(i===3?1:2);j++) {
        const xx=x+ww*.22+j*ww*.43, yy=y+hh*.32;
        ctx.fillStyle=i%2?'#cbb27b':'#dbbd7d';ctx.fillRect(xx,yy,1.7,2.3);
        glow(ctx,xx+.85,yy+1,4.2,'rgba(225,192,111,.24)');
      }
    });
    ctx.restore();
  }

  class Seascape {
    constructor() {
      this.key = '';
      this.plates = new Map();
    }

    resize(ctx,w,h,portrait) {
      const dpr=Math.max(1,Math.min(2,ctx.getTransform().a || 1));
      const key=[Math.round(w),Math.round(h),dpr,portrait].join('/');
      if(key!==this.key) {
        this.key=key;this.dpr=dpr;this.w=w;this.h=h;this.portrait=portrait;this.plates.clear();
      }
    }

    plate(name,painter) {
      if(this.plates.has(name)) return this.plates.get(name);
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(this.w*this.dpr);canvas.height=Math.ceil(this.h*this.dpr);
      const c=canvas.getContext('2d');
      c.scale(this.dpr,this.dpr);
      c.lineCap='round';c.lineJoin='round';
      painter(c,this.w,this.h);
      this.plates.set(name,canvas);
      return canvas;
    }

    drawBackdrop(ctx,w,h,options={}) {
      const {time=0,storm=0,dawn=0,reducedMotion=false,portrait=w<h}=options;
      this.resize(ctx,w,h,portrait);
      ctx.save();
      const drawSky = (day) => {
        ctx.drawImage(this.plate(day?'daySky':'sky',(c,x,y)=>seaSky(c,x,y,day)),0,0,w,h);
      };
      drawSky(false);
      if(dawn>.001) {ctx.globalAlpha=Math.min(1,dawn);drawSky(true);ctx.globalAlpha=1;}
      this.water(ctx,w,h,time,storm,reducedMotion,false,dawn>.53);
      if(storm>.01) {
        ctx.fillStyle='rgba(5,14,23,'+(.15*storm*(1-dawn))+')';ctx.fillRect(0,0,w,h);
      }
      ctx.restore();
    }

    water(ctx,w,h,time,storm,reducedMotion,lit,day) {
      const speed=reducedMotion?.17:1;
      const t=time*speed;
      for(let i=0;i<2;i++) {
        const image=this.plate('wave'+i+lit+day,(c,x,y)=>buildWavePlate(c,x,y,i,lit,day));
        const d=Math.sin(t*.085+i*2.74)*(3.2+i*1.9);
        const bob=(Math.sin(t*(.38+i*.07)+i)*.5+.5)*(.34+storm*1.9);
        ctx.drawImage(image,d-6,bob-.1,w+12,h+.2);
      }
      const swell=this.plate('swell'+lit+day,(c,x,y)=>engravedWater(c,x,y,lit,day,this.portrait));
      const drift=Math.sin(t*.14)*(1.2+storm*1.3);
      const lift=Math.sin(t*.53)*(.38+storm*1.65);
      ctx.drawImage(swell,drift-2.7,lift-.3,w+5.4,h+.7);
    }

    drawLitWater(ctx,w,h,options={}) {
      const {time=0,storm=0,reducedMotion=false,portrait=w<h}=options;
      this.resize(ctx,w,h,portrait);
      this.water(ctx,w,h,time,storm,reducedMotion,true,false);
    }

    drawScenery(ctx,w,h,options={}) {
      const {time=0,dawn=0,portrait=w<h}=options;
      this.resize(ctx,w,h,portrait);
      const x=w*(portrait?.47:.31), y=h*(portrait?.735:.705);
      const scale=Math.min(h*(portrait?.00139:.00146),w*(portrait?.00215:.00149),1.65);
      const daylight = dawn >= .995;
      const plate=this.plate(daylight?'stationDay':'station',(c)=>{
        harbour(c,w,h,portrait);
        c.save();c.translate(x,y);c.scale(scale,scale);island(c);tower(c,daylight);c.restore();
      });
      ctx.drawImage(plate,0,0,w,h);
      if(dawn<.995) {
        ctx.save();
        ctx.globalCompositeOperation='screen';
        ctx.globalAlpha=(1-dawn)*(.93 + Math.sin(time*1.4)*.035);
        glow(ctx,x,y,scale*16,'rgba(255,220,139,.28)');
        glow(ctx,x,y,scale*4.2,'rgba(255,238,171,.5)');
        ctx.restore();
      }
    }
  }

  window.Seascape = Seascape;
})();
