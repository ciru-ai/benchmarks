(() => {
  "use strict";

  const records = JSON.parse(document.getElementById("measurements").textContent);
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const seconds = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
  const series = [
    { key: "ciru", label: "Ciru RCS" },
    { key: "spark", label: "2× DGX Spark" }
  ];
  const suites = {
    prefill: {
      title: "Prompt processing",
      axis: "Prompt length",
      pointLabel: row => row.size,
      detail: row => row.size + " tokens",
      modes: [
        { label: "Throughput", field: "TokensPerSecond", unit: "tok/s", step: 800 },
        { label: "First token", field: "FirstTokenMs", unit: "s", step: 40, lower: true, seconds: true }
      ]
    },
    decode: {
      title: "Token generation",
      axis: "Concurrent streams",
      pointLabel: row => row.streams,
      detail: row => row.streams + (row.streams === 1 ? " stream" : " streams"),
      modes: [
        { label: "Total throughput", field: "TotalTokensPerSecond", unit: "tok/s", step: 30 },
        { label: "Per stream", field: "PerStreamTokensPerSecond", unit: "tok/s", step: 20 }
      ]
    }
  };

  const ns = "http://www.w3.org/2000/svg";
  function node(tag, attributes, parent, value) {
    const child = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([name, data]) => child.setAttribute(name, data));
    if (value !== undefined) child.textContent = value;
    parent.appendChild(child);
    return child;
  }

  function plot(container) {
    const kind = container.dataset.chart;
    const suite = suites[kind];
    const rows = records[kind];
    let current = 3;
    let mode = suite.modes[0];
    let points = [];
    const prefix = "sd-" + kind;
    container.classList.add("sd-chart");
    container.innerHTML = `
      <div class="sd-toolbar">
        <div class="sd-modes" role="group" aria-label="${suite.title} metric"></div>
        <div class="sd-direction"></div>
      </div>
      <div class="sd-plot" role="slider" tabindex="0" aria-orientation="horizontal" aria-label="${suite.title} measurements" aria-valuemin="1" aria-valuemax="${rows.length}" aria-describedby="${prefix}-hint">
        <svg aria-hidden="true" focusable="false"></svg>
      </div>
      <span class="sd-sr" id="${prefix}-hint">Use the left and right arrow keys to explore measurements. Home selects the first and End selects the last.</span>
      <div class="sd-readout">
        <div class="sd-pick"><span class="sd-pick-label">${suite.axis}</span><div class="sd-stepper">
          <button type="button" aria-label="Previous ${suite.axis.toLowerCase()}">‹</button><strong></strong>
          <button type="button" aria-label="Next ${suite.axis.toLowerCase()}">›</button>
        </div></div>
        ${series.map(s => `<div class="sd-value sd-value-${s.key}"><span class="sd-series"><i aria-hidden="true"></i>${s.label}</span><div><strong></strong> <small></small></div></div>`).join("")}
      </div>`;
    const toolbar = container.querySelector(".sd-modes");
    const direction = container.querySelector(".sd-direction");
    const surface = container.querySelector(".sd-plot");
    const svg = surface.firstElementChild;
    const chosen = container.querySelector(".sd-stepper strong");
    const [previous, next] = container.querySelectorAll(".sd-stepper button");
    const values = Array.from(container.querySelectorAll(".sd-value"));
    const modeButtons = suite.modes.map(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => { mode = item; draw(); });
      toolbar.appendChild(button);
      return button;
    });

    function amount(row, key) {
      return row[key + mode.field] / (mode.seconds ? 1000 : 1);
    }

    function show(index) {
      current = Math.max(0, Math.min(rows.length - 1, index));
      const row = rows[current];
      const label = suite.detail(row);
      chosen.textContent = label;
      previous.disabled = current === 0;
      next.disabled = current === rows.length - 1;
      const descriptions = series.map((s, i) => {
        const value = (mode.seconds ? seconds : number).format(amount(row, s.key));
        values[i].querySelector("strong").textContent = value;
        values[i].querySelector("small").textContent = mode.unit;
        return s.label + " " + value + " " + mode.unit;
      });
      surface.setAttribute("aria-valuenow", current + 1);
      surface.setAttribute("aria-valuetext", [label, mode.label, ...descriptions].join(", "));
      svg.querySelectorAll("[data-sd-index]").forEach(el => {
        el.classList.toggle("sd-selected", Number(el.dataset.sdIndex) === current);
      });
    }

    function draw() {
      const width = Math.max(1, surface.clientWidth);
      if (width < 90) return;
      const small = width < 480;
      const height = small ? 207 : 235;
      const left = small ? 36 : 48;
      const right = small ? 19 : 30;
      const top = 22;
      const bottom = height - 35;
      const span = width - left - right;
      const isLine = kind === "prefill";
      const spacing = span / (isLine ? rows.length - 1 : rows.length);
      points = rows.map((_, i) => left + (isLine ? i : i + 0.5) * spacing);
      const maxY = mode.step * 4;
      const y = value => bottom - value / maxY * (bottom - top);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("height", height);
      svg.replaceChildren();
      modeButtons.forEach((button, i) => button.setAttribute("aria-pressed", suite.modes[i] === mode));
      direction.textContent = mode.lower ? "↓  Lower is faster" : "↑  Higher is faster";

      const defs = node("defs", {}, svg);
      for (const s of series) {
        const gradient = node("linearGradient", {id: prefix + "-" + s.key, x1: "0", x2: "0", y1: "0", y2: "1"}, defs);
        const color = s.key === "ciru" ? "#ff554e" : "#60d5e8";
        node("stop", {offset: 0, "stop-color": color, "stop-opacity": isLine ? 0.2 : 0.94}, gradient);
        node("stop", {offset: 1, "stop-color": color, "stop-opacity": isLine ? 0 : 0.34}, gradient);
      }
      for (let tick = 0; tick <= 4; tick++) {
        const value = mode.step * tick;
        const lineY = y(value);
        node("line", {x1: left, y1: lineY, x2: width - right, y2: lineY,
          class: tick === 0 ? "sd-base" : "sd-grid"}, svg);
        node("text", {x: left - 8, y: lineY + 4, "text-anchor": "end", class: "sd-tick"}, svg, number.format(value));
      }
      rows.forEach((row, i) => {
        if (isLine) {
          node("line", {x1: points[i], x2: points[i], y1: top - 4, y2: bottom, class: "sd-guide",
            "data-sd-index": i}, svg);
        } else {
          const w = Math.min(spacing * 0.9, 120);
          node("rect", {x: points[i] - w / 2, y: top - 7, width: w, height: bottom - top + 7,
            rx: 3, class: "sd-band", "data-sd-index": i}, svg);
        }
        node("text", {x: points[i], y: bottom + 23, "text-anchor": "middle",
          class: "sd-x-label", "data-sd-index": i}, svg, suite.pointLabel(row));
      });

      for (const [si, s] of series.entries()) {
        const h = rows.map(row => y(amount(row, s.key)));
        if (isLine) {
          const trace = h.map((lineY, i) => `${i === 0 ? "M" : "L"}${points[i]} ${lineY}`).join(" ");
          if (si === 0) {
            node("path", {d: trace + `L${points.at(-1)} ${bottom} L${points[0]} ${bottom} Z`,
              fill: `url(#${prefix}-${s.key})`}, svg);
          }
          node("path", {d: trace, class: "sd-line sd-line-" + s.key}, svg);
          rows.forEach((_, i) => {
            const group = node("g", {transform: `translate(${points[i]} ${h[i]})`,
              class: "sd-point sd-point-" + s.key, "data-sd-index": i}, svg);
            node("circle", {r: 8, class: "sd-halo"}, group);
            if (si === 0) node("circle", {r: 3.8, class: "sd-dot"}, group);
            else node("path", {d: "M0 -4.5 L4.5 0 L0 4.5 L-4.5 0 Z", class: "sd-dot"}, group);
          });
        } else {
          const barWidth = Math.min(spacing * 0.26, 33);
          h.forEach((barY, i) => {
            const barX = points[i] + (si === 0 ? -barWidth - 2 : 2);
            const group = node("g", {class: "sd-bar", "data-sd-index": i}, svg);
            node("rect", {x: barX, y: barY, width: barWidth, height: bottom - barY,
              fill: `url(#${prefix}-${s.key})`}, group);
            node("line", {x1: barX, x2: barX + barWidth, y1: barY, y2: barY,
              class: "sd-bar-top sd-bar-top-" + s.key}, group);
          });
        }
      }
      show(current);
    }

    function pick(event) {
      if (!points.length) return;
      const x = event.clientX - surface.getBoundingClientRect().left;
      const nearest = points.reduce((best, point, i) =>
        Math.abs(point - x) < Math.abs(points[best] - x) ? i : best, 0);
      if (nearest !== current) show(nearest);
    }
    previous.addEventListener("click", () => { show(current - 1); if (previous.disabled) next.focus(); });
    next.addEventListener("click", () => { show(current + 1); if (next.disabled) previous.focus(); });
    surface.addEventListener("pointerdown", pick);
    surface.addEventListener("pointermove", event => {
      if (event.pointerType === "mouse" || event.buttons) pick(event);
    });
    surface.addEventListener("keydown", event => {
      const moves = {ArrowLeft: current - 1, ArrowDown: current - 1, ArrowRight: current + 1,
        ArrowUp: current + 1, Home: 0, End: rows.length - 1};
      if (Object.hasOwn(moves, event.key)) {
        event.preventDefault();
        show(moves[event.key]);
      }
    });
    new ResizeObserver(draw).observe(surface);
    draw();
  }

  document.querySelectorAll("[data-chart]").forEach(el => { if (suites[el.dataset.chart]) plot(el); });
})();
