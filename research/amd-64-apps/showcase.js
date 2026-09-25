const state = { apps: [], bank: 'all', kind: 'all', query: '', current: null, previousFocus: null };
const $ = (selector) => document.querySelector(selector);
const gallery = $('#gallery-grid');
const viewer = $('#viewer');
const frame = $('#viewer-iframe');

function visibleApps() {
  const query = state.query.trim().toLowerCase();
  return state.apps.filter((app) =>
    (state.bank === 'all' || app.bank === state.bank) &&
    (state.kind === 'all' || app.kind === state.kind) &&
    (!query || `${app.title} ${app.description} ${app.brief}`.toLowerCase().includes(query))
  );
}

function thumbnailFallback(image, app) {
  const parent = image.parentElement;
  image.remove();
  const fallback = document.createElement('span');
  fallback.className = 'thumbnail-fallback';
  fallback.textContent = app.title;
  parent?.append(fallback);
}

function renderGallery() {
  const apps = visibleApps();
  gallery.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const app of apps) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `app-card bank-${app.bank.toLowerCase()}`;
    card.setAttribute('aria-label', `Open ${app.title}, ${app.kind}, machine ${app.bank === 'A' ? 'Sozo' : 'Ciru'}`);

    const imageBox = document.createElement('span');
    imageBox.className = 'app-card-image';
    const image = document.createElement('img');
    image.src = app.thumbnail;
    image.alt = `${app.title} preview`;
    image.loading = app.id === '01' ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.onerror = () => thumbnailFallback(image, app);
    imageBox.append(image);

    const body = document.createElement('span');
    body.className = 'app-card-body';
    const meta = document.createElement('span');
    meta.className = 'app-card-meta';
    const machine = document.createElement('span');
    machine.textContent = `${app.id} / ${app.bank === 'A' ? 'Sozo' : 'Ciru'}`;
    const type = document.createElement('span');
    type.className = 'card-type';
    type.textContent = app.kind;
    meta.append(machine, type);
    const title = document.createElement('strong');
    title.className = 'app-card-title';
    title.textContent = app.title;
    const description = document.createElement('span');
    description.className = 'app-card-description';
    description.textContent = app.description;
    body.append(meta, title, description);
    card.append(imageBox, body);
    card.addEventListener('click', () => openApp(app.id, true));
    fragment.append(card);
  }
  gallery.append(fragment);
  $('#gallery-count').textContent = `SHOWING ${apps.length} OF 64 ARTIFACTS`;
  $('#empty-state').hidden = apps.length !== 0;
}

function setFilter(group, value) {
  state[group] = value;
  for (const button of document.querySelectorAll(`[data-${group}]`)) {
    const selected = button.dataset[group] === value;
    button.classList.toggle('segmented-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  renderGallery();
}

function renderMosaic() {
  const picks = ['09','21','24','03','06','37','46','12','15','49','43','18','31','52','38','56'];
  const mosaic = $('#hero-mosaic');
  for (const id of picks) {
    const app = state.apps.find((item) => item.id === id);
    if (!app) continue;
    const img = document.createElement('img');
    img.src = app.thumbnail;
    img.alt = '';
    img.decoding = 'async';
    img.onerror = () => { img.style.visibility = 'hidden'; };
    mosaic.append(img);
  }
}

function openApp(id, updateHistory = false) {
  const app = state.apps.find((item) => item.id === id);
  if (!app) return;
  if (viewer.hidden) state.previousFocus = document.activeElement;
  state.current = app;
  $('#viewer-kicker').textContent = `${app.id} / ${app.bank === 'A' ? 'SOZO' : 'CIRU'} / ${app.kind.toUpperCase()}`;
  $('#viewer-title').textContent = app.title;
  $('#viewer-brief').textContent = app.brief;
  frame.title = `${app.title}, generated ${app.kind}`;
  frame.src = app.app;
  viewer.hidden = false;
  document.body.classList.add('modal-open');
  $('[data-close].viewer-close').focus();
  if (updateHistory) {
    const url = new URL(location.href);
    url.searchParams.set('app', app.id);
    history.pushState({ app: app.id }, '', url);
  }
}

function closeApp(updateHistory = true) {
  if (viewer.hidden) return;
  viewer.hidden = true;
  document.body.classList.remove('modal-open');
  frame.removeAttribute('src');
  state.current = null;
  if (updateHistory) {
    const url = new URL(location.href);
    url.searchParams.delete('app');
    history.replaceState({}, '', url);
  }
  state.previousFocus?.focus?.();
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function drawSpeedChart(rows) {
  const svg = $('#speed-chart');
  const W = 920, H = 255, left = 47, right = 10, top = 14, bottom = 30;
  const width = W - left - right, height = H - top - bottom;
  const maxT = 332.44, maxY = 1200;
  const x = (t) => left + (t / maxT) * width;
  const y = (v) => top + height - (v / maxY) * height;
  svg.replaceChildren();

  for (const value of [0, 400, 800, 1200]) {
    const gy = y(value);
    svg.append(svgElement('line', { x1: left, y1: gy, x2: W - right, y2: gy, stroke: 'rgba(255,255,255,.12)', 'stroke-dasharray': value === 0 ? '' : '3 5' }));
    const label = svgElement('text', { x: left - 9, y: gy + 4, fill: '#777d88', 'font-family': 'IBM Plex Mono,monospace', 'font-size': 10, 'text-anchor': 'end' });
    label.textContent = value.toLocaleString();
    svg.append(label);
  }
  for (const value of [0, 60, 120, 180, 240, 300]) {
    const label = svgElement('text', { x: x(value), y: H - 5, fill: '#777d88', 'font-family': 'IBM Plex Mono,monospace', 'font-size': 10, 'text-anchor': value === 0 ? 'start' : 'middle' });
    label.textContent = `${Math.floor(value / 60)}:${String(value % 60).padStart(2,'0')}`;
    svg.append(label);
  }
  const series = [
    { key: 'a', color: '#ff5860', width: 2 },
    { key: 'b', color: '#42d9ef', width: 2 },
    { key: 'total', color: '#f6f5f1', width: 2.8 },
  ];
  for (const item of series) {
    const points = rows.filter((row) => row.t >= 5).map((row, i) => `${i ? 'L' : 'M'}${x(row.t).toFixed(1)},${y(item.key === 'total' ? row.a + row.b : row[item.key]).toFixed(1)}`).join(' ');
    svg.append(svgElement('path', { d: points, fill: 'none', stroke: item.color, 'stroke-width': item.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
  }
  const marker = svgElement('line', { x1: 0, y1: top, x2: 0, y2: top + height, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1, visibility: 'hidden' });
  svg.append(marker);
  const overlay = svgElement('rect', { x: left, y: top, width, height, fill: 'transparent' });
  svg.append(overlay);
  const hover = $('#chart-hover');
  overlay.addEventListener('pointermove', (event) => {
    const box = svg.getBoundingClientRect();
    const t = Math.max(0, Math.min(maxT, ((event.clientX - box.left) / box.width * W - left) / width * maxT));
    const row = rows.reduce((best, candidate) => Math.abs(candidate.t - t) < Math.abs(best.t - t) ? candidate : best, rows[0]);
    const px = x(row.t);
    marker.setAttribute('x1', px);
    marker.setAttribute('x2', px);
    marker.setAttribute('visibility', 'visible');
    hover.innerHTML = `<b>${Math.floor(row.t / 60)}:${String(Math.floor(row.t % 60)).padStart(2,'0')}</b><br>Combined ${Math.round(row.a + row.b).toLocaleString()} tok/s<br>Sozo ${Math.round(row.a)} · Ciru ${Math.round(row.b)}`;
    hover.hidden = false;
    hover.style.left = `${Math.min(box.width - 170, Math.max(0, event.clientX - box.left + 12))}px`;
    hover.style.top = `${Math.max(0, event.clientY - box.top - 70)}px`;
  });
  overlay.addEventListener('pointerleave', () => { marker.setAttribute('visibility', 'hidden'); hover.hidden = true; });
}

async function init() {
  try {
    const [appsResponse, speedResponse] = await Promise.all([fetch('apps.json'), fetch('speed.json')]);
    if (!appsResponse.ok || !speedResponse.ok) throw new Error('Showcase data unavailable');
    state.apps = await appsResponse.json();
    const speeds = await speedResponse.json();
    if (state.apps.length !== 64 || speeds.length < 2) throw new Error('Incomplete showcase data');
    renderMosaic();
    renderGallery();
    drawSpeedChart(speeds);
    const linked = new URL(location.href).searchParams.get('app');
    if (linked) openApp(linked.padStart(2, '0'));
  } catch (error) {
    $('#gallery-count').textContent = 'THE WALL COULD NOT LOAD';
    $('#empty-state').textContent = 'The gallery data is temporarily unavailable. Please refresh this page.';
    $('#empty-state').hidden = false;
    console.error(error);
  }
}

for (const button of document.querySelectorAll('[data-bank]')) button.addEventListener('click', () => setFilter('bank', button.dataset.bank));
for (const button of document.querySelectorAll('[data-kind]')) button.addEventListener('click', () => setFilter('kind', button.dataset.kind));
$('#search').addEventListener('input', (event) => { state.query = event.target.value; renderGallery(); });
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => closeApp());
$('#viewer-reload').addEventListener('click', () => { if (state.current) frame.src = state.current.app; });
$('#viewer-link').addEventListener('click', async () => {
  if (!state.current) return;
  const url = new URL(location.href);
  url.searchParams.set('app', state.current.id);
  try {
    await navigator.clipboard.writeText(url.href);
    const label = $('#viewer-link span');
    label.textContent = 'Copied';
    setTimeout(() => { label.textContent = 'Copy link'; }, 1600);
  } catch { window.prompt('Copy this app link:', url.href); }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeApp(); });
window.addEventListener('popstate', () => {
  const id = new URL(location.href).searchParams.get('app');
  if (id) openApp(id.padStart(2,'0'));
  else closeApp(false);
});
init();
