/* The keeper's lantern and everything that answers it. All positions passed to
   draw() are in CSS pixels; the caller owns the display's pixel ratio. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const pigment = (dark, light, amount) => {
    const c = dark.map((v, i) => Math.round(mix(v, light[i], clamp(amount))));
    return 'rgb(' + c.join(',') + ')';
  };

  function seeded(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const random = seeded(771928);
  const seeds = Array.from({length: 920}, () => ({
    x: random(), y: random(), a: random(), b: random(), c: random()
  }));

  function path(ctx, points, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (close) ctx.closePath();
  }

  function line(ctx, points, stroke, width = 1) {
    path(ctx, points);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function shape(ctx, points, fill, stroke, width = 1) {
    path(ctx, points, true);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function halo(ctx, x, y, radius, stops, stretch = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, stretch);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    for (const [offset, color] of stops) glow.addColorStop(offset, color);
    ctx.fillStyle = glow;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // A single optical plate gives the edge a penumbra without expensive per-frame
  // blur. Rays share the lamp's optical centre, even on very wide displays.
  let optics;
  function beamPlate() {
    if (optics) return optics;
    optics = document.createElement('canvas');
    optics.width = 1024;
    optics.height = 420;
    const gc = optics.getContext('2d');
    const pixels = gc.createImageData(optics.width, optics.height);
    for (let x = 0; x < 1024; x++) {
      const depth = x / 1023;
      const strength = .9 * Math.exp(-depth * 2.1) * clamp((1 - depth) / .24);
      for (let y = 0; y < 420; y++) {
        const f = (y - 209.5) / ((x + 2) * Math.tan(Math.PI / 20));
        if (Math.abs(f) > 1.32) continue;
        const envelope = 1 / (1 + Math.exp(14 * (Math.abs(f) - .915)));
        const shaft = .80 + .074 * Math.cos(f * 13.7 - .48)
          + .022 * Math.cos(f * 41 + .8) + .009 * Math.cos(f * 97);
        const edge = .08 * Math.exp(-Math.pow((Math.abs(f) - .78) / .048, 2));
        const i = (y * 1024 + x) * 4;
        pixels.data[i] = mix(254, 222, depth);
        pixels.data[i + 1] = mix(233, 208, depth);
        pixels.data[i + 2] = mix(160, 153, depth);
        pixels.data[i + 3] = 255 * strength * envelope * (shaft + edge) * .83;
      }
    }
    gc.putImageData(pixels, 0, 0);
    return optics;
  }

  function geometry(w, h, sim) {
    return {
      x: sim.lighthouse.x * w, y: sim.lighthouse.y * h,
      dx: Math.cos(sim.beamAngle), dy: Math.sin(sim.beamAngle),
      length: Math.hypot(w, h) * 1.16,
      short: Math.min(w, h)
    };
  }

  function coneLight(x, y, g) {
    const dx = x - g.x, dy = y - g.y;
    const ahead = dx * g.dx + dy * g.dy;
    if (ahead <= 0) return 0;
    const cross = Math.abs(dx * g.dy - dy * g.dx);
    return clamp((1.06 - cross / (ahead * .158 + 1)) * 6)
      * Math.exp(-ahead / g.length);
  }

  let occlusionCanvas;
  function opticalField(w, h, sim, g) {
    if (sim.mode === 'ended' && sim.endReason === 'dawn') return null;
    if (!occlusionCanvas) occlusionCanvas = document.createElement('canvas');
    // This pass contains diffuse light only. The scene's linework remains at
    // device resolution when the keeper turns the lens.
    const factor = Math.min(1, 1050 / Math.max(w, h));
    const ow = Math.max(1, Math.round(w * factor)), oh = Math.max(1, Math.round(h * factor));
    if (occlusionCanvas.width !== ow || occlusionCanvas.height !== oh) {
      occlusionCanvas.width = ow;
      occlusionCanvas.height = oh;
    }
    const field = occlusionCanvas.getContext('2d');
    field.setTransform(ow / w, 0, 0, oh / h, 0, 0);
    field.clearRect(0, 0, w, h);
    field.save();
    field.translate(g.x, g.y);
    field.rotate(sim.beamAngle);
    field.globalAlpha = 1 - .74 * sim.dawn;
    field.drawImage(beamPlate(), 0, -g.length * 210 / 1024, g.length, g.length * 420 / 1024);
    field.restore();
    field.save();
    field.globalCompositeOperation = 'destination-out';
    for (const bank of sim.fog) {
      const x = bank.x * w, y = bank.y * h;
      const rx = bank.rx * w, ry = bank.ry * h;
      const dx = x - g.x, dy = y - g.y, dist = Math.hypot(dx, dy);
      if (dist < 1) continue;
      const halfWidth = Math.hypot(rx * dy, ry * dx) / dist;
      const shadowLength = Math.hypot(w, h) * 1.5;
      field.save();
      field.translate(x, y);
      field.rotate(Math.atan2(dy, dx));
      const shadow = field.createLinearGradient(-halfWidth * .48, 0, halfWidth * .4 + 1, 0);
      shadow.addColorStop(0, 'rgba(0,0,0,0)');
      shadow.addColorStop(1, 'rgba(0,0,0,' + (.29 * bank.opacity) + ')');
      for (let pass = 0; pass < 8; pass++) {
        const spread = halfWidth * (1 - pass * .085);
        const farSpread = spread * (1 + shadowLength / dist);
        shape(field, [[-halfWidth*.48,-spread],[shadowLength,-farSpread],
          [shadowLength,farSpread],[-halfWidth*.48,spread]], shadow);
      }
      field.restore();
    }
    field.restore();
    return occlusionCanvas;
  }

  let waterCanvas;
  function litWater(ctx, w, h, sim, g, mask, sea, options) {
    // Clip the same moving engraved wave plates used by the surrounding sea.
    // Crop the temporary surface's active rectangle to the visible light. Its
    // scale stays identical to the main canvas so Seascape can share its cache.
    const halfAngle = sim.beamHalfAngle * 1.35;
    const reach = a => {
      const dx = Math.cos(a), dy = Math.sin(a);
      const tx = dx > 0 ? (w-g.x)/dx : dx < 0 ? -g.x/dx : Infinity;
      const ty = dy > 0 ? (h-g.y)/dy : dy < 0 ? -g.y/dy : Infinity;
      const end = Math.min(tx, ty) + 2;
      return [g.x+dx*end, g.y+dy*end];
    };
    const points = [[g.x,g.y], reach(sim.beamAngle-halfAngle), reach(sim.beamAngle+halfAngle)];
    for (const corner of [[0,0],[w,0],[0,h],[w,h]]) {
      const dx=corner[0]-g.x, dy=corner[1]-g.y;
      const ahead=dx*g.dx+dy*g.dy;
      if (ahead>0 && Math.abs(dx*g.dy-dy*g.dx) < ahead*Math.tan(halfAngle)) points.push(corner);
    }
    const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0])))-1);
    const right=Math.min(w,Math.ceil(Math.max(...points.map(p=>p[0])))+1);
    const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))-1);
    const bottom=Math.min(h,Math.ceil(Math.max(...points.map(p=>p[1])))+1);
    if (right<=left || bottom<=top) return;

    const ratio = ctx.getTransform().a || 1;
    if (!waterCanvas) waterCanvas = document.createElement('canvas');
    const pw=Math.max(1,Math.ceil(w*ratio)), ph=Math.max(1,Math.ceil(h*ratio));
    if (waterCanvas.width!==pw || waterCanvas.height!==ph) {
      waterCanvas.width=pw; waterCanvas.height=ph;
    }
    const water=waterCanvas.getContext('2d');
    water.setTransform(ratio,0,0,ratio,0,0);
    water.save();
    water.beginPath();water.rect(left,top,right-left,bottom-top);water.clip();
    water.clearRect(left,top,right-left,bottom-top);
    water.beginPath();
    water.moveTo(g.x,g.y);
    water.arc(g.x,g.y,g.length,sim.beamAngle-halfAngle,sim.beamAngle+halfAngle);
    water.closePath();water.clip();
    sea.drawLitWater(water,w,h,options);
    water.globalCompositeOperation='destination-in';
    water.drawImage(mask,0,0,w,h);
    water.restore();
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.drawImage(waterCanvas,left*ratio,top*ratio,(right-left)*ratio,(bottom-top)*ratio,
      left,top,right-left,bottom-top);
    ctx.restore();
  }

  function beamShimmer(ctx, w, h, sim, g, reduced) {
    if (sim.mode === 'ended' && sim.endReason === 'dawn') return;
    const time = sim.ambientTime * (reduced ? .18 : 1);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let i = 0; i < 710; i++) {
      const s = seeds[i];
      const x = s.x * w + Math.sin(time * .21 + s.b * 30) * 2.2;
      const y = .31 * h + s.y * .70 * h + Math.sin(time * .53 + s.c * 25) * .9;
      const light = coneLight(x, y, g);
      if (light <= .025) continue;
      const fade = sim.fog.length ? sim.lightAt(x / w, y / h) : light;
      const strength = (.13 + .17 * s.c + .16 * Math.sin(time * .9 + i)) * Math.min(light, fade);
      if (strength < .025) continue;
      const length = (2 + s.a * s.a * 23) * (.65 + .4 * s.y);
      line(ctx, [[x-length,y+.5], [x-length*.18,y], [x+length*.34,y-1],
        [x+length*.63,y-.55]], 'rgba(223,227,187,' + strength + ')', .48 + .55 * s.b);
    }
    for (let i = 710; i < seeds.length; i++) {
      const s = seeds[i];
      const x = ((s.x + time * .0011 * (s.c + .2)) % 1) * w;
      const y = (s.y + .009 * Math.sin(time * .25 + i)) * h;
      const light = coneLight(x, y, g);
      if (light < .07 || (sim.fog.length && sim.lightAt(x / w, y / h) < .1)) continue;
      const sparkle = .36 + .33 * Math.sin(i * 8 + time * (s.b + .35));
      ellipse(ctx, x, y, .48 + s.a * .75, .35 + s.a * .52,
        'rgba(255,248,203,' + (light * sparkle) + ')');
    }
    ctx.restore();
  }

  const rockGeometry = new Map();
  function rockPlan(rock) {
    if (rockGeometry.has(rock.id)) return rockGeometry.get(rock.id);
    let hash = 1;
    for (const c of String(rock.name)) hash = Math.imul(31, hash) + c.charCodeAt(0) | 0;
    const rng = seeded(hash >>> 0);
    const outline = [];
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      const r = .9 + rng() * .28;
      outline.push([Math.cos(a) * r * 1.18, Math.sin(a) * r * .66]);
    }
    const peaks = [];
    for (let i = 0; i < 4; i++) {
      peaks.push({x: -.73 + i * .46 + rng() * .09, y: -.07 + rng() * .28,
        w: .28 + rng() * .30, h: .24 + rng() * .54});
    }
    const grit = Array.from({length: 16}, () => [rng() * 2 - 1, rng(), rng()]);
    const result = {outline, peaks, grit};
    rockGeometry.set(rock.id, result);
    return result;
  }

  function castShadow(ctx, x, y, width, length, g, strength) {
    if (strength < .04) return;
    const a = Math.atan2(y - g.y, x - g.x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const shade = ctx.createLinearGradient(0, 0, length, 0);
    shade.addColorStop(0, 'rgba(2,13,20,' + Math.min(.78, strength * .8) + ')');
    shade.addColorStop(.7, 'rgba(3,15,23,' + strength * .27 + ')');
    shade.addColorStop(1, 'rgba(4,18,26,0)');
    shape(ctx, [[-2, -width], [length, -width * .6], [length, width * 1.85],
      [width * .9, width], [0, width * .68]], shade);
    ctx.restore();
  }

  function rocks(ctx, w, h, sim, g, flash) {
    for (const reef of sim.rocks) {
      const x = reef.x * w, y = reef.y * h, r = reef.radius * g.short;
      const illumination = sim.lightAt(reef.x, reef.y);
      const exposure = Math.max(illumination, sim.dawn * .88, flash * .66);
      const remembered = Math.max(reef.memory, reef.progress);
      const plan = rockPlan(reef);
      castShadow(ctx, x, y, r * .65, r * 3.8, g, illumination);
      ctx.save();
      ctx.translate(x, y);
      const glint = reef.glint || 0;
      const reveal = Math.max(exposure, remembered * .54);
      if (reveal > .02) {
        ctx.save();
        ctx.globalAlpha = clamp(reveal * 1.45);
        const shore = plan.outline.map(([px, py]) => [px * r, py * r]);
        shape(ctx, shore, pigment([10,25,32],[50,65,66],reveal), 'rgba(173,182,151,.45)', .65);
        for (const p of plan.peaks) {
          const left = [(p.x-p.w)*r,p.y*r], top = [(p.x-.11)*r,(p.y-p.h)*r];
          const ridge = [(p.x+.12)*r,(p.y-p.h*.75)*r], tip = [(p.x+p.w)*r,p.y*r];
          const foot = [(p.x+.13)*r,(p.y+.16)*r];
          shape(ctx, [left,top,ridge,tip,foot], pigment([19,34,39],[106,110,92],reveal));
          shape(ctx, [top,ridge,tip,foot,[(p.x+.01)*r,(p.y-p.h*.40)*r]],
            pigment([10,23,29],[40,53,56],reveal));
          line(ctx, [left,top,ridge], 'rgba(209,207,169,' + (.22 + .40*reveal) + ')', .76);
          for (let i=1; i<=3; i++) {
            const f=i/5;
            line(ctx, [[mix(left[0],top[0],f),mix(left[1],top[1],f)+1],
              [mix(left[0],top[0],f)+r*.07,mix(left[1],top[1],f)+r*.12]],
              'rgba(13,33,39,.55)', .62);
          }
        }
        ctx.restore();
      }
      if (glint > .015 || reveal > .02) {
        for (let i=0; i<plan.grit.length; i++) {
          const [a,b,c] = plan.grit[i];
          const theta = (a+1) * Math.PI;
          const sx = Math.cos(theta)*(1.18+b*.24)*r;
          const sy = Math.sin(theta)*(.68+b*.16)*r;
          const strength = clamp(glint * (.27 + .55 * c) + reveal * .34);
          line(ctx, [[sx,sy],[sx+(2+c*5),sy-.65],[sx+4+c*7,sy-.3]],
            'rgba(164,199,190,' + strength + ')', .6 + c*.38);
        }
      }
      if (reef.wrecks > 0) {
        line(ctx, [[r*.33,-2],[r*.15,-r*.91]], '#a95746', 1.8);
        line(ctx, [[r*.10,-r*.63],[r*.44,-r*.68]], '#c36a50', .95);
      }
      if (remembered > .015) {
        const pts = plan.outline.map(([px,py]) => [px * (r+5),py * (r+5)]);
        const portion = reef.memory > .005 ? 1 : reef.progress;
        const steps = portion * pts.length;
        ctx.save();
        ctx.setLineDash([3.5,3.6]);
        ctx.strokeStyle = 'rgba(237,224,167,' + (.15 + .67*remembered) + ')';
        ctx.lineWidth = .9;
        ctx.beginPath();
        ctx.moveTo(...pts[0]);
        for (let i=1; i<=Math.floor(steps); i++) ctx.lineTo(...pts[i % pts.length]);
        if (steps < pts.length) {
          const prev=pts[Math.floor(steps)], next=pts[(Math.floor(steps)+1)%pts.length];
          ctx.lineTo(mix(prev[0],next[0],steps%1),mix(prev[1],next[1],steps%1));
        }
        ctx.stroke();
        ctx.restore();
        if (reef.memory > .015) {
          ctx.font = 'italic ' + (w < 500 ? 12 : 14) + 'px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(232,224,188,' + (.2 + .8*reef.memory) + ')';
          ctx.shadowColor = '#08131b';
          ctx.shadowBlur = 3;
          ctx.fillText(reef.name,0,r*.88+17);
        }
      }
      ctx.restore();
    }
  }

  function wake(ctx, x, y, angle, scale, energy, time) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.scale(scale,scale);
    for (let side=-1; side<=1; side+=2) {
      for (let i=0; i<18; i++) {
        const s=seeds[57+i+(side+1)*13];
        const u=(i+time*.95)%18;
        const width=3+u*.52;
        const px=-22-u*2.9;
        const py=side*(width+s.a*1.4);
        const alpha=(1-u/20)*(.15+.40*energy)*(.4+s.c*.55);
        line(ctx,[[px+4,py-side*.75],[px,py],[px-2.4-s.b*3,py+side*.33]],
          'rgba(175,207,193,'+alpha+')',.6+s.b*.46);
      }
    }
    ctx.restore();
  }

  function sail(ctx,p, corners, color, seam, light) {
    // Corners are head, peak, clew, tack. Curved edges and panel seams make
    // each spread of canvas pick up the lamp at a slightly different angle.
    const [head,peak,clew,tack] = corners.map(a=>p(...a));
    const belly=mix(clew[0],tack[0],.44);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...head); ctx.lineTo(...peak);
    ctx.quadraticCurveTo(mix(peak[0],clew[0],.57)+1.2,mix(peak[1],clew[1],.57),...clew);
    ctx.quadraticCurveTo(belly,mix(clew[1],tack[1],.50)+2.1,...tack);
    ctx.closePath();
    ctx.fillStyle=color; ctx.fill();
    ctx.strokeStyle='rgba(13,26,33,.88)'; ctx.lineWidth=.65; ctx.stroke();
    ctx.clip();
    for (let i=1;i<6;i++) {
      const t=i/6;
      ctx.beginPath();
      ctx.moveTo(mix(head[0],peak[0],t),mix(head[1],peak[1],t));
      ctx.quadraticCurveTo(mix(head[0]+t*(peak[0]-head[0]),tack[0]+t*(clew[0]-tack[0]),.5)+1.9,
        mix(head[1]+t*(peak[1]-head[1]),tack[1]+t*(clew[1]-tack[1]),.5),
        mix(tack[0],clew[0],t),mix(tack[1],clew[1],t)+2);
      ctx.strokeStyle=seam; ctx.lineWidth=.44; ctx.stroke();
    }
    line(ctx,[head,peak], 'rgba(253,235,186,'+(.4+.5*light)+')',1.6);
    ctx.restore();
  }

  function shipFigure(ctx, type, angle, light) {
    const ca=Math.cos(angle), sa=Math.sin(angle);
    const p=(u,v=0,z=0) => [u*ca-v*sa,u*sa*.72+v*ca*.72-z];
    const stroke=(points,color,width) => line(ctx,points.map(a=>p(...a)),color,width);
    const poly=(points,color,edge,width) => shape(ctx,points.map(a=>p(...a)),color,edge,width);
    const rig=pigment([31,51,57],[62,60,50],light);
    const spar=pigment([84,89,76],[204,190,145],light);
    const edge=pigment([61,81,85],[178,180,147],light);
    const dark='#101c23';
    const sheer=[[-27,0,2],[-24,-4.1,1],[-12,-5,0],[10,-4.9,.1],[23,-3,1.6],
      [29,0,3.0],[22,3.5,1],[6,5.1,.4],[-16,4.6,.4],[-26,3,1.7]];
    const lower=[[-27,0,-1.3],[-23,-4,-2.6],[-10,-4.6,-3.8],[10,-4.5,-3.3],
      [23,-2.5,-1],[29,0,2.6],[20,3.1,-2],[6,4.4,-3.7],[-15,4.2,-3.7],[-25,2.6,-1.7]];
    poly(lower, '#0b151b', '#0a151d',1.4);
    poly(sheer,pigment([48,63,63],[133,133,107],light),dark,.8);
    const side=ca>=0?1:-1;
    stroke([[-25,side*3,-.15],[-16,side*4.8,-1.2],[7,side*5.1,-1.4],[22,side*3.1,.05],[29,0,2.6]],edge,.84);
    for(let i=0;i<8;i++) {
      const u=-20+i*5.1;
      stroke([[u,-3.4,.65],[u,3.4,.65]],'rgba(15,30,34,.35)',.48);
    }
    if(type==='schooner') {
      const aft=-11, fore=9;
      const jibTip=[34,0,6];
      stroke([[22,0,2],jibTip],spar,1);
      stroke([[aft,0,1],[aft-.9,0,34]],spar,1.24);
      stroke([[fore,0,1],[fore-.4,0,29]],spar,1.06);
      stroke([[-26,0,2],[aft-.9,0,33],[fore-.4,0,28],jibTip],rig,.64);
      stroke([[aft-.8,0,31],[-20,side*4.2,1]],rig,.6);
      stroke([[fore-.3,0,27],[3,side*4.8,1]],rig,.55);
      sail(ctx,p,[[aft-.9,0,28],[-24,1,31],[-26,2,7],[aft-1,0,5]],
        pigment([131,143,134],[228,224,182],light),'rgba(43,61,61,.43)',light);
      sail(ctx,p,[[fore-.6,0,24],[-2,1,26],[-8,2,6],[fore-.9,0,5.5]],
        pigment([105,122,120],[206,210,174],light),'rgba(43,61,61,.4)',light);
      sail(ctx,p,[[fore+.4,0,25],[fore+.5,0,25],[27,.4,6],[14,1.9,5]],
        pigment([142,152,136],[236,226,184],light),'rgba(57,70,61,.36)',light);
      sail(ctx,p,[[fore+4.4,0,22],[fore+4.5,0,22],[33,.1,6.4],[27.7,.6,6]],
        pigment([109,127,121],[211,211,174],light),'rgba(57,70,61,.32)',light);
      stroke([[-26,2,6.6],[aft-.5,0,5]],spar,.76);
      stroke([[-8,2,5.8],[fore,0,5.2]],spar,.7);
      for(const [u,top] of [[aft,33],[fore,28]]) {
        stroke([[u-.8,0,top],[u-3.2,side*4.1,1.3]],rig,.49);
        stroke([[u-.8,0,top],[u+3.6,side*4.1,1.1]],rig,.49);
      }
      poly([[aft-.8,0,34],[aft-6.8,.4,33.1],[aft-3.2,.2,32.2],[aft-.8,0,32.5]],
        pigment([131,101,76],[195,130,81],light));
    } else {
      const cabin=type==='trawler'?-12:-6;
      poly([[cabin-5,-3,1],[cabin+6,-3,1],[cabin+6,-3,7],[cabin-5,-3,7]],
        pigment([56,76,77],[143,153,135],light),dark,.65);
      poly([[cabin-5,3,1],[cabin+6,3,1],[cabin+6,3,7],[cabin-5,3,7]],
        pigment([59,75,72],[141,143,117],light),dark,.65);
      poly([[cabin-6,-3.8,7],[cabin+6,-3.8,7],[cabin+6,3.8,7],[cabin-6,3.8,7]],
        pigment([71,84,78],[161,161,128],light),dark,.7);
      for(let i=0;i<3;i++) {
        const u=cabin-3+i*3;
        poly([[u,side*3.15,3.7],[u+1.7,side*3.15,3.7],[u+1.7,side*3.15,5.7],[u,side*3.15,5.7]],
          i===0?'#d8bc7b':'#83958b');
      }
      stroke([[15,0,2],[15,0,17]],spar,.9);
      if(type==='trawler') {
        stroke([[15,0,16],[2,0,6],[-4,0,2]],rig,.74);
        stroke([[15,0,9],[3,0,12]],spar,.95);
        stroke([[3,0,12],[4,side*4,.7]],rig,.6);
        for(let i=0;i<4;i++) stroke([[5+i*2,side*4,.6],[5+i*2,side*4,2.4]],edge,.6);
        stroke([[5,side*4,2.4],[11,side*4,2.4]],edge,.7);
      } else {
        poly([[-13,-1.8,5],[-9,-1.8,5],[-8,-1.8,15],[-12,-1.8,15]],
          pigment([97,82,65],[164,122,84],light),dark,.8);
        stroke([[-12,0,14.2],[-8,0,14.2]],'#28383c',2.5);
        for(let i=0;i<5;i++) ellipse(ctx,...p(3+i*3.8,side*4.5,-.3),.55,.52,'#c5b78a');
      }
    }
    return p(-21,side*2.4,3.8);
  }

  function ships(ctx, w, h, sim, g, flash, reduced) {
    const time = sim.ambientTime * (reduced ? .3 : 1);
    for(const ship of sim.ships) {
      const x=ship.x*w, baseY=ship.y*h;
      const exposure=sim.lightAt(ship.x,ship.y);
      const light=Math.max(exposure,sim.dawn*.90,flash*.8);
      const opening = ship.id === 0 ? clamp(1 - sim.time / 4) : 0;
      const titleScale = 1 + .39 * opening * opening * (3 - 2 * opening);
      const scale = Math.min(1.35, Math.max(Math.min(.72, g.short/260), g.short/580)) * titleScale;
      const y=baseY+(reduced?0:Math.sin(time*1.2+ship.id)*(.65+sim.storm*1.2));
      const angle=ship.angle;
      const sinking=ship.state==='wrecked';
      const age=ship.effectAge;
      const fade=sinking?clamp(1-age/4.7):ship.state==='home'?clamp(1-age/1.5):1;
      if(fade<=0) continue;
      ctx.save();
      ctx.globalAlpha=fade;
      if(!sinking) {
        castShadow(ctx,x,y,scale*9,scale*125,g,exposure);
        wake(ctx,x,y,angle,scale,light,time);
        if(ship.state==='sailing') {
          ctx.save();
          ctx.translate(x,y); ctx.rotate(angle);
          ctx.setLineDash([1.5*scale,4*scale]);
          line(ctx,[[32*scale,0],[48*scale,0]],'rgba(178,193,174,'+(.34+.4*light)+')',.85);
          ctx.restore();
        }
      }
      if(ship.type==='steamer'&&!sinking) {
        for(let i=0;i<9;i++) {
          const u=(time*.43+i/9)%1;
          const dx=-(11+u*22)*scale*Math.cos(angle);
          const dy=-(11+u*22)*scale*Math.sin(angle)*.72;
          halo(ctx,x+dx+Math.sin(u*7)*1.4*scale,y+dy-(14+14*u)*scale,
            (1.6+u*4.6)*scale,[[0,'rgba(127,142,139,'+(.32*(1-u))+')'],[1,'rgba(108,129,127,0)']],.85);
        }
      }
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(scale,scale);
      if(!reduced) ctx.rotate(Math.sin(time*.8+ship.id)*(.012+.018*sim.storm));
      let lantern;
      if(sinking) {
        // Clip against the ship's longitudinal axis so the split follows the
        // hull regardless of its bearing.
        for(const half of [-1,1]) {
          ctx.save();
          ctx.translate(half*Math.cos(angle)*age*2.1,age*1.6+half*Math.sin(angle)*age*.8);
          ctx.rotate(half*age*.09);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.rect(half<0?-110:0,-110,110,220); ctx.clip();
          ctx.rotate(-angle);
          shipFigure(ctx,ship.type,angle,Math.max(light,.25*(1-age/4.7)));
          ctx.restore();
        }
      } else {
        lantern=shipFigure(ctx,ship.type,angle,light);
        const [lx,ly]=lantern;
        ctx.save();
        ctx.globalCompositeOperation='screen';
        halo(ctx,lx,ly,8.6,[[0,'rgba(255,226,155,.76)'],[.27,'rgba(251,207,116,.32)'],
          [1,'rgba(238,185,88,0)']]);
        ellipse(ctx,lx,ly,.99,1.0,'#fff0bb');
        for(let i=0;i<4;i++) {
          const ny=Math.max(ly+3,2)+i*2;
          line(ctx,[[lx-1.7+i*.2+Math.sin(time+i)*.7,ny],
            [lx+1.9-i*.15,ny]],'rgba(229,198,126,'+(.33-i*.067)+')',.65);
        }
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    }
  }

  let cloudPlate;
  function fogPlate() {
    if(cloudPlate) return cloudPlate;
    cloudPlate=document.createElement('canvas');
    cloudPlate.width=400; cloudPlate.height=150;
    const fc=cloudPlate.getContext('2d'), rng=seeded(6027);
    for(let i=0;i<95;i++) {
      const a=rng()*TAU,r=Math.sqrt(rng());
      const x=200+Math.cos(a)*r*140, y=75+Math.sin(a)*r*38;
      const radius=15+rng()*48;
      halo(fc,x,y,radius,[[0,'rgba(190,205,184,.115)'],
        [.46,'rgba(186,202,184,.075)'],[1,'rgba(174,196,185,0)']],.16+rng()*.30);
    }
    return cloudPlate;
  }

  function fog(ctx,w,h,sim,g) {
    if(!sim.fog.length) return;
    const plate=fogPlate();
    const drawBank=bank=>ctx.drawImage(plate,(bank.x-bank.rx)*w,(bank.y-bank.ry)*h,
      bank.rx*w*2,bank.ry*h*2);
    ctx.save();
    for(const bank of sim.fog) {
      ctx.globalAlpha=(.035+sim.dawn*.22)*bank.opacity;
      drawBank(bank);
    }
    if(sim.endReason!=='dawn') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.x,g.y);
      ctx.arc(g.x,g.y,g.length,sim.beamAngle-sim.beamHalfAngle,
        sim.beamAngle+sim.beamHalfAngle);
      ctx.closePath(); ctx.clip();
      ctx.globalCompositeOperation='screen';
      for(const bank of sim.fog) {
        ctx.globalAlpha=.8*bank.opacity;
        drawBank(bank);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function rain(ctx,w,h,sim,g) {
    if(sim.storm<.045) return;
    const time=sim.ambientTime, count=Math.floor(190*sim.storm);
    ctx.save();
    for(let i=0;i<count;i++) {
      const s=seeds[i+250], speed=.54+s.a*.51;
      const y=((s.y+time*speed)%1)*h;
      const x=((s.x+time*speed*.11+13)%1)*w;
      const lit=coneLight(x,y,g);
      const alpha=(.025+lit*.28)*sim.storm*(.5+s.b*.55);
      const length=5+s.b*8;
      line(ctx, [[x,y],[x+length*.36,y+length]], 'rgba(210,223,206,'+alpha+')',.55+s.c*.4);
    }
    ctx.restore();
  }

  function signals(ctx,w,h,sim,reduced) {
    ctx.save();
    ctx.globalCompositeOperation='screen';
    for(const fx of sim.effects) {
      const x=fx.x*w,y=fx.y*h, t=clamp(fx.age/fx.life);
      if(fx.type==='answer'||fx.type==='arrival') {
        const r=3+(fx.type==='arrival'?32:24)*(reduced?t*.6:t);
        ctx.beginPath();
        ctx.ellipse(x,y,r,r*.74,0,0,TAU);
        ctx.strokeStyle='rgba(245,228,168,'+(.8*(1-t))+')';
        ctx.lineWidth=1.2-t*.5;
        ctx.stroke();
      } else if(fx.type==='flare') {
        const up=Math.sin(Math.min(1,t*2.3)*Math.PI*.49);
        const drift=t*12;
        const ax=x+drift, ay=y-up*(reduced?24:55)+Math.max(0,t-.5)*22;
        if(t<.66) {
          const startY=mix(y,ay,clamp(t*1.35));
          const tail=ctx.createLinearGradient(x,startY,ax,ay+.01);
          tail.addColorStop(0,'rgba(226,84,60,0)');
          tail.addColorStop(1,'rgba(246,110,68,'+(.8*(1-t))+')');
          line(ctx,[[x,startY],[ax,ay]],tail,1.6);
        }
        halo(ctx,ax,ay,8+13*(1-t),[[0,'rgba(255,178,116,'+(1-t)+')'],
          [.17,'rgba(242,101,67,'+(.9*(1-t))+')'],
          [1,'rgba(226,84,60,0)']]);
        if(!reduced) {
          for(let i=0;i<8;i++) {
            const s=seeds[i+350];
            const spread=t*(2+14*s.a);
            ellipse(ctx,ax+Math.cos(i*2.4)*spread,ay+Math.sin(i*2.4)*spread+t*t*8,
              .7,.7,'rgba(255,160,97,'+((1-t)*.7)+')');
          }
        }
      }
    }
    ctx.restore();
  }

  function lamp(ctx,sim,g,reduced) {
    if(sim.endReason==='dawn') return;
    const x=g.x, y=g.y;
    const flare=Math.pow(Math.max(0,Math.cos(sim.beamAngle-Math.PI/2)),150);
    const r=clamp(g.short*.054,19,48);
    ctx.save();
    ctx.globalCompositeOperation='screen';
    halo(ctx,x,y,r,[[0,'rgba(255,238,171,.94)'],
      [.08,'rgba(255,225,143,.79)'],[.22,'rgba(245,201,107,.38)'],
      [.55,'rgba(227,179,84,.105)'],[1,'rgba(225,170,76,0)']]);
    ellipse(ctx,x,y,2.3,1.65,'#fff8d3');
    if(!reduced&&flare>.015) {
      const bright=.8*flare;
      halo(ctx,x,y,r*3.1,[[0,'rgba(255,236,177,'+bright+')'],[.32,'rgba(255,227,160,'+(bright*.37)+')'],
        [1,'rgba(247,224,162,0)']],.022);
      for(let i=0;i<4;i++) {
        const a=(i+.32)*Math.PI/4;
        const length=r*(.35+i*.025)*flare;
        line(ctx,[[x-Math.cos(a)*length,y-Math.sin(a)*length],
          [x+Math.cos(a)*length,y+Math.sin(a)*length]],'rgba(255,237,185,'+(bright*.85)+')',.7);
      }
    }
    ctx.restore();
  }

  function draw(ctx,w,h,sim,reducedMotion=sim.reducedMotion,sea=null) {
    if(w<=0||h<=0) return;
    ctx.save();
    ctx.lineJoin='round'; ctx.lineCap='round';
    const g=geometry(w,h,sim);
    let flash=0;
    if(!reducedMotion) {
      for(const f of sim.effects) {
        if(f.type==='lightning') {
          const strength=Math.exp(-f.age*13) + .38*Math.exp(-Math.pow((f.age-.18)*22,2));
          flash=Math.max(flash,clamp(strength));
        }
      }
    }
    const mask = opticalField(w,h,sim,g);
    if (sea) {
      const options = {time:sim.ambientTime, storm:sim.storm, dawn:sim.dawn,
        reducedMotion, portrait:sim.portrait};
      if (mask) litWater(ctx,w,h,sim,g,mask,sea,options);
      sea.drawScenery(ctx,w,h,options);
    }
    if (mask) {
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(mask,0,0,w,h);
      ctx.restore();
    }
    beamShimmer(ctx,w,h,sim,g,reducedMotion);
    rocks(ctx,w,h,sim,g,flash);
    ships(ctx,w,h,sim,g,flash,reducedMotion);
    fog(ctx,w,h,sim,g);
    if(!reducedMotion) rain(ctx,w,h,sim,g);
    if(flash>.015) {
      ctx.fillStyle='rgba(173,197,206,'+(flash*.21)+')';
      ctx.fillRect(0,0,w,h);
    }
    signals(ctx,w,h,sim,reducedMotion);
    lamp(ctx,sim,g,reducedMotion);
    ctx.restore();
  }

  window.WatchRenderer={draw};
})();
