#!/usr/bin/env python3
"""Build the public Kairic Edge vs Dynamic V3 Q6 EvalScope report."""

from __future__ import annotations

import html
import json
from pathlib import Path

from pyecharts import options as opts
from pyecharts.charts import Bar


ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "results.json").read_text(encoding="utf-8"))

RED = "#ed1c24"
CYAN = "#39d0ff"
GREEN = "#20d1a2"
ORANGE = "#ff9f43"
TEXT = "#f3f5f7"
MUTED = "#9ba5b0"
BORDER = "#29323b"
GRID = "rgba(151, 164, 177, 0.14)"


def pct(value: float, digits: int = 2) -> str:
    return f"{value * 100:.{digits}f}%"


def pp_delta(kairic: float, q6: float) -> str:
    delta = (kairic - q6) * 100
    if abs(delta) < 0.005:
        return '<span class="result-tag tie">Tie</span>'
    winner = "Kairic" if delta > 0 else "Q6"
    css = "kairic" if delta > 0 else "q6"
    return f'<span class="result-tag {css}">{winner} {abs(delta):.2f} pp</span>'


def scope_label(row: dict) -> str:
    if row["scope"] == "full":
        return f'Full · n={row["n"]:,}'
    if row["dataset"] == "MMLU-Pro":
        return f'5 × 14 subsets · n={row["n"]}'
    return f'Sample · n={row["n"]}'


def score_cell(score: float, interval: list[float] | None = None) -> str:
    interval_html = ""
    if interval:
        interval_html = (
            f'<small>95% CI {pct(interval[0])}–{pct(interval[1])}</small>'
        )
    return f'<strong>{pct(score)}</strong>{interval_html}'


def chart_markup(chart_id: str, chart: Bar, aria_label: str, height: int) -> str:
    safe_aria = html.escape(aria_label, quote=True)
    variable = chart_id.replace("-", "_")
    option_json = chart.dump_options()
    return f"""
      <div id="{chart_id}" class="echart" style="height:{height}px" role="img" aria-label="{safe_aria}"></div>
      <script>
        var {variable} = echarts.init(document.getElementById('{chart_id}'), null, {{renderer: 'canvas'}});
        var {variable}_option = {option_json};
        {variable}.setOption({variable}_option);
        window.__ciruCharts.push({variable});
      </script>
    """


def axis_label() -> opts.LabelOpts:
    return opts.LabelOpts(color=MUTED, font_family="IBM Plex Mono", font_size=11)


def split_line() -> opts.SplitLineOpts:
    return opts.SplitLineOpts(
        is_show=True,
        linestyle_opts=opts.LineStyleOpts(color=GRID, width=1),
    )


def quality_chart() -> Bar:
    rows = DATA["quality"]
    names = [row["chart_label"] for row in rows]
    kairic = [
        round((row.get("kairic_score") or row["metrics"]["prompt_level_strict"]["kairic"]) * 100, 2)
        for row in rows
    ]
    q6 = [
        round((row.get("q6_score") or row["metrics"]["prompt_level_strict"]["q6"]) * 100, 2)
        for row in rows
    ]
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="430px", bg_color="transparent"))
    chart.add_xaxis(names)
    chart.add_yaxis(
        "Kairic Edge",
        kairic,
        gap="12%",
        category_gap="34%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}%", color=TEXT, font_size=10),
    )
    chart.add_yaxis(
        "Dynamic V3 Q6",
        q6,
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}%", color=TEXT, font_size=10),
    )
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(
            pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT, font_family="Space Grotesk")
        ),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
        yaxis_opts=opts.AxisOpts(
            min_=0,
            max_=100,
            interval=20,
            axislabel_opts=opts.LabelOpts(color=MUTED, formatter="{value}%"),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
    )
    return chart


def workload_speed_chart() -> Bar:
    rows = DATA["per_dataset_performance"]
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="440px", bg_color="transparent"))
    chart.add_xaxis([row["dataset"] for row in rows])
    chart.add_yaxis(
        "Kairic Edge",
        [row["kairic_output_tps"] for row in rows],
        gap="12%",
        category_gap="34%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[0, 3, 3, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="right", formatter="{c}", color=TEXT, font_size=11),
    )
    chart.add_yaxis(
        "Dynamic V3 Q6",
        [row["q6_output_tps"] for row in rows],
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[0, 3, 3, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="right", formatter="{c}", color=TEXT, font_size=11),
    )
    chart.reversal_axis()
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(
            pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT, font_family="Space Grotesk")
        ),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            min_=0,
            max_=32,
            axislabel_opts=axis_label(),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
        yaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
    )
    return chart


def matched_throughput_chart() -> Bar:
    perf = DATA["matched_performance"]
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="350px", bg_color="transparent"))
    chart.add_xaxis(["Decode", "Delivered completion"])
    chart.add_yaxis(
        "Kairic Edge",
        [perf["kairic"]["decode_tps"], perf["kairic"]["completion_tps"]],
        gap="12%",
        category_gap="32%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}", color=TEXT),
    )
    chart.add_yaxis(
        "Dynamic V3 Q6",
        [perf["q6"]["decode_tps"], perf["q6"]["completion_tps"]],
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}", color=TEXT),
    )
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT)),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
        yaxis_opts=opts.AxisOpts(
            min_=0,
            max_=24,
            axislabel_opts=axis_label(),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
    )
    return chart


def latency_index_chart() -> Bar:
    perf = DATA["matched_performance"]
    kairic_ttft_index = perf["kairic"]["ttft_ms"] / perf["q6"]["ttft_ms"] * 100
    kairic_tpot_index = perf["kairic"]["tpot_ms"] / perf["q6"]["tpot_ms"] * 100
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="350px", bg_color="transparent"))
    chart.add_xaxis(["TTFT", "TPOT"])
    chart.add_yaxis(
        "Kairic Edge",
        [round(kairic_ttft_index, 1), round(kairic_tpot_index, 1)],
        gap="12%",
        category_gap="32%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}", color=TEXT),
    )
    chart.add_yaxis(
        "Q6 baseline",
        [100, 100],
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}", color=TEXT),
    )
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT)),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
        yaxis_opts=opts.AxisOpts(
            min_=0,
            max_=110,
            axislabel_opts=axis_label(),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
    )
    return chart


def mmlu_chart() -> Bar:
    rows = list(reversed(DATA["mmlu_subject_sample"]))
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="610px", bg_color="transparent"))
    chart.add_xaxis([row["subject"] for row in rows])
    chart.add_yaxis(
        "Kairic Edge",
        [row["kairic_correct"] for row in rows],
        gap="12%",
        category_gap="35%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[0, 3, 3, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="right", formatter="{c}/5", color=TEXT, font_size=10),
    )
    chart.add_yaxis(
        "Dynamic V3 Q6",
        [row["q6_correct"] for row in rows],
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[0, 3, 3, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="right", formatter="{c}/5", color=TEXT, font_size=10),
    )
    chart.reversal_axis()
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT)),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            min_=0,
            max_=5.5,
            interval=1,
            axislabel_opts=axis_label(),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
        yaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
    )
    return chart


def cap_hits_chart() -> Bar:
    rows = DATA["termination_diagnostics"]
    chart = Bar(init_opts=opts.InitOpts(width="100%", height="410px", bg_color="transparent"))
    chart.add_xaxis([row["dataset"].replace("-Challenge", "") for row in rows])
    chart.add_yaxis(
        "Kairic cap hits",
        [round(row["kairic_cap_hits"] / row["n"] * 100, 1) for row in rows],
        gap="12%",
        category_gap="34%",
        itemstyle_opts=opts.ItemStyleOpts(color=RED, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}%", color=TEXT, font_size=10),
    )
    chart.add_yaxis(
        "Q6 cap hits",
        [round(row["q6_cap_hits"] / row["n"] * 100, 1) for row in rows],
        itemstyle_opts=opts.ItemStyleOpts(color=CYAN, border_radius=[3, 3, 0, 0]),
        label_opts=opts.LabelOpts(is_show=True, position="top", formatter="{c}%", color=TEXT, font_size=10),
    )
    chart.set_global_opts(
        legend_opts=opts.LegendOpts(pos_top="0", textstyle_opts=opts.TextStyleOpts(color=TEXT)),
        tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
        xaxis_opts=opts.AxisOpts(
            axislabel_opts=axis_label(),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            axisline_opts=opts.AxisLineOpts(linestyle_opts=opts.LineStyleOpts(color=BORDER)),
        ),
        yaxis_opts=opts.AxisOpts(
            min_=0,
            max_=90,
            axislabel_opts=opts.LabelOpts(color=MUTED, formatter="{value}%"),
            axisline_opts=opts.AxisLineOpts(is_show=False),
            axistick_opts=opts.AxisTickOpts(is_show=False),
            splitline_opts=split_line(),
        ),
    )
    return chart


def quality_table_rows() -> str:
    rows: list[str] = []
    for row in DATA["quality"][:4]:
        p_value = f'{row["mcnemar_p"]:.3f}'.rstrip("0").rstrip(".")
        paired = (
            f'{row["paired_kairic_only"]} K-only · {row["paired_q6_only"]} Q6-only'
            f'<small>Paired McNemar p={p_value}</small>'
        )
        rows.append(
            "<tr>"
            f'<th scope="row"><strong>{html.escape(row["dataset"])}</strong><small>{scope_label(row)}</small></th>'
            f'<td>{score_cell(row["kairic_score"], row["kairic_wilson_95"])}</td>'
            f'<td>{score_cell(row["q6_score"], row["q6_wilson_95"])}</td>'
            f'<td>{pp_delta(row["kairic_score"], row["q6_score"])}</td>'
            f'<td>{paired}</td>'
            "</tr>"
        )

    ifeval = DATA["quality"][4]
    labels = {
        "prompt_level_strict": "Prompt strict",
        "instruction_level_strict": "Instruction strict",
        "prompt_level_loose": "Prompt loose",
        "instruction_level_loose": "Instruction loose",
    }
    for key, label in labels.items():
        metric = ifeval["metrics"][key]
        paired = "Bounded descriptive comparison"
        if "paired_kairic_only" in metric:
            paired = f'{metric["paired_kairic_only"]} K-only · {metric["paired_q6_only"]} Q6-only'
        rows.append(
            "<tr>"
            f'<th scope="row"><strong>IFEval · {label}</strong><small>Sample · n=100 prompts</small></th>'
            f'<td>{score_cell(metric["kairic"])}</td>'
            f'<td>{score_cell(metric["q6"])}</td>'
            f'<td>{pp_delta(metric["kairic"], metric["q6"])}</td>'
            f'<td>{paired}</td>'
            "</tr>"
        )
    return "\n".join(rows)


def matched_table_rows() -> str:
    perf = DATA["matched_performance"]
    rows = [
        ("Success", perf["kairic"]["success"], perf["q6"]["success"], "Tie"),
        ("Decode", f'{perf["kairic"]["decode_tps"]:.2f} tok/s', f'{perf["q6"]["decode_tps"]:.2f} tok/s', "Kairic +31.9%"),
        ("Delivered completion", f'{perf["kairic"]["completion_tps"]:.2f} tok/s', f'{perf["q6"]["completion_tps"]:.2f} tok/s', "Kairic +18.8%"),
        ("Mean TTFT", f'{perf["kairic"]["ttft_ms"]:,.2f} ms', f'{perf["q6"]["ttft_ms"]:,.2f} ms', "Kairic 37.2% lower"),
        ("Mean TPOT", f'{perf["kairic"]["tpot_ms"]:.2f} ms', f'{perf["q6"]["tpot_ms"]:.2f} ms', "Kairic 24.2% lower"),
        ("Mean request latency", f'{perf["kairic"]["average_latency_s"]:.3f} s', f'{perf["q6"]["average_latency_s"]:.3f} s', "Not cleanly comparable"),
        ("Completion tokens", f'{perf["kairic_completion_tokens"]:,}', f'{perf["q6_completion_tokens"]:,}', "Q6 produced 70.4% more"),
    ]
    output = []
    for metric, kairic, q6, result in rows:
        css = "caution" if "Not cleanly" in result or "produced" in result else ""
        output.append(
            f'<tr><th scope="row">{metric}</th><td>{kairic}</td><td>{q6}</td><td class="{css}">{result}</td></tr>'
        )
    return "\n".join(output)


def termination_table_rows() -> str:
    output = []
    for row in DATA["termination_diagnostics"]:
        k_cap = row["kairic_cap_hits"] / row["n"] * 100
        q_cap = row["q6_cap_hits"] / row["n"] * 100
        output.append(
            "<tr>"
            f'<th scope="row">{html.escape(row["dataset"])}</th>'
            f'<td>{row["cap"]:,}</td>'
            f'<td>{row["kairic_cap_hits"]} <small>({k_cap:.1f}%)</small></td>'
            f'<td>{row["kairic_unparsed"]} <small>({row["kairic_unparsed"] / row["n"] * 100:.1f}%)</small></td>'
            f'<td>{row["q6_cap_hits"]} <small>({q_cap:.1f}%)</small></td>'
            f'<td>{row["q6_unparsed"]} <small>({row["q6_unparsed"] / row["n"] * 100:.1f}%)</small></td>'
            "</tr>"
        )
    return "\n".join(output)


QUALITY_CHART = chart_markup(
    "quality-chart",
    quality_chart(),
    "Grouped bars comparing Kairic Edge and Dynamic V3 Q6 accuracy or compliance across five EvalScope workloads.",
    430,
)
SPEED_CHART = chart_markup(
    "speed-chart",
    workload_speed_chart(),
    "Horizontal bars comparing delivered output throughput across five EvalScope workloads. Kairic leads on every workload.",
    440,
)
MATCHED_CHART = chart_markup(
    "matched-chart",
    matched_throughput_chart(),
    "Bars comparing decode and delivered completion throughput on eight matched prompts.",
    350,
)
LATENCY_CHART = chart_markup(
    "latency-chart",
    latency_index_chart(),
    "Latency index where Dynamic V3 Q6 equals 100. Lower is better; Kairic has lower time to first token and time per output token.",
    350,
)
MMLU_CHART = chart_markup(
    "mmlu-chart",
    mmlu_chart(),
    "Horizontal grouped bars showing correct answers out of five in each sampled MMLU-Pro subject. The sample is exploratory.",
    610,
)
CAP_CHART = chart_markup(
    "cap-chart",
    cap_hits_chart(),
    "Grouped bars showing the percentage of requests that reached the output-token cap for each workload.",
    410,
)


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080808">
  <meta name="description" content="A matched EvalScope comparison of Qwen3.8-27B Kairic Edge and Unsloth Dynamic V3 Q6 + MTP on AMD Strix Halo.">
  <meta property="og:title" content="Kairic Edge vs Dynamic V3 Q6 · EvalScope on Sozo">
  <meta property="og:description" content="Kairic leads serving speed across every measured workload; bounded quality results establish no robust winner.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://llm.ciru.ai/research/sozo-qwen38-kairic-vs-q6-evalscope/">
  <meta property="og:image" content="https://llm.ciru.ai/research/sozo-qwen38-kairic-vs-q6-evalscope/assets/sozo-inference-dualpath-hero.webp">
  <title>Kairic Edge vs Dynamic V3 Q6 | EvalScope on AMD Strix Halo | Ciru Inference Lab</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="../../assets/echarts.min.js"></script>
  <script>window.__ciruCharts = [];</script>
  <style>
    :root {
      --bg: #080808;
      --bg-raised: #0d0f11;
      --panel: #101316;
      --panel-2: #14181c;
      --ink: #f3f5f7;
      --muted: #9ba5b0;
      --faint: #69737d;
      --line: #29323b;
      --red: #ed1c24;
      --red-soft: rgba(237, 28, 36, 0.16);
      --cyan: #39d0ff;
      --cyan-soft: rgba(57, 208, 255, 0.13);
      --green: #20d1a2;
      --orange: #ff9f43;
      --ivory: #f4f0e7;
      --radius: 8px;
      --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      --sans: "Space Grotesk", Inter, system-ui, sans-serif;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; background: var(--bg); }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px),
        radial-gradient(circle at 82% 6%, rgba(57,208,255,.06), transparent 28%),
        var(--bg);
      background-size: 36px 36px, 36px 36px, auto, auto;
      font-family: var(--sans);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
    img { display: block; max-width: 100%; }
    button, a { -webkit-tap-highlight-color: transparent; }
    ::selection { background: var(--red); color: white; }

    .skip-link {
      position: fixed; top: 8px; left: 8px; z-index: 100;
      padding: 9px 12px; background: var(--ivory); color: #080808;
      transform: translateY(-160%); border-radius: 4px;
    }
    .skip-link:focus { transform: translateY(0); }

    .brand-rail {
      position: relative; z-index: 20;
      border-bottom: 1px solid rgba(255,255,255,.09);
      background: rgba(8,8,8,.92);
      backdrop-filter: blur(16px);
    }
    .brand-inner {
      max-width: 1240px; margin: 0 auto; padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 20px;
    }
    .brand {
      display: inline-flex; align-items: center; gap: 11px;
      text-decoration: none; min-width: 0;
    }
    .brand img { width: 34px; height: 34px; object-fit: contain; }
    .brand-copy { display: grid; line-height: 1.08; }
    .brand-copy strong { font-size: .82rem; letter-spacing: .11em; text-transform: uppercase; }
    .brand-copy span { color: var(--muted); font: 500 .67rem/1.2 var(--mono); }
    .top-nav { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .top-nav a {
      padding: 7px 9px; border: 1px solid transparent; border-radius: 4px;
      color: var(--muted); text-decoration: none; font: 500 .7rem/1 var(--mono);
      text-transform: uppercase; letter-spacing: .04em;
    }
    .top-nav a:hover, .top-nav a:focus-visible { color: var(--ink); border-color: var(--line); background: var(--panel); }

    .hero {
      position: relative; overflow: hidden; min-height: 590px;
      border-bottom: 1px solid var(--line); isolation: isolate;
    }
    .hero-media {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      object-position: center; z-index: -3; filter: saturate(.93) contrast(1.06);
    }
    .hero::before {
      content: ""; position: absolute; inset: 0; z-index: -2;
      background:
        linear-gradient(90deg, #080808 0%, rgba(8,8,8,.97) 28%, rgba(8,8,8,.64) 62%, rgba(8,8,8,.3) 100%),
        linear-gradient(0deg, #080808 0%, transparent 34%, rgba(0,0,0,.18) 100%);
    }
    .hero::after {
      content: ""; position: absolute; inset: 0; z-index: -1;
      background: linear-gradient(90deg, transparent 49.8%, rgba(255,255,255,.04) 50%, transparent 50.2%);
      opacity: .5;
    }
    .hero-inner {
      max-width: 1240px; margin: 0 auto; padding: 70px 24px 44px;
      display: grid; grid-template-columns: minmax(0, 1.13fr) minmax(290px, .7fr);
      align-items: end; gap: 56px; min-height: 590px;
    }
    .eyebrow {
      display: flex; align-items: center; gap: 12px; margin: 0 0 19px;
      color: var(--red); font: 600 .72rem/1 var(--mono); letter-spacing: .13em; text-transform: uppercase;
    }
    .eyebrow::before { content: ""; width: 34px; height: 2px; background: var(--red); }
    h1 {
      max-width: 790px; margin: 0; font-size: clamp(3rem, 6vw, 5.8rem);
      line-height: .94; letter-spacing: -.065em; text-wrap: balance;
    }
    .hero-sub {
      max-width: 700px; margin: 22px 0 0; color: #d3d9de;
      font-size: clamp(1.05rem, 1.7vw, 1.35rem); line-height: 1.5;
    }
    .hero-sub strong { color: white; }
    .hero-meta {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px;
    }
    .chip {
      display: inline-flex; align-items: center; min-height: 30px; padding: 6px 10px;
      border: 1px solid rgba(255,255,255,.17); border-radius: 3px;
      background: rgba(8,8,8,.72); color: #c6ced5; font: 500 .69rem/1 var(--mono);
    }
    .chip.live::before { content: ""; width: 6px; height: 6px; margin-right: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 10px var(--green); }

    .hero-side { display: grid; align-content: end; gap: 12px; }
    .logo-plate {
      padding: 19px 20px; border-radius: var(--radius); background: var(--ivory);
      box-shadow: 0 18px 65px rgba(0,0,0,.35); border-left: 4px solid var(--orange);
    }
    .logo-plate img { width: min(100%, 290px); margin: 0 auto; }
    .comparison-ticket {
      padding: 17px 18px; border: 1px solid rgba(255,255,255,.15); border-radius: var(--radius);
      background: rgba(10,12,14,.84); backdrop-filter: blur(12px);
    }
    .ticket-label { color: var(--muted); font: 500 .66rem/1 var(--mono); text-transform: uppercase; letter-spacing: .09em; }
    .ticket-models { display: grid; grid-template-columns: 1fr auto 1fr; gap: 9px; align-items: center; margin-top: 10px; }
    .ticket-models strong { font-size: .88rem; line-height: 1.25; }
    .ticket-models strong:last-child { text-align: right; }
    .versus { color: var(--faint); font: 600 .65rem/1 var(--mono); }
    .red-text { color: var(--red); }
    .cyan-text { color: var(--cyan); }

    main { max-width: 1240px; margin: 0 auto; padding: 0 24px 80px; }
    .verdict-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
      margin: -1px 0 70px; border-bottom: 1px solid var(--line);
    }
    .verdict-card { padding: 24px 18px 22px; border-right: 1px solid var(--line); background: rgba(11,13,15,.86); }
    .verdict-card:last-child { border-right: 0; }
    .metric { display: block; color: var(--ink); font: 600 clamp(1.7rem, 3vw, 2.55rem)/1 var(--mono); letter-spacing: -.06em; }
    .metric.red { color: var(--red); }
    .metric.cyan { color: var(--cyan); }
    .metric.green { color: var(--green); }
    .metric-label { display: block; margin-top: 10px; color: var(--muted); font-size: .79rem; line-height: 1.35; }

    section { scroll-margin-top: 22px; margin-top: 76px; }
    .section-head {
      display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 30px;
      align-items: start; margin-bottom: 24px;
    }
    .section-no { color: var(--red); font: 600 .68rem/1.4 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
    .section-title h2 { margin: 0; font-size: clamp(2rem, 4vw, 3.65rem); line-height: 1; letter-spacing: -.05em; text-wrap: balance; }
    .section-title p { max-width: 780px; margin: 15px 0 0; color: var(--muted); font-size: 1.02rem; }

    .verdict-panel {
      display: grid; grid-template-columns: 1.25fr .75fr; gap: 0;
      border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: var(--panel);
    }
    .verdict-copy { padding: clamp(26px, 4vw, 46px); }
    .verdict-copy blockquote { margin: 0; font-size: clamp(1.4rem, 2.6vw, 2.3rem); line-height: 1.24; letter-spacing: -.035em; }
    .verdict-copy p { color: var(--muted); margin: 20px 0 0; max-width: 760px; }
    .verdict-aside { padding: 28px; background: linear-gradient(145deg, var(--red-soft), rgba(13,15,17,.2)); border-left: 1px solid var(--line); }
    .aside-label { margin: 0 0 12px; color: var(--red); font: 600 .68rem/1 var(--mono); text-transform: uppercase; letter-spacing: .1em; }
    .verdict-aside ul { padding: 0; margin: 0; list-style: none; }
    .verdict-aside li { padding: 11px 0; border-top: 1px solid rgba(255,255,255,.09); font-size: .9rem; }
    .verdict-aside li::before { content: "→"; margin-right: 9px; color: var(--red); font-family: var(--mono); }

    .model-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 22px; }
    .model-card { position: relative; padding: 24px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); overflow: hidden; }
    .model-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--accent); }
    .model-card.kairic { --accent: var(--red); }
    .model-card.q6 { --accent: var(--cyan); }
    .model-top { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
    .model-mark { width: 48px; height: 50px; padding: 5px; border-radius: 5px; background: var(--ivory); object-fit: contain; }
    .model-card h3 { margin: 0; font-size: 1.25rem; letter-spacing: -.025em; }
    .model-card p { margin: 9px 0 0; color: var(--muted); font-size: .87rem; }
    .model-runtime { margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--line); color: #cdd4da; font: 500 .73rem/1.5 var(--mono); }

    .chart-shell { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(180deg, #111519, #0d1013); overflow: hidden; }
    .chart-head { display: flex; align-items: start; justify-content: space-between; gap: 18px; padding: 20px 22px 0; }
    .chart-head h3 { margin: 0; font-size: 1.1rem; }
    .chart-head p { margin: 5px 0 0; color: var(--muted); font-size: .8rem; }
    .chart-badge { flex: 0 0 auto; padding: 7px 9px; border: 1px solid var(--line); color: var(--muted); font: .65rem/1 var(--mono); text-transform: uppercase; }
    .echart { width: 100%; min-width: 0; padding: 10px 4px 2px; }
    .chart-note { margin: 0; padding: 13px 20px; border-top: 1px solid var(--line); color: var(--muted); background: rgba(0,0,0,.16); font-size: .8rem; }
    .chart-note strong { color: var(--ink); }
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .speedup-strip { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--line); }
    .speedup-item { padding: 14px; border-right: 1px solid var(--line); text-align: center; }
    .speedup-item:last-child { border-right: 0; }
    .speedup-item strong { display: block; color: var(--red); font: 600 1.05rem/1 var(--mono); }
    .speedup-item span { display: block; margin-top: 7px; color: var(--muted); font-size: .69rem; }

    .data-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
    table { width: 100%; border-collapse: collapse; min-width: 780px; }
    th, td { padding: 15px 16px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
    thead th { color: var(--muted); background: #0c0f12; font: 500 .65rem/1.25 var(--mono); letter-spacing: .07em; text-transform: uppercase; }
    tbody th { font-weight: 500; }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: rgba(255,255,255,.018); }
    td { color: #d2d8dd; font: .78rem/1.4 var(--mono); }
    th small, td small { display: block; margin-top: 5px; color: var(--faint); font: .68rem/1.35 var(--mono); }
    td strong { font-size: .86rem; color: var(--ink); }
    .result-tag { display: inline-block; padding: 5px 7px; border-radius: 3px; font: 600 .67rem/1 var(--mono); }
    .result-tag.tie { color: var(--muted); background: rgba(255,255,255,.06); }
    .result-tag.kairic { color: #ff7a7f; background: var(--red-soft); }
    .result-tag.q6 { color: var(--cyan); background: var(--cyan-soft); }
    .caution { color: var(--orange); }

    .callout {
      display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: start;
      margin: 18px 0; padding: 18px 20px; border: 1px solid rgba(255,159,67,.34);
      border-left: 3px solid var(--orange); border-radius: var(--radius); background: rgba(255,159,67,.07);
    }
    .callout-mark { color: var(--orange); font: 600 1rem/1 var(--mono); }
    .callout strong { display: block; margin-bottom: 5px; }
    .callout p { margin: 0; color: #c4cbd1; font-size: .87rem; }
    .callout.info { border-color: rgba(57,208,255,.28); border-left-color: var(--cyan); background: var(--cyan-soft); }
    .callout.info .callout-mark { color: var(--cyan); }

    .protocol-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .protocol-item { min-height: 90px; padding: 15px; border: 1px solid var(--line); border-radius: 5px; background: var(--panel); }
    .protocol-item span { display: block; color: var(--muted); font: .63rem/1.25 var(--mono); text-transform: uppercase; letter-spacing: .06em; }
    .protocol-item strong { display: block; margin-top: 9px; font: 500 .84rem/1.4 var(--mono); }

    .integrity-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 20px; background: var(--line); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
    .integrity-item { padding: 20px; background: var(--panel); }
    .integrity-item strong { display: block; color: var(--green); font: 600 1.35rem/1 var(--mono); }
    .integrity-item span { display: block; margin-top: 8px; color: var(--muted); font-size: .72rem; }

    .sources {
      display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr); gap: 12px;
    }
    .source-card { padding: 25px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
    .source-card h3 { margin: 0 0 13px; font-size: 1rem; }
    .source-card p, .source-card li { color: var(--muted); font-size: .86rem; }
    .source-card ul { margin: 0; padding-left: 18px; }
    .source-card li + li { margin-top: 8px; }
    .source-card a { color: var(--cyan); text-underline-offset: 3px; }
    code { color: #cbd4dc; font-family: var(--mono); font-size: .82em; overflow-wrap: anywhere; }

    .closing {
      position: relative; margin-top: 80px; padding: clamp(30px, 5vw, 58px);
      border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
      background: linear-gradient(120deg, rgba(237,28,36,.14), rgba(13,16,19,.95) 48%, rgba(57,208,255,.1));
    }
    .closing::after { content: ""; position: absolute; right: -90px; top: -90px; width: 260px; height: 260px; border: 1px solid rgba(255,255,255,.08); transform: rotate(45deg); }
    .closing h2 { max-width: 870px; margin: 0; font-size: clamp(2rem, 4.2vw, 4rem); line-height: 1.04; letter-spacing: -.055em; }
    .closing p { max-width: 820px; color: #c6cdd3; }
    .closing .decision { color: var(--green); font: 600 .72rem/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }

    footer { border-top: 1px solid var(--line); background: #060606; }
    .footer-inner { max-width: 1240px; margin: 0 auto; padding: 34px 24px; display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: center; }
    .footer-brand { display: flex; align-items: center; gap: 16px; }
    .footer-logo-plate { width: 94px; height: 64px; padding: 7px; display: grid; place-items: center; border-radius: 4px; background: var(--ivory); }
    .footer-logo-plate img { max-height: 50px; }
    .footer-copy strong { display: block; font-size: .82rem; }
    .footer-copy span { display: block; margin-top: 5px; color: var(--muted); font: .66rem/1.5 var(--mono); }
    .footer-links { display: flex; gap: 10px; flex-wrap: wrap; justify-content: end; }
    .footer-links a { color: var(--muted); font: .68rem/1 var(--mono); text-underline-offset: 4px; }

    @media (max-width: 980px) {
      .top-nav a:not(:last-child) { display: none; }
      .hero-inner { grid-template-columns: 1fr; align-content: center; gap: 30px; }
      .hero-side { grid-template-columns: minmax(230px, .8fr) 1fr; align-items: stretch; }
      .verdict-grid { grid-template-columns: repeat(2, 1fr); }
      .verdict-card:nth-child(2) { border-right: 0; }
      .verdict-card:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .verdict-panel, .chart-grid, .sources { grid-template-columns: 1fr; }
      .verdict-aside { border-left: 0; border-top: 1px solid var(--line); }
      .protocol-grid { grid-template-columns: repeat(2, 1fr); }
      .integrity-strip { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 700px) {
      .brand-inner { padding: 10px 16px; }
      .brand-copy strong { font-size: .72rem; }
      .hero { min-height: auto; }
      .hero::before { background: linear-gradient(90deg, rgba(8,8,8,.98), rgba(8,8,8,.72)), linear-gradient(0deg, #080808, transparent 60%); }
      .hero-inner { min-height: auto; padding: 58px 16px 40px; }
      h1 { font-size: clamp(2.75rem, 15vw, 4.15rem); }
      .hero-side { grid-template-columns: 1fr; }
      .logo-plate { max-width: 330px; }
      main { padding: 0 16px 64px; }
      .verdict-grid { margin-bottom: 56px; }
      .verdict-card { padding: 20px 14px; }
      .metric { font-size: 1.65rem; }
      section { margin-top: 62px; }
      .section-head { grid-template-columns: 1fr; gap: 9px; }
      .section-title h2 { font-size: 2.45rem; }
      .model-grid { grid-template-columns: 1fr; }
      .chart-head { padding: 16px 16px 0; }
      .chart-badge { display: none; }
      .echart { margin-left: 0; width: 100%; }
      .speedup-strip { grid-template-columns: repeat(2, 1fr); }
      .speedup-item:nth-child(2n) { border-right: 0; }
      .speedup-item:last-child { grid-column: 1 / -1; border-top: 1px solid var(--line); }
      .protocol-grid { grid-template-columns: 1fr 1fr; }
      .integrity-strip { grid-template-columns: 1fr 1fr; }
      .footer-inner { grid-template-columns: 1fr; }
      .footer-links { justify-content: start; }
    }

    @media (max-width: 430px) {
      .brand-copy span { display: none; }
      .hero-meta .chip:nth-child(n+4) { display: none; }
      .verdict-grid { grid-template-columns: 1fr; }
      .verdict-card, .verdict-card:nth-child(2) { border-right: 0; border-bottom: 1px solid var(--line); }
      .verdict-card:last-child { border-bottom: 0; }
      .protocol-grid, .integrity-strip { grid-template-columns: 1fr; }
      .ticket-models { grid-template-columns: 1fr; }
      .ticket-models strong:last-child { text-align: left; }
      .versus { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
    }

    @media print {
      .brand-rail, .top-nav, .footer-links { display: none; }
      body { background: #fff; color: #111; }
      .hero { min-height: 460px; }
      .chart-shell, .model-card, .protocol-item, .source-card, .data-table-wrap { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#report">Skip to report</a>
  <header class="brand-rail">
    <div class="brand-inner">
      <a class="brand" href="https://llm.ciru.ai/" aria-label="Ciru Inference Lab home">
        <img src="assets/crown-citadel-mark.png" alt="Crown Citadel mark">
        <span class="brand-copy"><strong>Ciru Inference Lab</strong><span>llm.ciru.ai / research</span></span>
      </a>
      <nav class="top-nav" aria-label="Report navigation">
        <a href="#verdict">Verdict</a><a href="#quality">Quality</a><a href="#speed">Speed</a><a href="#method">Method</a><a href="../">Research index ↗</a>
      </nav>
    </div>
  </header>

  <div class="hero">
    <img class="hero-media" src="assets/sozo-inference-dualpath-hero.webp" alt="" width="1672" height="941">
    <div class="hero-inner">
      <div>
        <p class="eyebrow">Crown Citadel Research Report · 22 Aug 2026</p>
        <h1>Kairic Edge<br>vs Dynamic V3 Q6</h1>
        <p class="hero-sub">A matched <strong>EvalScope</strong> campaign on Sozo asks a practical question: how much speed can the Kairic PromptForge build gain without showing a robust quality loss?</p>
        <div class="hero-meta">
          <span class="chip live">Complete · verified</span>
          <span class="chip">AMD Ryzen AI Max+ 395</span>
          <span class="chip">NixOS · ROCm gfx1151</span>
          <span class="chip">MTP depth 4</span>
          <span class="chip">2,984 quality requests</span>
        </div>
      </div>
      <aside class="hero-side" aria-label="Compared model builds">
        <a class="logo-plate" href="https://huggingface.co/jcbtc/Qwen3.8-27B-IU4-Kairic-Edge" aria-label="Open Kairic Edge model card on Hugging Face">
          <img src="assets/kairic-wordmark.png" alt="Kairic">
        </a>
        <div class="comparison-ticket">
          <span class="ticket-label">Build-versus-build comparison</span>
          <div class="ticket-models"><strong class="red-text">IU4 PromptForge</strong><span class="versus">VS</span><strong class="cyan-text">UD-Q6_K_XL upstream</strong></div>
        </div>
      </aside>
    </div>
  </div>

  <main id="report">
    <div class="verdict-grid" aria-label="Headline findings">
      <div class="verdict-card"><span class="metric red">+31.9%</span><span class="metric-label">matched decode throughput</span></div>
      <div class="verdict-card"><span class="metric red">1.425×</span><span class="metric-label">geometric-mean workload speedup</span></div>
      <div class="verdict-card"><span class="metric cyan">93.52 = 93.52</span><span class="metric-label">full ARC-Challenge score (%)</span></div>
      <div class="verdict-card"><span class="metric green">2,984 / 2,984</span><span class="metric-label">quality requests succeeded</span></div>
    </div>

    <section id="verdict">
      <div class="section-head">
        <div class="section-no">01 / Verdict</div>
        <div class="section-title"><h2>Speed winner.<br>No established quality winner.</h2><p>The signal is asymmetric: serving speed separates clearly, while bounded quality differences remain small and statistically unresolved.</p></div>
      </div>
      <div class="verdict-panel">
        <div class="verdict-copy">
          <blockquote>“Kairic Edge delivers a consistent serving-speed lead; this bounded campaign does not establish a quality winner.”</blockquote>
          <p>Kairic led delivered output throughput on every quality workload by 38.6–46.4%. The full 1,172-question ARC run tied exactly. Every sampled paired accuracy comparison had overlapping uncertainty and McNemar p ≥ 0.754.</p>
        </div>
        <aside class="verdict-aside">
          <p class="aside-label">Decision</p>
          <ul><li>Keep Kairic as Sozo’s speed profile</li><li>Treat Q6 as a quality-parity comparator</li><li>Do not claim a universal quant winner</li><li>Re-run GPQA with a better termination protocol</li></ul>
        </aside>
      </div>

      <div class="model-grid">
        <article class="model-card kairic">
          <div class="model-top"><div><h3>Qwen3.8-27B IU4 Kairic Edge</h3><p>Specialized edge-inference artifact tuned for the Kairic serving path.</p></div><img class="model-mark" src="assets/kairic-mark.png" alt="Kairic mark"></div>
          <div class="model-runtime">Kairic 7.15 · PromptForge enabled · exact greedy fast paths · MTP4</div>
        </article>
        <article class="model-card q6">
          <div class="model-top"><div><h3>Unsloth Dynamic V3 UD-Q6_K_XL</h3><p>Higher-bit dynamic quant tested as the newest upstream llama.cpp baseline.</p></div><span class="model-mark" aria-hidden="true" style="display:grid;place-items:center;color:#011a49;font:700 13px var(--mono)">Q6</span></div>
          <div class="model-runtime">Pinned upstream llama.cpp · natural EOS · temperature 0 · MTP4</div>
        </article>
      </div>
    </section>

    <section id="quality">
      <div class="section-head">
        <div class="section-no">02 / Quality</div>
        <div class="section-title"><h2>Bounded scores overlap.</h2><p>Only ARC-Challenge was run in full. GPQA, MMLU-Pro, GSM8K, and IFEval were deliberately sampled to fit the overnight campaign window.</p></div>
      </div>
      <div class="chart-shell">
        <div class="chart-head"><div><h3>Observed accuracy and instruction compliance</h3><p>IFEval uses prompt-level strict compliance in this overview.</p></div><span class="chart-badge">Higher is better</span></div>
        %%QUALITY_CHART%%
        <p class="chart-note"><strong>Read carefully:</strong> bars show point estimates, not certainty. The full table below includes Wilson intervals and paired outcomes.</p>
      </div>
      <div class="data-table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Dataset / scope</th><th>Kairic Edge</th><th>Dynamic V3 Q6</th><th>Observed difference</th><th>Paired evidence</th></tr></thead>
          <tbody>%%QUALITY_ROWS%%</tbody>
        </table>
      </div>
      <div class="callout info">
        <span class="callout-mark">i</span><div><strong>Statistical reading</strong><p>ARC tied on the full set. Sampled suites have wide, overlapping intervals; one-to-four-point movements are not enough to establish a robust quality winner here.</p></div>
      </div>

      <div class="chart-shell" style="margin-top:24px">
        <div class="chart-head"><div><h3>MMLU-Pro subject sample</h3><p>Correct answers out of five in each subject cell.</p></div><span class="chart-badge">Exploratory only</span></div>
        %%MMLU_CHART%%
        <p class="chart-note"><strong>Do not rank subjects from this panel.</strong> Five questions per subject is too small for subject-level claims; the view exists to expose where the aggregate’s single-answer difference came from.</p>
      </div>
    </section>

    <section id="speed">
      <div class="section-head">
        <div class="section-no">03 / Serving speed</div>
        <div class="section-title"><h2>Kairic leads every workload.</h2><p>These are end-to-end delivered output rates from the quality workloads. They include first-token delay and should not be confused with raw decode throughput.</p></div>
      </div>
      <div class="chart-shell">
        <div class="chart-head"><div><h3>Delivered output throughput</h3><p>Quality-workload requests, concurrency 1.</p></div><span class="chart-badge">tok/s · higher is better</span></div>
        %%SPEED_CHART%%
        <div class="speedup-strip">
          <div class="speedup-item"><strong>1.405×</strong><span>ARC</span></div><div class="speedup-item"><strong>1.430×</strong><span>GPQA</span></div><div class="speedup-item"><strong>1.440×</strong><span>MMLU-Pro</span></div><div class="speedup-item"><strong>1.464×</strong><span>GSM8K</span></div><div class="speedup-item"><strong>1.386×</strong><span>IFEval</span></div>
        </div>
      </div>
      <div class="callout">
        <span class="callout-mark">!</span><div><strong>ARC is TTFT-dominated</strong><p>ARC answers average roughly five output tokens, so its 7.81 vs 5.56 tok/s rate reflects first-token delay more than sustained generation. That is precisely why the matched prompt test below reports decode, TTFT, and TPOT separately.</p></div>
      </div>

      <div class="chart-grid" style="margin-top:24px">
        <div class="chart-shell">
          <div class="chart-head"><div><h3>Matched throughput</h3><p>Eight identical prompts after one warmup.</p></div><span class="chart-badge">tok/s</span></div>
          %%MATCHED_CHART%%
        </div>
        <div class="chart-shell">
          <div class="chart-head"><div><h3>Response timing index</h3><p>Q6 baseline = 100. Lower is better.</p></div><span class="chart-badge">Lower is better</span></div>
          %%LATENCY_CHART%%
        </div>
      </div>
      <div class="data-table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Matched metric</th><th>Kairic Edge</th><th>Dynamic V3 Q6</th><th>Interpretation</th></tr></thead>
          <tbody>%%MATCHED_ROWS%%</tbody>
        </table>
      </div>
      <div class="callout">
        <span class="callout-mark">!</span><div><strong>Natural EOS changed output length</strong><p>Q6 generated 2,773 completion tokens versus Kairic’s 1,627—70.4% more—and one response reached the 1,024-token cap. Average latency therefore is not a clean speed comparison. Decode rate, TTFT, and TPOT are the useful matched metrics.</p></div>
      </div>
    </section>

    <section id="termination">
      <div class="section-head">
        <div class="section-no">04 / Termination</div>
        <div class="section-title"><h2>GPQA hit the ceiling.</h2><p>The locked first-sample GPQA protocol was dominated by the 1,024-token output boundary. Its score measures termination and answer-format reliability as well as reasoning.</p></div>
      </div>
      <div class="chart-shell">
        <div class="chart-head"><div><h3>Output-cap incidence</h3><p>Share of requests reaching each dataset’s configured cap.</p></div><span class="chart-badge">% of requests</span></div>
        %%CAP_CHART%%
      </div>
      <div class="data-table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Dataset</th><th>Output cap</th><th>Kairic cap hits</th><th>Kairic unparsed</th><th>Q6 cap hits</th><th>Q6 unparsed</th></tr></thead>
          <tbody>%%TERMINATION_ROWS%%</tbody>
        </table>
      </div>
      <div class="callout"><span class="callout-mark">!</span><div><strong>No denominator repair</strong><p>GPQA results are reported exactly under the locked protocol. Cap-hit or unparsed rows were not silently discarded, denominator-adjusted, or converted into a more flattering estimate.</p></div></div>
    </section>

    <section id="method">
      <div class="section-head">
        <div class="section-no">05 / Method</div>
        <div class="section-title"><h2>Same host. Same request contract. Different builds.</h2><p>This design isolates the behavior of two deployable serving stacks. It does not isolate quantization alone.</p></div>
      </div>
      <div class="protocol-grid">
        <div class="protocol-item"><span>Host</span><strong>Sozo · AMD Ryzen AI Max+ 395</strong></div>
        <div class="protocol-item"><span>Runtime target</span><strong>ROCm gfx1151 · NixOS</strong></div>
        <div class="protocol-item"><span>Context</span><strong>262,144 tokens</strong></div>
        <div class="protocol-item"><span>MTP</span><strong>Depth 4 · parallel 1</strong></div>
        <div class="protocol-item"><span>KV cache</span><strong>Target f16 · draft f16</strong></div>
        <div class="protocol-item"><span>Batching</span><strong>2,048 batch · 512 ubatch</strong></div>
        <div class="protocol-item"><span>Sampling</span><strong>temp 0 · top-p 1 · seed 42</strong></div>
        <div class="protocol-item"><span>Reasoning</span><strong>Hidden reasoning disabled</strong></div>
        <div class="protocol-item"><span>Tokenizer</span><strong>Qwen/Qwen3.8-27B</strong></div>
        <div class="protocol-item"><span>EvalScope</span><strong>fde259d2a32a…</strong></div>
        <div class="protocol-item"><span>Kairic runtime</span><strong>PromptForge + greedy fast paths</strong></div>
        <div class="protocol-item"><span>Q6 runtime</span><strong>Pinned upstream llama.cpp</strong></div>
      </div>

      <div class="integrity-strip" aria-label="Campaign integrity">
        <div class="integrity-item"><strong>1,492 / 1,492</strong><span>Kairic quality requests</span></div>
        <div class="integrity-item"><strong>1,492 / 1,492</strong><span>Q6 quality requests</span></div>
        <div class="integrity-item"><strong>0</strong><span>errors or incomplete reports</span></div>
        <div class="integrity-item"><strong>8 / 8 each</strong><span>matched perf requests</span></div>
      </div>

      <div class="callout info"><span class="callout-mark">i</span><div><strong>HumanEval excluded, not scored zero</strong><p>The Docker sandbox bridge was unavailable during its smoke test. HumanEval was removed from the scored campaign rather than represented as a model failure.</p></div></div>

      <div class="sources">
        <article class="source-card">
          <h3>Interpretation boundary</h3>
          <ul><li>Single-user serving at concurrency 1.</li><li>No VRAM, power, energy, or concurrency-scaling measurements.</li><li>Natural EOS means output content and length can differ.</li><li>Sampled suites are descriptive and are not formal leaderboard submissions.</li><li>The abandoned full-GPQA projection and failed HumanEval smoke are not included.</li></ul>
        </article>
        <article class="source-card">
          <h3>Reproducibility links</h3>
          <p><a href="https://github.com/modelscope/evalscope">EvalScope source ↗</a><br><a href="https://evalscope.readthedocs.io/en/latest/get_started/supported_dataset/llm.html">Supported dataset reference ↗</a><br><a href="https://huggingface.co/jcbtc/Qwen3.8-27B-IU4-Kairic-Edge">Kairic Edge model card ↗</a></p>
          <p>Campaign <code>20260822T032300Z</code><br>EvalScope <code>fde259d2a32ab8a4cdb3af44dc8b18f504f1e277</code></p>
        </article>
      </div>
    </section>

    <section class="closing" aria-labelledby="conclusion-title">
      <p class="decision">Deployment decision</p>
      <h2 id="conclusion-title">Promote Kairic for speed. Keep the quality claim disciplined.</h2>
      <p>Kairic is the clear serving-speed winner in this matched, single-user campaign. The observed quality differences—zero to four percentage points on mostly bounded samples—do not establish a robust quality winner. GPQA in particular was dominated by the locked 1,024-token termination boundary.</p>
    </section>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-logo-plate"><img src="assets/crown-citadel-lockup.svg" alt="Crown Citadel Group"></div>
        <div class="footer-copy"><strong>Crown Citadel Group · Ciru Inference Lab</strong><span>Independent local inference research · Python/Pyecharts 2.0.8 · ECharts 5.6.1</span></div>
      </div>
      <div class="footer-links"><a href="../">Research index</a><a href="https://llm.ciru.ai/">Inference atlas</a><a href="results.json">Normalized data</a><a href="imagegen-prompt.txt">Hero prompt</a></div>
    </div>
  </footer>

  <script>
    (function () {
      var frame = null;
      function applyResponsiveChartLayout() {
        var compact = window.innerWidth <= 700;
        quality_chart.setOption({
          grid: {left: compact ? 38 : 70, right: compact ? 10 : 28, top: 62, bottom: compact ? 62 : 42},
          xAxis: {axisLabel: {interval: 0, rotate: compact ? 28 : 0, fontSize: compact ? 9 : 11}},
          series: [{label: {show: !compact}}, {label: {show: !compact}}]
        });
        speed_chart.setOption({grid: {left: compact ? 112 : 122, right: compact ? 36 : 72, top: 58, bottom: 38}});
        matched_chart.setOption({grid: {left: compact ? 38 : 54, right: 18, top: 64, bottom: 44}});
        latency_chart.setOption({grid: {left: compact ? 38 : 54, right: 18, top: 64, bottom: 44}});
        mmlu_chart.setOption({grid: {left: compact ? 124 : 126, right: compact ? 36 : 72, top: 58, bottom: 32}});
        cap_chart.setOption({
          grid: {left: compact ? 38 : 60, right: 18, top: 60, bottom: compact ? 66 : 42},
          xAxis: {axisLabel: {interval: 0, rotate: compact ? 26 : 0, fontSize: compact ? 9 : 11}},
          series: [{label: {show: !compact}}, {label: {show: !compact}}]
        });
      }
      function resizeCharts() {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function () {
          applyResponsiveChartLayout();
          window.__ciruCharts.forEach(function (chart) { chart.resize(); });
        });
      }
      applyResponsiveChartLayout();
      window.addEventListener('resize', resizeCharts, {passive: true});
      if ('ResizeObserver' in window) {
        var observer = new ResizeObserver(resizeCharts);
        document.querySelectorAll('.chart-shell').forEach(function (node) { observer.observe(node); });
      }
    }());
  </script>
</body>
</html>
"""


def build() -> Path:
    replacements = {
        "%%QUALITY_CHART%%": QUALITY_CHART,
        "%%SPEED_CHART%%": SPEED_CHART,
        "%%MATCHED_CHART%%": MATCHED_CHART,
        "%%LATENCY_CHART%%": LATENCY_CHART,
        "%%MMLU_CHART%%": MMLU_CHART,
        "%%CAP_CHART%%": CAP_CHART,
        "%%QUALITY_ROWS%%": quality_table_rows(),
        "%%MATCHED_ROWS%%": matched_table_rows(),
        "%%TERMINATION_ROWS%%": termination_table_rows(),
    }
    output = TEMPLATE
    for marker, value in replacements.items():
        output = output.replace(marker, value)
    unresolved = [marker for marker in replacements if marker in output]
    if unresolved:
        raise RuntimeError(f"Unresolved template markers: {unresolved}")
    output = "\n".join(line.rstrip() for line in output.splitlines()) + "\n"
    output_path = ROOT / "index.html"
    output_path.write_text(output, encoding="utf-8", newline="\n")
    return output_path


if __name__ == "__main__":
    built = build()
    print(f"Built {built} ({built.stat().st_size:,} bytes)")
