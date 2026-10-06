(function () {
  'use strict';

  const root = document.getElementById('research-timeline');
  if (!root) return;
  const latestUrl = '/ben/';
  const currentRevision = root.dataset.currentReport ? String(root.dataset.currentReport).padStart(2, '0') : '';
  const source = '/ben/progress/milestones.json';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data, milestones = [], phases = [], visible = [], selectedId = null;
  let typeFilter = 'all', phaseFilter = 'all', detailsOpen = false;
  let latestReport = null;
  let refs = {};

  function make(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined && text !== null) item.textContent = String(text);
    return item;
  }

  function safeReportUrl(value) {
    if (typeof value !== 'string' || !value.startsWith('/ben/') || value.startsWith('//')) return null;
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin && url.pathname.startsWith('/ben/') ? url.pathname + url.search + url.hash : null;
    } catch (_) { return null; }
  }

  function revisionOf(item) {
    return item.report_revision == null ? '' : String(item.report_revision).padStart(2, '0');
  }

  function readable(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/^\w/, function (s) { return s.toUpperCase(); });
  }

  function phaseName(id) {
    const phase = phases.find(function (item) { return item.id === id; });
    return phase ? phase.label : readable(id);
  }

  function shortPhaseName(phase) {
    const labels = {
      '00-model-screening': 'Model screening',
      '01-foundation': 'Foundation',
      '02-work-reduction': 'Less work',
      '03-literal-evidence': 'Literal evidence',
      '04-narrow-components': 'Narrow roles',
      '05-whole-claim': 'Claim checks',
      '06-generation-reduction': 'Compact output',
      '07-specialists-and-whole-roles': 'Specialists',
      '08-current-frontier': 'Current frontier',
      '09-source-proposals': 'Source proposals',
      '10-mlx-runtime': 'MLX runtime',
      '11-specialized-audit': 'Specialized audit'
    };
    return phase.short_label || labels[phase.id] || phase.label;
  }

  function link(text, url, className) {
    const anchor = make('a', className, text);
    anchor.href = url;
    return anchor;
  }

  function buildShell() {
    root.replaceChildren();
    root.setAttribute('role', 'region');
    root.setAttribute('aria-labelledby', 'rt-title');
    const shell = make('div', 'rt-shell');
    const heading = make('div', 'rt-heading');
    const titleGroup = make('div', 'rt-title-group');
    titleGroup.append(make('p', 'rt-kicker', 'CIRU INFERENCE LAB · REPORT HISTORY'));
    const title = make('h2', '', 'Research progress');
    title.id = 'rt-title';
    titleGroup.append(title);
    const reading = make('div', 'rt-reading');
    const isHistorical = latestReport && currentRevision && currentRevision !== revisionOf(latestReport);
    const label = isHistorical ? 'Historical report · revision ' + currentRevision : 'Current report · revision ' + (currentRevision || revisionOf(latestReport));
    reading.append(make('span', 'rt-reading-label' + (isHistorical ? ' rt-historical' : ''), label));
    if (isHistorical) reading.append(link('Read the latest ↗', latestUrl, ''));
    else if (data.snapshot_label) reading.append(make('span', '', data.snapshot_label));
    heading.append(titleGroup, reading);
    shell.append(heading);

    const reports = make('nav', 'rt-reports');
    reports.setAttribute('aria-label', 'Published report editions');
    reports.append(make('span', 'rt-reports-label', 'Read an edition'));
    milestones.filter(function (item) { return safeReportUrl(item.report_url); }).forEach(function (item) {
      const rev = revisionOf(item);
      const reportLink = link(rev ? 'Report ' + rev : item.short_label || item.title, safeReportUrl(item.report_url), 'rt-report-link');
      reportLink.setAttribute('aria-label', (rev ? 'Report ' + rev + ': ' : '') + item.title);
      if (rev && rev === currentRevision) reportLink.setAttribute('aria-current', 'page');
      if (latestReport && item.id === latestReport.id) reportLink.append(make('small', '', 'LATEST'));
      reports.append(reportLink);
    });
    shell.append(reports);

    const controls = make('div', 'rt-controls');
    const filters = make('div', 'rt-filters');
    const typeButtons = make('div', 'rt-filter-buttons');
    typeButtons.setAttribute('role', 'group');
    typeButtons.setAttribute('aria-label', 'Filter research history');
    ['all', 'reports'].forEach(function (kind) {
      const button = make('button', '', kind === 'all' ? 'All candidates' : 'Reports');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(kind === typeFilter));
      button.dataset.rtFilter = kind;
      button.addEventListener('click', function () {
        typeFilter = kind;
        typeButtons.querySelectorAll('button').forEach(function (other) {
          other.setAttribute('aria-pressed', String(other.dataset.rtFilter === kind));
        });
        filterAndRender();
      });
      typeButtons.append(button);
    });
    const phaseLabel = make('label', 'rt-phase-label');
    phaseLabel.append(make('span', '', 'Phase'));
    const phaseSelect = make('select');
    phaseSelect.setAttribute('aria-label', 'Filter by research phase');
    const allOption = make('option', '', 'All phases');
    allOption.value = 'all';
    phaseSelect.append(allOption);
    phases.forEach(function (phase) {
      const option = make('option', '', phase.label);
      option.value = phase.id;
      phaseSelect.append(option);
    });
    phaseSelect.addEventListener('change', function () {
      phaseFilter = phaseSelect.value;
      filterAndRender();
    });
    phaseLabel.append(phaseSelect);
    filters.append(typeButtons, phaseLabel);

    const navigation = make('div', 'rt-navigation');
    const count = make('span', 'rt-count');
    const previous = make('button', '', '←');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous milestone');
    previous.addEventListener('click', function () { move(-1); });
    const next = make('button', '', '→');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next milestone');
    next.addEventListener('click', function () { move(1); });
    navigation.append(count, previous, next);
    controls.append(filters, navigation);
    shell.append(controls);

    const phaseOverview = make('div', 'rt-phase-overview');
    phaseOverview.setAttribute('role', 'group');
    phaseOverview.setAttribute('aria-label', 'The full research journey, by phase');
    phases.forEach(function (phase, index) {
      const isCurrent = index === phases.length - 1;
      const phaseButton = make('button', 'rt-phase-segment' + (isCurrent ? ' rt-phase-current' : ''));
      phaseButton.type = 'button';
      phaseButton.dataset.rtPhase = phase.id;
      phaseButton.setAttribute('aria-pressed', 'false');
      phaseButton.setAttribute('aria-label', 'Show phase ' + (index + 1) + ': ' + phase.label + (isCurrent ? '. Current research frontier.' : ''));
      const phaseText = make('span', 'rt-phase-segment-label', shortPhaseName(phase));
      phaseText.setAttribute('aria-hidden', 'true');
      phaseButton.append(phaseText);
      if (isCurrent) {
        const currentMark = make('span', 'rt-phase-current-mark', 'Current');
        currentMark.setAttribute('aria-hidden', 'true');
        phaseButton.append(currentMark);
      }
      phaseButton.addEventListener('click', function () {
        phaseFilter = phaseFilter === phase.id ? 'all' : phase.id;
        filterAndRender();
      });
      phaseOverview.append(phaseButton);
    });
    const phaseCaption = make('p', 'rt-phase-caption');
    shell.append(phaseOverview, phaseCaption);

    const viewport = make('div', 'rt-rail-viewport');
    const rail = make('ol', 'rt-rail');
    rail.setAttribute('aria-label', 'Research milestones, grouped by development phase');
    viewport.append(rail);
    shell.append(viewport);
    const note = make('div', 'rt-rail-note');
    note.append(make('p', '', 'Research history · grouped by method · not a completion percentage'));
    note.append(link('Progress overview ↗', '/ben/#progress-overview', ''));
    shell.append(note);

    const panel = make('div', 'rt-panel');
    panel.id = 'rt-milestone-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'rt-selected-title');
    shell.append(panel);
    const live = make('p', 'rt-sr-only');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    shell.append(live);
    root.append(shell);
    refs = { shell, rail, viewport, panel, count, previous, next, live, phaseSelect, phaseOverview, phaseCaption };
  }

  function filterAndRender() {
    refs.phaseSelect.value = phaseFilter;
    refs.phaseOverview.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.rtPhase === phaseFilter));
    });
    const activePhase = phases.find(function (phase) { return phase.id === phaseFilter; });
    const currentPhase = phases[phases.length - 1];
    refs.phaseCaption.textContent = (activePhase ? 'Viewing ' + shortPhaseName(activePhase) : 'All phases') + (currentPhase ? ' · Current: ' + shortPhaseName(currentPhase) : '');
    visible = milestones.filter(function (item) {
      return (typeFilter === 'all' || safeReportUrl(item.report_url)) && (phaseFilter === 'all' || item.phase === phaseFilter);
    });
    if (!visible.some(function (item) { return item.id === selectedId; })) {
      selectedId = visible.length ? visible[visible.length - 1].id : null;
    }
    renderRail();
    renderPanel();
    scrollSelected(false);
  }

  function renderRail() {
    refs.rail.replaceChildren();
    let priorPhase = null;
    visible.forEach(function (item, index) {
      const hasReport = Boolean(safeReportUrl(item.report_url));
      const phaseStart = item.phase !== priorPhase;
      const stop = make('li', 'rt-stop' + (phaseStart ? ' rt-phase-start' : '') + (hasReport ? ' rt-has-report' : ''));
      if (phaseStart) stop.append(make('span', 'rt-phase-name', phaseName(item.phase)));
      priorPhase = item.phase;
      const button = make('button', 'rt-stop-button');
      button.type = 'button';
      button.dataset.rtMilestone = item.id;
      button.setAttribute('aria-pressed', String(item.id === selectedId));
      button.setAttribute('aria-controls', 'rt-milestone-panel');
      button.setAttribute('aria-label', item.title + '. ' + (item.date_label || '') + '. ' + readable(item.status) + (hasReport ? '. Full report available.' : '. Read summary.'));
      const node = make('span', 'rt-node');
      node.setAttribute('aria-hidden', 'true');
      button.append(node, make('span', 'rt-stop-title', item.short_label || item.title));
      const meta = make('span', 'rt-stop-meta', item.date_label || (hasReport ? 'Published report' : readable(item.kind)));
      if (latestReport && item.id === latestReport.id) meta.append(make('span', 'rt-stop-current', 'Latest report'));
      button.append(meta);
      button.addEventListener('click', function () { select(item.id, true); });
      button.addEventListener('keydown', function (event) {
        let target = null;
        if (event.key === 'ArrowLeft') target = Math.max(0, index - 1);
        else if (event.key === 'ArrowRight') target = Math.min(visible.length - 1, index + 1);
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = visible.length - 1;
        if (target !== null) {
          event.preventDefault();
          select(visible[target].id, true);
          const selectedButton = refs.rail.querySelector('[aria-pressed="true"]');
          if (selectedButton) selectedButton.focus({ preventScroll: true });
        }
      });
      stop.append(button);
      refs.rail.append(stop);
    });
    if (!visible.length) refs.rail.append(make('li', 'rt-empty', 'No published reports in this phase. Choose All candidates to read the summaries.'));
  }

  function renderPanel() {
    refs.panel.replaceChildren();
    const item = visible.find(function (milestone) { return milestone.id === selectedId; });
    const index = visible.findIndex(function (milestone) { return milestone.id === selectedId; });
    refs.count.textContent = item ? (index + 1) + ' / ' + visible.length + ' milestones' : '0 milestones';
    refs.previous.disabled = index <= 0;
    refs.next.disabled = index < 0 || index >= visible.length - 1;
    refs.panel.hidden = !item;
    if (!item) return;

    const top = make('div', 'rt-panel-top');
    const heading = make('div', 'rt-panel-heading');
    const title = make('h3', '', item.title);
    title.id = 'rt-selected-title';
    heading.append(title);
    const badges = make('div', 'rt-panel-badges');
    badges.append(make('span', 'rt-kind', phaseName(item.phase)));
    if (item.status) badges.append(make('span', 'rt-status', readable(item.status)));
    if (item.date_label) badges.append(make('span', '', item.date_label));
    heading.append(badges);
    const actions = make('div', 'rt-panel-actions');
    const toggle = make('button', 'rt-details-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'rt-detail-content');
    toggle.setAttribute('aria-expanded', String(detailsOpen));
    function toggleContent() {
      const mark = make('span', '', detailsOpen ? '−' : '+');
      mark.setAttribute('aria-hidden', 'true');
      toggle.replaceChildren(document.createTextNode(detailsOpen ? 'Hide details' : 'Details'), mark);
    }
    toggleContent();
    const reportUrl = safeReportUrl(item.report_url);
    if (reportUrl) actions.append(link('Read report ' + revisionOf(item) + ' ↗', reportUrl, 'rt-view-report'));
    actions.append(toggle);
    top.append(heading, actions);
    refs.panel.append(top, make('p', 'rt-panel-summary', item.summary));

    const detail = make('div', 'rt-detail-content');
    detail.id = 'rt-detail-content';
    detail.hidden = !detailsOpen;
    const grid = make('div', 'rt-detail-grid');
    [['Method', item.method], ['Result', item.result], ['What we learned', item.lesson]].forEach(function (entry) {
      if (!entry[1]) return;
      const list = make('dl');
      list.append(make('dt', '', entry[0]), make('dd', '', entry[1]));
      grid.append(list);
    });
    detail.append(grid);
    if (Array.isArray(item.metrics) && item.metrics.length) {
      const metrics = make('div', 'rt-metrics');
      item.metrics.forEach(function (metric) {
        const metricNode = make('div', 'rt-metric');
        metricNode.append(make('strong', '', metric.value), make('span', '', metric.label));
        metrics.append(metricNode);
      });
      detail.append(metrics);
    }
    if (Array.isArray(item.evidence) && item.evidence.length) {
      const evidence = make('p', 'rt-evidence');
      evidence.append(make('b', '', 'Evidence: '), document.createTextNode(item.evidence.join(' · ')));
      detail.append(evidence);
    }
    toggle.addEventListener('click', function () {
      detailsOpen = !detailsOpen;
      detail.hidden = !detailsOpen;
      toggle.setAttribute('aria-expanded', String(detailsOpen));
      toggleContent();
    });
    refs.panel.append(detail);
  }

  function select(id, updateUrl) {
    if (!visible.some(function (item) { return item.id === id; })) return;
    selectedId = id;
    refs.rail.querySelectorAll('.rt-stop-button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.rtMilestone === id));
    });
    renderPanel();
    scrollSelected(true);
    const item = visible.find(function (milestone) { return milestone.id === id; });
    refs.live.textContent = item.title + '. ' + readable(item.status) + '. Summary displayed below the timeline.';
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('milestone', id);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  }

  function move(direction) {
    const index = visible.findIndex(function (item) { return item.id === selectedId; });
    const next = visible[index + direction];
    if (next) select(next.id, true);
  }

  function scrollSelected(animate) {
    const button = refs.rail.querySelector('[aria-pressed="true"]');
    if (!button) return;
    requestAnimationFrame(function () {
      const containerRect = refs.viewport.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const target = refs.viewport.scrollLeft + buttonRect.left - containerRect.left - (containerRect.width - buttonRect.width) / 2;
      refs.viewport.scrollTo({ left: Math.max(0, target), behavior: animate && !reducedMotion ? 'smooth' : 'auto' });
    });
  }

  function showFailure() {
    root.replaceChildren();
    const shell = make('div', 'rt-shell');
    const text = make('p', 'rt-loading', 'The research timeline could not be loaded. ');
    text.append(link('Read the latest report ↗', latestUrl, ''));
    shell.append(text);
    root.append(shell);
  }

  const loadingShell = make('div', 'rt-shell');
  loadingShell.append(make('p', 'rt-loading', 'Loading the research journey…'));
  root.append(loadingShell);
  fetch(source, { credentials: 'same-origin' }).then(function (response) {
    if (!response.ok) throw new Error('Timeline unavailable');
    return response.json();
  }).then(function (result) {
    if (!result || !Array.isArray(result.milestones) || !result.milestones.length) throw new Error('Timeline empty');
    data = result;
    milestones = result.milestones.filter(function (item) { return item && typeof item.id === 'string' && item.title; });
    if (!milestones.length) throw new Error('Timeline empty');
    phases = Array.isArray(result.phases) ? result.phases : [];
    const reports = milestones.filter(function (item) { return safeReportUrl(item.report_url); });
    latestReport = reports[reports.length - 1] || null;
    const queryId = new URL(location.href).searchParams.get('milestone');
    const requested = milestones.find(function (item) { return item.id === queryId; });
    const current = milestones.find(function (item) { return revisionOf(item) === currentRevision; });
    selectedId = (requested || current || latestReport || milestones[milestones.length - 1]).id;
    buildShell();
    filterAndRender();
  }).catch(showFailure);
})();
