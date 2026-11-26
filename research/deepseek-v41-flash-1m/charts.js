(() => {
  'use strict';

  const film = document.getElementById('brand-film');
  const motion = document.getElementById('motion');
  const quiet = matchMedia('(prefers-reduced-motion: reduce)');
  function updateMotion() {
    motion.setAttribute('aria-label', film.paused ? 'Play Ciru RCS logo animation' : 'Pause Ciru RCS logo animation');
  }
  motion.disabled = false;
  motion.addEventListener('click', () => film.paused ? film.play().catch(updateMotion) : film.pause());
  film.addEventListener('playing', updateMotion);
  film.addEventListener('pause', updateMotion);
  film.addEventListener('error', () => { motion.disabled = true; });
  quiet.addEventListener('change', ({ matches }) => { if (matches) film.pause(); });
  if (!quiet.matches) film.play().catch(updateMotion);

  if (!window.echarts) return;
  const options = JSON.parse(document.getElementById('chart-data').textContent);
  const compact = matchMedia('(max-width: 480px)');
  const decodeRenders = [];
  const formatRate = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let metric = 'aggregate';

  for (const element of document.querySelectorAll('[data-chart]')) {
    const key = element.dataset.chart;
    const panel = element.closest('[data-decode-panel]');
    const cells = panel ? [...panel.querySelectorAll('td[data-series]')] : [];
    const chart = echarts.init(element, null, { renderer: 'svg' });

    function render() {
      const option = structuredClone(panel ? options[key][metric] : options[key]);
      option.animation = !quiet.matches;
      if (compact.matches) {
        const horizontal = key === 'wins' || key === 'million';
        option.grid.left = horizontal ? 82 : 42;
        option.grid.right = horizontal ? 41 : 13;
      }
      chart.setOption(option, { notMerge: true });
      const applied = chart.getOption();
      for (const cell of cells) {
        const { series, point } = cell.dataset;
        const row = applied.series[series].data[point];
        cell.textContent = formatRate.format(row[1]);
      }
    }
    render();
    if (panel) decodeRenders.push(render);
    new ResizeObserver(() => chart.resize()).observe(element);
    compact.addEventListener('change', render);
    quiet.addEventListener('change', render);
  }

  const controls = document.getElementById('decode-controls');
  const buttons = [...controls.querySelectorAll('[data-metric]')];
  const measurement = {
    aggregate: 'Aggregate generation throughput, in tokens/s.',
    full: 'Ciru’s rate includes the entire request. MiaAI’s reference is her published decode-window rate.',
    stream: 'Average measured generation throughput for each stream, in tokens/s.',
  };
  for (const button of buttons) button.addEventListener('click', () => {
    metric = button.dataset.metric;
    decodeRenders.forEach(render => render());
    buttons.forEach(candidate => candidate.setAttribute('aria-pressed', candidate === button));
    document.getElementById('metric-explanation').textContent = measurement[metric];
  });
  controls.hidden = false;
})();
