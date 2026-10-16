"use strict";

const palette = {
  ultra: "#ed1c24",
  vulkan: "#39d0ff",
  rocm: "#ff9f43",
  ollama: "#20d1a2",
  grid: "#303035",
  text: "#a6a6aa",
};

function font() {
  return '"IBM Plex Mono", monospace';
}

function showFallback(id) {
  const fallback = document.getElementById(id);
  if (fallback) fallback.hidden = false;
}

function chartBase() {
  return {
    backgroundColor: "transparent",
    animationDuration: 360,
    textStyle: { color: palette.text, fontFamily: '"IBM Plex Mono", monospace' },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#161619",
      borderColor: "#3b3b42",
      textStyle: { color: "#f7f7f4", fontSize: 11 },
      valueFormatter: value => `${Number(value).toFixed(2)}s`,
    },
  };
}

function renderFidelity(data) {
  const element = document.getElementById("fidelity-chart");
  const chart = echarts.init(element);
  const rows = data.fidelity.frozen;
  chart.setOption({
    ...chartBase(),
    tooltip: {
      ...chartBase().tooltip,
      valueFormatter: value => `${Number(value).toFixed(4)}%`,
    },
    grid: { left: 112, right: 60, top: 20, bottom: 20 },
    xAxis: { type: "value", min: 0, max: 100, splitNumber: 4,
      axisLabel: { color: palette.text, formatter: "{value}%", fontFamily: font() },
      splitLine: { lineStyle: { color: palette.grid, type: "dotted" } },
      axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "category", inverse: true, data: rows.map(row => row.label),
      axisLabel: { color: "#dedee0", fontSize: 11, fontFamily: font() },
      axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: "bar", barWidth: 22,
      data: rows.map(row => ({ value: row.rate * 100,
        itemStyle: { color: palette[row.id] } })),
      label: { show: true, position: "right", color: "#f7f7f4", fontFamily: font(),
        formatter: params => `${Number(params.value).toFixed(2)}%` } }],
  });
  return chart;
}

function renderSpeed(data) {
  const chart = echarts.init(document.getElementById("speed-chart"));
  const rowsById = Object.fromEntries(data.speed.map(row => [row.id, row]));
  const categories = ["C1 COLD", "C1 CACHED", "C8 COLD", "C8 CACHED"];
  const values = row => [row.c1.cold, row.c1.cached, row.c8.cold, row.c8.cached];

  function setTrack(track) {
    const selected = track === "publisher"
      ? [rowsById.ultra, rowsById["vulkan-publisher"], rowsById["rocm-publisher"]]
      : [rowsById.ultra, rowsById["vulkan-matched"], rowsById["rocm-matched"]];
    chart.setOption({
      ...chartBase(),
      legend: { top: 0, textStyle: { color: "#bbb", fontSize: 10, fontFamily: font() }, itemWidth: 13, itemHeight: 8 },
      grid: { left: 52, right: 15, top: 48, bottom: 46 },
      xAxis: { type: "category", data: categories, axisLabel: { color: palette.text, fontSize: 10, fontFamily: font(), interval: 0 },
        axisLine: { lineStyle: { color: palette.grid } }, axisTick: { show: false } },
      yAxis: { type: "value", min: 0, name: "SECONDS", nameTextStyle: { color: palette.text, fontSize: 9 },
        axisLabel: { color: palette.text, fontFamily: font() },
        splitLine: { lineStyle: { color: palette.grid, type: "dotted" } } },
      series: selected.map((row, index) => ({
        name: index === 0 ? "Ultra · saved matched" : index === 1 ? "Official Vulkan" : "Official ROCm",
        type: "bar", barMaxWidth: 42, emphasis: { focus: "series" },
        itemStyle: { color: [palette.ultra, palette.vulkan, palette.rocm][index] },
        data: values(row),
      })),
    }, true);
    document.querySelectorAll("[data-track]").forEach(button => {
      const active = button.dataset.track === track;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  document.querySelectorAll("[data-track]").forEach(button =>
    button.addEventListener("click", () => setTrack(button.dataset.track)));
  setTrack("matched");
  return chart;
}

function bindScenes(data) {
  const scenes = Object.fromEntries(data.amd.map(row => [row.id, row]));
  const image = document.getElementById("scene-image");
  const caption = document.getElementById("scene-caption");
  const full = document.getElementById("scene-full");
  function choose(id) {
    const row = scenes[id];
    if (!row) return;
    image.src = row.image;
    image.alt = `${row.label} AMD scene: metal AMD mark, dashboard panels and platform`;
    caption.textContent = `${row.label} · ${row.wall.toFixed(3)}s · ${row.repairs} automatic ${row.repairs === 1 ? "repair" : "repairs"}`;
    full.href = row.image;
    document.querySelectorAll("[data-scene]").forEach(button => {
      const active = button.dataset.scene === id;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  document.querySelectorAll("[data-scene]").forEach(button =>
    button.addEventListener("click", () => choose(button.dataset.scene)));
  choose("publisher");
}

document.addEventListener("DOMContentLoaded", async () => {
  let data;
  try {
    const response = await fetch("./evidence/comparison.json");
    if (!response.ok) throw new Error(`Metrics response ${response.status}`);
    data = await response.json();
    bindScenes(data);
  } catch (error) {
    console.error("Could not load the public benchmark data:", error);
    showFallback("fidelity-fallback");
    showFallback("speed-fallback");
    return;
  }
  if (typeof echarts === "undefined") {
    showFallback("fidelity-fallback");
    showFallback("speed-fallback");
    return;
  }
  try {
    const charts = [renderFidelity(data), renderSpeed(data)];
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => charts.forEach(chart => chart.resize()));
      charts.forEach(chart => observer.observe(chart.getDom()));
    } else {
      window.addEventListener("resize", () => charts.forEach(chart => chart.resize()));
    }
  } catch (error) {
    console.error("Could not render benchmark charts:", error);
    showFallback("fidelity-fallback");
    showFallback("speed-fallback");
  }
});
