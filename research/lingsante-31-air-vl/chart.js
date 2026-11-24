(() => {
  function init() {
    const host = document.getElementById("context-chart");
    if (!host) return;

    const values = Array.from(document.querySelectorAll("#matched tbody tr"), ({ dataset }) => ({
      prompt: Number(dataset.prompt),
      decode: [Number(dataset.rcsDecode), Number(dataset.llamaDecode)],
      prefill: [Number(dataset.rcsPrefill), Number(dataset.llamaPrefill)]
    }));
    if (!values.length || values.some(row => ![row.prompt, ...row.decode, ...row.prefill].every(n => n > 0))) return;

    const format = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const count = new Intl.NumberFormat("en-US");
    let selected = Math.max(0, values.findIndex(row => row.prompt === 32768));
    let metric = "decode";

    host.innerHTML = `
      <div class="cx-toolbar">
        <span class="cx-unit">Throughput <span>· tok/s</span></span>
        <div class="cx-switch" role="group" aria-label="Measurement">
          <button type="button" data-metric="decode" aria-pressed="true">Decode</button>
          <button type="button" data-metric="prefill" aria-pressed="false">Prefill</button>
        </div>
      </div>
      <svg class="cx-plot" aria-hidden="true"></svg>
      <div class="cx-axis" role="group" aria-label="Select input length"></div>
      <dl class="cx-readout" aria-live="polite" aria-atomic="true">
        <div><dt>Input tokens</dt><dd data-result="prompt"></dd></div>
        <div><dt><i class="cx-key cx-ciru"></i>Ciru RCS</dt><dd data-result="rcs"></dd></div>
        <div><dt><i class="cx-key cx-llama"></i>llama.cpp</dt><dd data-result="llama"></dd></div>
        <div><dt>RCS / llama.cpp</dt><dd data-result="ratio"></dd></div>
      </dl>`;

    const plot = host.querySelector(".cx-plot");
    const axis = host.querySelector(".cx-axis");
    const fields = Object.fromEntries(Array.from(host.querySelectorAll("[data-result]"), el => [el.dataset.result, el]));
    const switches = host.querySelectorAll("[data-metric]");
    const buttons = values.map((row, index) => {
      const button = document.createElement("button");
      button.type = "button";
      const kib = row.prompt / 1024;
      button.textContent = (Number.isInteger(kib) ? "" : "~") + Math.round(kib) + "K";
      button.setAttribute("aria-label", count.format(row.prompt) + " input tokens");
      button.addEventListener("click", () => select(index));
      button.addEventListener("keydown", event => {
        const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: values.length - 1 };
        if (!Object.hasOwn(targets, event.key)) return;
        event.preventDefault();
        const next = Math.max(0, Math.min(values.length - 1, targets[event.key]));
        select(next);
        buttons[next].focus();
      });
      axis.append(button);
      return button;
    });

    function geometry() {
      const width = plot.clientWidth;
      const gutter = parseFloat(getComputedStyle(axis).paddingLeft);
      return { width, gutter, step: (width - gutter) / values.length };
    }

    function draw() {
      const { width, gutter, step } = geometry();
      const height = plot.clientHeight;
      if (width <= gutter || !height) return;

      const peak = Math.max(...values.flatMap(row => row[metric]));
      const interval = metric === "decode" ? 25 : 1000;
      const ceiling = Math.ceil(peak / interval) * interval;
      const x = index => gutter + (index + 0.5) * step;
      const y = rate => height - 6 - (height - 19) * rate / ceiling;
      const series = ["cx-rcs-line", "cx-llama-line"];
      const marks = [];
      for (let level = 0; level <= ceiling; level += interval) {
        const label = level >= 1000 ? level / 1000 + "K" : level;
        marks.push(`<path class="cx-grid" d="M${gutter} ${y(level)} H${width}"/><text x="${gutter - 7}" y="${y(level)}" dy=".32em" text-anchor="end">${label}</text>`);
      }
      marks.push(`<path class="cx-cursor" d="M${x(selected)} 8 V${height - 5}"/>`);
      series.forEach((name, side) => {
        const coords = values.map((row, i) => [x(i), y(row[metric][side])]);
        marks.push(`<g class="${name}"><polyline points="${coords.map(pair => pair.join(",")).join(" ")}"/>`);
        coords.forEach(([cx, cy], i) => {
          marks.push(`<circle cx="${cx}" cy="${cy}" r="${i === selected ? 4.4 : 2.5}" class="${i === selected ? "cx-current" : "cx-point"}"/>`);
        });
        marks.push("</g>");
      });
      plot.setAttribute("viewBox", `0 0 ${width} ${height}`);
      plot.innerHTML = marks.join("");
    }

    function select(index) {
      selected = index;
      const row = values[index];
      const [rcs, llama] = row[metric];
      fields.prompt.textContent = count.format(row.prompt);
      fields.rcs.textContent = format.format(rcs);
      fields.llama.textContent = format.format(llama);
      fields.ratio.textContent = (rcs / llama).toFixed(2) + "×";
      buttons.forEach((button, i) => {
        button.setAttribute("aria-pressed", String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      draw();
    }

    switches.forEach(button => button.addEventListener("click", () => {
      metric = button.dataset.metric;
      switches.forEach(other => other.setAttribute("aria-pressed", String(other === button)));
      select(selected);
    }));

    function selectAt(event) {
      const { gutter, step } = geometry();
      const offset = event.clientX - plot.getBoundingClientRect().left;
      if (offset < gutter) return;
      const next = Math.min(values.length - 1, Math.floor((offset - gutter) / step));
      if (next !== selected) select(next);
    }
    plot.addEventListener("pointermove", event => { if (event.pointerType === "mouse") selectAt(event); });
    plot.addEventListener("click", selectAt);

    host.hidden = false;
    select(selected);
    new ResizeObserver(draw).observe(plot);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
