(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const canvas = el('sea');
  const field = canvas.parentElement;
  const desk = document.querySelector('.desk');
  const ctx = canvas.getContext('2d', {alpha:false});
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(orientation:portrait) and (max-width:1000px)');
  const audio = new WatchAudio();
  const seascape = new Seascape();
  const ledger = el('ledger');
  const pause = el('pause');
  const sound = el('sound');
  const leaves = document.querySelector('.leaves');
  const steering = new Set();
  const titleLetters = [];
  const sim = new WatchSimulation({reducedMotion:motion.matches, onEvent:handleEvent});
  let watchNumber = 1;
  let width = 1, height = 1, pixelRatio = 1, dragging = null;
  let lastFrame = null, animation = 0, displayClock = '', lastWeatherSecond = -1;
  let focusReturn = null;
  let lensPrimed = false;

  for (const id of ['title-one','title-two']) {
    const line = el(id);
    const label = line.textContent;
    line.replaceChildren();
    for (const char of label) {
      const glyph = document.createElement('span');
      glyph.className = 'glyph';
      glyph.textContent = char;
      line.appendChild(glyph);
      titleLetters.push({el:glyph, warmth:0, x:0, y:0});
    }
  }

  function measureLetters() {
    if (sim.mode !== 'title') return;
    const area = field.getBoundingClientRect();
    for (const letter of titleLetters) {
      const r = letter.el.getBoundingClientRect();
      letter.x = (r.left + r.width / 2 - area.left) / width;
      letter.y = (r.top + r.height * .5 - area.top) / height;
    }
    const bearings = titleLetters.map(letter => sim.bearing(sim.lighthouse,letter));
    sim.titleSweep = {from:Math.min(...bearings),to:Math.max(...bearings)};
  }

  function resize() {
    const area = field.getBoundingClientRect();
    width = Math.max(1,area.width);
    height = Math.max(1,area.height);
    pixelRatio = Math.min(2,window.devicePixelRatio || 1);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    sim.resize(width,height,portrait.matches);
    measureLetters();
    if (!lensPrimed && sim.mode === 'title' && document.fonts.status === 'loaded') {
      // Open on a lens already turning. Each initial afterimage comes from its
      // actual passage through the cone during the preceding revolution.
      for (let step=0; step<180; step++) {
        sim.update(.05);
        exposeLetters(.05);
      }
      lensPrimed = true;
    }
    paint(0);
  }

  function exposeLetters(dt) {
    for (const letter of titleLetters) {
      letter.incident = sim.lightAt(letter.x,letter.y);
      letter.warmth = Math.max(letter.incident,letter.warmth * Math.exp(-dt / 3.6));
    }
  }

  function revealTitle(dt) {
    exposeLetters(dt);
    for (const letter of titleLetters) {
      const incident = letter.incident;
      const intensity = Math.min(1,letter.warmth * 1.65);
      letter.el.style.opacity = (.036 + .964 * intensity).toFixed(3);
      letter.el.style.color = 'rgb(' + Math.round(210+39*incident) + ',' + Math.round(208+30*incident) + ',' + Math.round(184-6*incident) + ')';
    }
  }

  function paint(dt) {
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    const options = {time:sim.ambientTime,storm:sim.storm,dawn:sim.dawn,reducedMotion:motion.matches,portrait:portrait.matches};
    seascape.drawBackdrop(ctx,width,height,options);
    WatchRenderer.draw(ctx,width,height,sim,motion.matches,seascape);
    if (sim.mode === 'title') revealTitle(dt);
  }

  function frame(now) {
    animation = 0;
    if (document.hidden) return;
    const dt = lastFrame === null ? 0 : Math.min(.125, (now-lastFrame)/1000);
    lastFrame = now;
    sim.reducedMotion = motion.matches;
    sim.update(dt);
    if (sim.mode !== 'paused') paint(dt);
    syncClock();
    if (lastWeatherSecond !== Math.floor(sim.time)) {
      lastWeatherSecond = Math.floor(sim.time);
      audio.weather(sim.storm);
    }
    if (!animation && sim.mode !== 'paused') animation = requestAnimationFrame(frame);
  }

  function wake() {
    lastFrame = null;
    if (!animation && !document.hidden) animation = requestAnimationFrame(frame);
  }

  function syncClock() {
    if (sim.clock === displayClock) return;
    displayClock = sim.clock;
    el('clock').textContent = displayClock;
    el('phase').textContent = sim.dawn > .35 ? 'Daybreak' : sim.storm > .22 ? 'Storm watch' : sim.time >= 90 ? 'Middle watch' : 'First watch';
  }

  function tallies() {
    el('home').textContent = String(sim.home).padStart(2,'0');
    el('lost').textContent = String(sim.lost).padStart(2,'0');
    document.querySelector('.chances').setAttribute('aria-label',(3 - sim.lost)+' lanterns remaining');
    [...el('lamps').children].forEach((lamp,i) => lamp.classList.toggle('spent',i >= 3 - sim.lost));
  }

  function addEntry(entry) {
    const li = document.createElement('li');
    li.dataset.type = entry.type;
    const time = document.createElement('time');
    time.textContent = entry.time;
    li.append(time,document.createTextNode(' — ' + entry.text));
    el('entries').appendChild(li);
    el('mobile-last').textContent = li.textContent;
    if (sim.mode !== 'title') leaves.scrollTop = leaves.scrollHeight;
  }

  function noteForKeeper() {
    if (sim.endReason === 'wrecks') return 'Three lanterns dark. I have set down their names, and I shall know these rocks better when next I take the light.';
    if (sim.lost === 0) return 'No names lost tonight. I leave a clean glass for the day keeper and the last sails silver in the morning light.';
    if (sim.home >= 5) return 'A hard sea, and good work from the crews. I can still count the missing lights from my window.';
    return 'Grey water at last. I have written down the names of those we brought in and those the reef has kept.';
  }

  function modeUI() {
    const mode = sim.mode;
    desk.dataset.mode = mode;
    el('opening').hidden = mode !== 'title';
    el('interlude').hidden = mode !== 'paused' && mode !== 'ended';
    el('verdict').hidden = mode !== 'ended';
    pause.disabled = mode !== 'playing' && mode !== 'paused';
    const paused = mode === 'paused';
    pause.setAttribute('aria-label',paused ? 'Resume the watch' : 'Pause the watch');
    pause.title = paused ? 'Resume the watch (P)' : 'Pause the watch (P)';
    pause.querySelector('use').setAttribute('href',paused ? '#i-play' : '#i-pause');
    if (paused) {
      el('interlude-title').textContent = 'Watch paused';
      el('interlude-description').textContent = 'The lens is held at ' + sim.clock + '.';
      el('continue').textContent = 'Resume the watch';
      el('continue').focus({preventScroll:true});
    } else if (mode === 'ended') {
      const morning = sim.endReason === 'dawn';
      el('interlude-title').textContent = morning ? 'Dawn at Sorrow Rock' : 'The watch has ended';
      el('interlude-description').textContent = sim.home + (sim.home === 1 ? ' ship' : ' ships') + ' home. ' + sim.lost + ' lost.';
      el('continue').textContent = 'Keep another watch';
      el('rating').textContent = noteForKeeper();
      if (portrait.matches) showLog(true);
      leaves.scrollTop = leaves.scrollHeight;
      (portrait.matches ? el('ledger-replay') : el('continue')).focus({preventScroll:true});
    }
    audio.volume(paused || document.hidden);
    tallies();
    syncClock();
  }

  function handleEvent(event) {
    if (event.type === 'log') {addEntry(event.entry); return;}
    if (event.type === 'wreck' || event.type === 'arrival') {audio.signal(event.type); tallies(); return;}
    if (event.type === 'thunder') {audio.signal('thunder'); return;}
    if (['start','pause','resume','end'].includes(event.type)) {
      steering.clear();
      modeUI();
      if (event.type !== 'pause') wake();
    }
  }

  function restart() {
    watchNumber++;
    el('folio').textContent = String(watchNumber).padStart(3,'0');
    el('entries').replaceChildren();
    showLog(false);
    sim.restart();
    lastWeatherSecond = -1;
    focusField();
  }

  function showLog(open) {
    ledger.classList.toggle('expanded',open && portrait.matches);
    el('log-toggle').setAttribute('aria-expanded',String(open && portrait.matches));
    el('log-toggle').setAttribute('aria-label',open && portrait.matches ? 'Collapse keeper’s log' : 'Expand keeper’s log');
  }
  function focusField() {
    field.tabIndex = -1;
    field.focus({preventScroll:true});
  }

  function setPause() {
    if (sim.mode === 'playing') sim.pause();
    else if (sim.mode === 'paused') {sim.resume(); focusField();}
  }
  el('start').addEventListener('click', () => {sim.start(); focusField();});
  el('continue').addEventListener('click', () => {if (sim.mode === 'paused') setPause(); else restart();});
  el('ledger-replay').addEventListener('click',restart);
  pause.addEventListener('click',setPause);
  el('log-toggle').addEventListener('click',() => showLog(!ledger.classList.contains('expanded')));
  el('mobile-last').addEventListener('click',() => showLog(true));
  sound.addEventListener('click', async () => {
    sound.disabled = true;
    try {
      const enabled = await audio.toggle(sim.mode === 'paused' || document.hidden);
      sound.querySelector('use').setAttribute('href',enabled ? '#i-sound' : '#i-muted');
      sound.querySelector('span').textContent = enabled ? 'Sound on' : 'Sound off';
      sound.setAttribute('aria-pressed',String(enabled));
      sound.setAttribute('aria-label',enabled ? 'Sound on. Mute sound' : 'Sound off. Enable sound');
      sound.disabled = false;
    } catch {
      sound.title = 'Audio unavailable in this browser';
      sound.setAttribute('aria-label',sound.title);
      sound.querySelector('span').textContent = 'Audio unavailable';
    }
  });

  function aim(event) {
    const r = field.getBoundingClientRect();
    sim.aim((event.clientX-r.left)/width,(event.clientY-r.top)/height);
  }
  field.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || !['title','playing'].includes(sim.mode) || dragging !== null) return;
    dragging = event.pointerId;
    field.setPointerCapture(dragging);
    aim(event);
  });
  field.addEventListener('pointermove',event => {
    if (event.target.closest('button')) return;
    if (event.pointerType === 'mouse' || dragging === event.pointerId) aim(event);
  });
  function release(event) {if (dragging === event.pointerId) dragging = null;}
  field.addEventListener('lostpointercapture',release);
  field.addEventListener('pointerup',release);
  field.addEventListener('pointercancel',release);

  const turns = new Map([['a',-1],['arrowleft',-1],['arrowup',-1],['d',1],['arrowright',1],['arrowdown',1]]);
  function turn() {
    sim.turn(Math.sign([...steering].reduce((n,key) => n + turns.get(key),0)));
  }
  window.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'p') {if (!event.repeat) setPause(); event.preventDefault(); return;}
    if (key === 'escape' && ledger.classList.contains('expanded')) {showLog(false); el('log-toggle').focus(); return;}
    if (turns.has(key) && ['playing','title'].includes(sim.mode) && !event.target.closest('.ledger')) {
      steering.add(key); turn(); event.preventDefault();
    }
  });
  window.addEventListener('keyup',event => {
    const key = event.key.toLowerCase();
    if (steering.delete(key)) {turn(); event.preventDefault();}
  });
  window.addEventListener('blur', () => {steering.clear(); sim.turn(0);});
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {
      focusReturn = sim.mode;
      sim.pause();
      audio.volume(true);
      if (animation) cancelAnimationFrame(animation);
      animation = 0;
    } else {
      audio.volume(sim.mode === 'paused');
      if (focusReturn === 'playing' && sim.mode === 'paused') el('continue').focus({preventScroll:true});
      wake();
    }
  });
  motion.addEventListener('change',() => {sim.reducedMotion = motion.matches; paint(0);});
  portrait.addEventListener('change',() => {showLog(sim.mode === 'ended' && portrait.matches); resize();});

  addEntry({time:'21:00',type:'note',text:'Glass polished. Wick trimmed. A sail off the reef.'});
  modeUI();
  new ResizeObserver(resize).observe(field);
  document.fonts.ready.then(resize);
  resize();
  wake();
})();
