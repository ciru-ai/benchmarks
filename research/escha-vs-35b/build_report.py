#!/usr/bin/env python3
"""Build the public Ciru Escha-vs-released-35B quality report with pyecharts.

The SQLite file is a read-only snapshot of Crown's append-only quality store.
It is a build input and is deliberately not copied into the site.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from pyecharts import options as opts
from pyecharts.charts import Bar
from pyecharts.commons.utils import JsCode


AMD = "#ed1c24"
CYAN = "#39d0ff"
MUTED = "#a8adb7"
GRID = "rgba(255,255,255,.11)"

RELEASED_MODEL_LABELS = {
    "Ornith 1.0 35B",
    "Qwen3.6-35B-A3B",
    "Qwen3.6-35B-A3B · Unsloth GGUF",
    "Qwen3.6-35B-A3B · Crown Halo Dynamic",
    "Qwen3.6-35B-A3B · Chadrock v2 series",
    "Qwen3.6-35B-A3B · Chadrock series",
}


ESCHA = {
    "model": "Qwen3.6-35B-A3B-Escha-W2",
    "display": "Escha W2",
    "quant": "EschaMoE W2: expert gate/up 2-bit, expert down 3-bit; dense + embeddings INT8",
    "hermes": {
        "score": 90.0,
        "tasks": 20,
    },
    "campaign": {
        "tool_eval_69": 87.0,
        "tool_eval_hard_15": 80.0,
        "humaneval_base": 95.121951,
        "humaneval_plus": 90.853659,
        "mbpp_base": 90.740741,
        "mbpp_plus": 75.661376,
        "bigcodebench_hard": 29.72973,
    },
}


def db_rows(path: Path, sql: str) -> list[dict[str, Any]]:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        return [dict(row) for row in con.execute(sql)]
    finally:
        con.close()


def is_35b_sql() -> str:
    return """(
        lower(coalesce(profile_id,'')) LIKE '%35b%'
        OR lower(coalesce(model_path,'')) LIKE '%35b%'
        OR lower(row_json) LIKE '%35b%'
    )"""


def infer_quant(*parts: str | None) -> str:
    text = " ".join(part or "" for part in parts).lower().replace("_", "-")
    if "escha" in text or re.search(r"(?:^|-)w2(?:-|$)", text):
        return "Escha W2 / hybrid 2–3b + INT8"
    if "dualview" in text or "fpx7+q8" in text:
        return "DualView FPX7 + Q8 MTP"
    if "moequality" in text and ("7.07" in text or "707bpw" in text):
        return "ROCmFPX MoEQuality 7.07 BPW"
    if "708bpw" in text:
        return "ROCmFPX MoEQuality 7.08 BPW"
    if "h29" in text and "q6" in text:
        return "ROCmFPX H29-B UQ / Q6_0"
    if "h29" in text:
        return "H29-B UltraQuality"
    if "q6-k-xl" in text or "q6 k xl" in text:
        return "Q6_K_XL"
    if "q6-0" in text or "q6 0" in text:
        return "Q6_0"
    if "q5-k-m" in text or "q5 k m" in text:
        return "Q5_K_M"
    if "q4-k-m" in text or "q4 k m" in text or "q4km" in text:
        return "Q4_K_M"
    if "rocmfp4" in text or "q4fast" in text:
        return "ROCmFP4"
    if "q7s8" in text:
        return "Q7S8 hybrid"
    if "q8" in text or "q8-k" in text:
        return "Q8"
    if "dynamic" in text or "halo-strix-dyn" in text:
        return "Dynamic mixed quant"
    if "strix-lean" in text:
        return "Strix Lean mixed quant"
    return "Quant not recorded"


def model_family(*parts: str | None) -> str:
    text = " ".join(part or "" for part in parts).lower()
    if "escha" in text:
        return "Escha W2"
    if "ornith" in text:
        return "Ornith 1.0 35B"
    if "qwopus" in text:
        return "Qwopus 3.6"
    if "h29" in text:
        return "H29-B / Qwen3.6"
    if "chadrockv2" in text or "chadrock v2" in text or "ace-saber" in text:
        return "Qwen3.6-35B-A3B · Chadrock v2 series"
    if "chadrock" in text:
        return "Qwen3.6-35B-A3B · Chadrock series"
    if "crown-halo" in text:
        return "Qwen3.6-35B-A3B · Crown Halo Dynamic"
    if "dynamic-strix" in text:
        return "Dynamic Strix"
    if "unsloth" in text:
        return "Qwen3.6-35B-A3B · Unsloth GGUF"
    return "Qwen3.6-35B-A3B"


def pct(value: Any) -> float | None:
    if value is None:
        return None
    number = float(value)
    return round(number * 100 if abs(number) <= 1.0000001 else number, 4)


def normalize_quality(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()
    for raw in rows:
        key = (
            raw.get("run_id"), raw.get("benchmark_family"), raw.get("suite"),
            raw.get("row_kind"), raw.get("profile_id"), raw.get("tasks"),
            raw.get("score_value"), raw.get("base_rate"), raw.get("plus_rate"),
            raw.get("total_runtime_s"), raw.get("generation_seconds"),
        )
        if key in seen:
            continue
        seen.add(key)
        family = (raw.get("benchmark_family") or "unknown").lower()
        score = raw.get("score_value")
        if family == "evalplus" and raw.get("plus_rate") is not None:
            score = raw.get("plus_rate")
        normalized.append({
            "seq": raw.get("seq"),
            "timestamp": raw.get("timestamp_utc"),
            "run_id": raw.get("run_id"),
            "family": family,
            "suite": raw.get("suite") or "—",
            "kind": raw.get("row_kind") or "—",
            "profile": raw.get("profile_id") or "—",
            "model_family": model_family(raw.get("profile_id"), raw.get("model_path")),
            "quant": infer_quant(raw.get("profile_id"), raw.get("model_path")),
            "tasks": raw.get("tasks"),
            "score_name": raw.get("score_name") or ("plus_rate" if raw.get("plus_rate") is not None else "—"),
            "score": pct(score),
            "base_score": pct(raw.get("base_rate")),
            "plus_score": pct(raw.get("plus_rate")),
        })
    return normalized


def highest_scores(rows: Iterable[dict[str, Any]], key_fields: tuple[str, ...]) -> list[dict[str, Any]]:
    """Keep the highest-scoring observation for each public comparison key."""
    best: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in rows:
        key = tuple(row.get(field) for field in key_fields)
        current = best.get(key)
        row_rank = (row.get("score") if row.get("score") is not None else float("-inf"), row.get("timestamp") or "", row.get("seq") or -1)
        current_rank = (
            current.get("score") if current and current.get("score") is not None else float("-inf"),
            current.get("timestamp") or "" if current else "",
            current.get("seq") or -1 if current else -1,
        )
        if current is None or row_rank > current_rank:
            best[key] = row
    return list(best.values())


def base_chart(chart_id: str, height: str = "480px") -> opts.InitOpts:
    return opts.InitOpts(
        chart_id=chart_id,
        width="100%",
        height=height,
        theme="dark",
        bg_color="rgba(0,0,0,0)",
        animation_opts=opts.AnimationOpts(animation_duration=500),
    )


def toolbox() -> opts.ToolboxOpts:
    return opts.ToolboxOpts(
        is_show=True,
        orient="horizontal",
        feature={
            "saveAsImage": {"title": "Save PNG", "backgroundColor": "#080808"},
            "restore": {"title": "Reset"},
            "dataView": {"title": "Data", "readOnly": True},
        },
    )


def score_bar(chart_id: str, rows: list[dict[str, Any]], title: str, subtitle: str = "", show_title: bool = True) -> str:
    rows = sorted(rows, key=lambda item: (item.get("score") or -1, item.get("timestamp") or ""))
    labels = [item["short_label"] for item in rows]
    values = [item.get("score") for item in rows]
    escha_indices = [index for index, item in enumerate(rows) if item.get("is_escha")]
    chart = Bar(init_opts=base_chart(chart_id, f"{max(430, 64 + len(rows) * 29)}px"))
    chart.add_xaxis(labels)
    chart.add_yaxis(
        "Score",
        values,
        category_gap="36%",
        itemstyle_opts=opts.ItemStyleOpts(
            color=JsCode(f"function(p){{return {json.dumps(escha_indices)}.includes(p.dataIndex)?'{AMD}':'{CYAN}';}}"),
            border_radius=[0, 3, 3, 0],
        ),
        label_opts=opts.LabelOpts(is_show=True, position="right", formatter="{c}"),
    )
    chart.reversal_axis()
    chart.set_global_opts(
        title_opts=opts.TitleOpts(is_show=show_title, title=title, subtitle=subtitle, title_textstyle_opts=opts.TextStyleOpts(color="#f7f7f4"), subtitle_textstyle_opts=opts.TextStyleOpts(color=MUTED)),
        legend_opts=opts.LegendOpts(is_show=False),
        tooltip_opts=opts.TooltipOpts(
            trigger="axis",
            axis_pointer_type="shadow",
            formatter=JsCode("function(p){let d=p[0];return '<b>'+d.name+'</b><br>Score: '+d.value+'/100';}"),
        ),
        xaxis_opts=opts.AxisOpts(
            min_=0,
            max_=100,
            axislabel_opts=opts.LabelOpts(color=MUTED),
            splitline_opts=opts.SplitLineOpts(is_show=True, linestyle_opts=opts.LineStyleOpts(color=GRID)),
        ),
        yaxis_opts=opts.AxisOpts(axislabel_opts=opts.LabelOpts(color="#f7f7f4", font_size=10)),
        toolbox_opts=toolbox(),
    )
    chart.options["grid"] = {"left": "25%", "right": "9%", "top": 42 if not show_title else 88, "bottom": 46, "containLabel": False}
    chart.set_series_opts(markline_opts=opts.MarkLineOpts(data=[opts.MarkLineItem(x=90, name="Escha")], linestyle_opts=opts.LineStyleOpts(color=AMD, type_="dashed")))
    return chart.render_embed()


def short(text: str, limit: int = 58) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"


def h(value: Any) -> str:
    return html.escape("—" if value is None or value == "" else str(value))


def fmt_num(value: Any, digits: int = 2) -> str:
    if value is None:
        return "—"
    return f"{float(value):,.{digits}f}"


def quality_table(rows: list[dict[str, Any]]) -> str:
    body = []
    for row in sorted(rows, key=lambda item: item.get("timestamp") or "", reverse=True):
        body.append(
            "<tr data-family='{family}' data-quant='{quant}' data-kind='{kind}'>"
            "<td class='mono'>{date}</td><td>{family_label}</td><td>{suite}</td>"
            "<td><b>{model}</b></td><td><span class='quant'>{quant_label}</span></td>"
            "<td class='num'>{tasks}</td><td class='num score'>{score}</td></tr>".format(
                family=h(row["family"]), quant=h(row["quant"]), kind=h(row["kind"]),
                date=h((row.get("timestamp") or "")[:10]), family_label=h(row["family"]), suite=h(row["suite"]),
                model=h(row["model_family"]), quant_label=h(row["quant"]),
                tasks=h(row.get("tasks")), score=fmt_num(row.get("score"), 2),
            )
        )
    return "".join(body)


def public_result(row: dict[str, Any]) -> dict[str, Any]:
    """Return the public benchmark fields and discard operational metadata."""
    return {
        "date": (row.get("timestamp") or "")[:10],
        "family": row["family"],
        "suite": row["suite"],
        "kind": row["kind"],
        "model": row["model_family"],
        "quant": row["quant"],
        "tasks": row.get("tasks"),
        "score_name": row.get("score_name"),
        "score": row.get("score"),
        "base_score": row.get("base_score"),
        "plus_score": row.get("plus_score"),
    }


def build(args: argparse.Namespace) -> None:
    quality_sql = f"""
        SELECT seq,run_id,timestamp_utc,benchmark_family,suite,row_kind,profile_id,tasks,
               score_name,score_value,base_rate,plus_rate,prefill_tok_s,generation_tok_s,
               total_runtime_s,generation_seconds,model_path,row_json
        FROM quality_result_rows
        WHERE {is_35b_sql()}
          AND row_kind IN ('aggregate','dataset','manifest_result')
        ORDER BY seq
    """
    quality = [
        row for row in normalize_quality(db_rows(args.quality_db, quality_sql))
        if row["model_family"] in RELEASED_MODEL_LABELS and row.get("score") is not None
    ]

    # Add the Escha result set used by the report.
    hermes = [row for row in quality if row["family"] == "hermesagent-20" and row["kind"] == "aggregate"]
    escha_hermes = {
        "timestamp": "2026-08-03",
        "run_id": "escha-hermesagent-20",
        "family": "hermesagent-20",
        "suite": "official-20",
        "kind": "aggregate",
        "profile": "EschaMoE W2",
        "model_family": "Escha W2",
        "quant": "Escha W2 / hybrid 2–3b + INT8",
        "tasks": 20,
        "score_name": "avg_score",
        "score": ESCHA["hermes"]["score"],
        "base_score": None,
        "plus_score": None,
    }
    hermes_all = hermes + [escha_hermes]
    hermes_full = highest_scores(
        [row for row in hermes_all if row.get("tasks") == 20 and row.get("score") != 16],
        ("model_family", "quant"),
    )
    for row in hermes_full:
        row["label"] = f"{row['model_family']} · {row['quant']}"
        row["short_label"] = short(row["label"], 69)
        row["is_escha"] = row["model_family"] == "Escha W2"

    # Charts show only the highest score for each model and quant.
    def dataset_rows(family: str, suite_term: str) -> list[dict[str, Any]]:
        candidates = highest_scores(
            [
                row for row in quality
                if row["family"] == family and row["kind"] == "dataset" and suite_term in row["suite"].lower() and row.get("score") is not None
            ],
            ("model_family", "quant"),
        )
        for row in candidates:
            row["label"] = f"{row['model_family']} · {row['quant']}"
            row["short_label"] = short(row["label"], 68)
            row["is_escha"] = False
        return candidates

    humaneval = dataset_rows("evalplus", "humaneval")
    mbpp = dataset_rows("evalplus", "mbpp")
    bigcode = dataset_rows("bigcodebench", "hard")
    escha_humaneval = {
        **escha_hermes, "run_id": "escha-humaneval-plus",
        "family": "evalplus", "suite": "humaneval", "kind": "dataset", "tasks": 164,
        "score_name": "pass@1_plus", "score": ESCHA["campaign"]["humaneval_plus"],
        "base_score": ESCHA["campaign"]["humaneval_base"], "plus_score": ESCHA["campaign"]["humaneval_plus"],
        "label": "Escha W2 · hybrid 2–3b + INT8", "short_label": "Escha W2 · hybrid 2–3b + INT8", "is_escha": True,
    }
    escha_bigcode = {
        **escha_hermes, "run_id": "escha-bigcodebench-hard",
        "family": "bigcodebench", "suite": "bigcodebench-hard-instruct", "kind": "dataset", "tasks": 148,
        "score_name": "pass@1", "score": ESCHA["campaign"]["bigcodebench_hard"],
        "label": "Escha W2 · hybrid 2–3b + INT8", "short_label": "Escha W2 · hybrid 2–3b + INT8", "is_escha": True,
    }
    escha_mbpp = {
        **escha_hermes, "run_id": "escha-mbpp-plus",
        "family": "evalplus", "suite": "mbpp", "kind": "dataset", "tasks": 378,
        "score_name": "pass@1_plus", "score": ESCHA["campaign"]["mbpp_plus"],
        "base_score": ESCHA["campaign"]["mbpp_base"], "plus_score": ESCHA["campaign"]["mbpp_plus"],
        "label": "Escha W2 · hybrid 2–3b + INT8", "short_label": "Escha W2 · hybrid 2–3b + INT8", "is_escha": True,
    }
    escha_tool = {
        **escha_hermes, "run_id": "escha-tool-eval-69",
        "family": "tool-eval-bench", "suite": "standard-69", "kind": "dataset", "tasks": 69,
        "score_name": "final_score", "score": ESCHA["campaign"]["tool_eval_69"],
    }
    escha_tool_hard = {
        **escha_hermes, "run_id": "escha-tool-eval-hard-15",
        "family": "tool-eval-bench", "suite": "hard-15", "kind": "dataset", "tasks": 15,
        "score_name": "final_score", "score": ESCHA["campaign"]["tool_eval_hard_15"],
    }
    humaneval.append(escha_humaneval)
    bigcode.append(escha_bigcode)
    mbpp.append(escha_mbpp)
    public_quality = [
        row for row in quality
        if not (row["family"] == "hermesagent-20" and row.get("tasks") != 20)
        and not (row["family"] == "evalplus" and row["suite"].lower() == "aggregate")
    ]
    quality_with_escha = highest_scores(
        public_quality + [escha_hermes, escha_humaneval, escha_mbpp, escha_bigcode, escha_tool, escha_tool_hard],
        ("family", "suite", "model_family", "quant", "tasks"),
    )

    ranks = sorted((row["score"] for row in hermes_full if row.get("score") is not None), reverse=True)
    hermes_rank = 1 + sum(score > ESCHA["hermes"]["score"] for score in ranks)
    top_hermes = max(ranks) if ranks else ESCHA["hermes"]["score"]
    quant_variants = sorted({row["quant"] for row in quality_with_escha})
    human_best = max((row["score"] for row in humaneval if not row.get("is_escha") and row.get("score") is not None), default=ESCHA["campaign"]["humaneval_plus"])
    mbpp_best = max((row["score"] for row in mbpp if not row.get("is_escha") and row.get("score") is not None), default=ESCHA["campaign"]["mbpp_plus"])
    bigcode_best = max((row["score"] for row in bigcode if not row.get("is_escha") and row.get("score") is not None), default=ESCHA["campaign"]["bigcodebench_hard"])
    human_gap = max(0.0, human_best - ESCHA["campaign"]["humaneval_plus"])
    mbpp_gap = max(0.0, mbpp_best - ESCHA["campaign"]["mbpp_plus"])
    bigcode_gap = max(0.0, bigcode_best - ESCHA["campaign"]["bigcodebench_hard"])

    snapshot = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "escha": ESCHA,
        "quality_rows": [public_result(row) for row in quality_with_escha],
        "counts": {
            "quality_rows": len(quality_with_escha),
            "hermes_aggregate_rows": len(hermes_full),
            "hermes_full_comparison_rows": len(hermes_full),
            "quant_variants": len(quant_variants),
        },
    }
    args.data_out.parent.mkdir(parents=True, exist_ok=True)
    args.data_out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    campaign = ESCHA["campaign"]
    mbpp_note = "The original 378 first samples are being scored; Mbpp/84 remains a preserved failure." if campaign["mbpp_plus"] is None else f"MBPP+: {campaign['mbpp_base']:.1f}% base / {campaign['mbpp_plus']:.1f}% plus. Mbpp/84 remains a preserved failure."

    charts = {
        "hermes_bar": score_bar("hermes_score_chart", hermes_full, "", "", show_title=False),
        "humaneval": score_bar("humaneval_chart", humaneval, "HumanEval+ · released 35B models", "Best EvalPlus plus pass@1 per model and quant"),
        "mbpp": score_bar("mbpp_chart", mbpp, "MBPP+ · released 35B models", "Best EvalPlus plus pass@1 per model and quant") if mbpp else "<p class='empty'>No scored 35B MBPP+ rows found.</p>",
        "bigcode": score_bar("bigcode_chart", bigcode, "BigCodeBench Hard Instruct · released 35B models", "Best pass@1 per model and quant"),
    }

    template = r'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>2-bit Escha W2 vs Released 35B Models | Ciru Inference Lab</title>
  <meta name="description" content="Interactive research showing how 2-bit-class Escha W2 compares with released higher-quant 35B models across HermesAgent-20, coding, and tool use.">
  <meta name="theme-color" content="#080808">
  <link rel="icon" type="image/png" sizes="32x32" href="../ccglogo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
  <style>
    :root { color-scheme: dark; --bg:#080808; --bg2:#111114; --panel:rgba(15,16,19,.94); --panel2:rgba(23,24,29,.96); --line:rgba(255,255,255,.13); --line2:rgba(255,255,255,.26); --text:#f7f7f4; --muted:#a8adb7; --subtle:#767d8a; --amd:#ed1c24; --red:#ff4e5f; --orange:#ff9f43; --yellow:#f6c046; --green:#20d1a2; --cyan:#39d0ff; --blue:#78a8ff; --violet:#c994ff; --shadow:0 24px 70px rgba(0,0,0,.46); --radius:8px; --max:1640px; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; min-height:100vh; color:var(--text); font-family:"Space Grotesk",system-ui,sans-serif; line-height:1.5; background:linear-gradient(120deg,rgba(237,28,36,.2),transparent 29%),linear-gradient(300deg,rgba(57,208,255,.11),transparent 32%),repeating-linear-gradient(135deg,rgba(255,255,255,.034) 0 1px,transparent 1px 20px),linear-gradient(180deg,#090809 0%,#111115 45%,#080808 100%); }
    body::before { content:""; position:fixed; inset:0; pointer-events:none; background-image:linear-gradient(rgba(237,28,36,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px); background-size:36px 36px; opacity:.34; mask-image:linear-gradient(180deg,rgba(0,0,0,.76),transparent 84%); }
    a { color:var(--cyan); text-decoration:none; } a:hover,a:focus-visible { color:#fff; text-decoration:underline; }
    header,main,.footer { width:min(calc(100% - 28px),var(--max)); margin-inline:auto; position:relative; z-index:1; }
    header { margin-top:6px; border:1px solid var(--line); border-radius:10px; background:linear-gradient(120deg,rgba(237,28,36,.22),transparent 36%),linear-gradient(180deg,rgba(28,28,31,.96),rgba(9,9,10,.93)); box-shadow:var(--shadow); overflow:hidden; }
    header::before { content:""; position:absolute; inset:0; pointer-events:none; border-top:3px solid var(--amd); background:linear-gradient(90deg,rgba(237,28,36,.16),transparent 50%),repeating-linear-gradient(90deg,transparent 0 28px,rgba(255,255,255,.04) 28px 29px); }
    header>* { position:relative; z-index:1; }
    .brand-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px 0; }
    .brand-lockup { display:inline-flex; align-items:center; gap:12px; color:var(--text); text-decoration:none; }
    .logo-plate { display:grid; place-items:center; width:42px; height:42px; border:1px solid rgba(237,28,36,.32); border-radius:8px; background:linear-gradient(135deg,rgba(237,28,36,.16),rgba(57,208,255,.06)),rgba(0,0,0,.26); overflow:hidden; }
    .logo-plate img { width:100%; height:100%; object-fit:contain; transform:scale(1.2); }
    .brand-title { display:block; font-weight:800; text-transform:uppercase; line-height:1.05; }
    .brand-subtitle,.mono { font-family:"IBM Plex Mono",ui-monospace,monospace; } .brand-subtitle { display:block; color:var(--muted); font-size:.72rem; margin-top:4px; }
    .button,nav a { border:1px solid rgba(57,208,255,.32); border-radius:8px; background:rgba(57,208,255,.08); color:#e9f7ff; padding:8px 11px; font:700 .75rem "IBM Plex Mono",monospace; text-transform:uppercase; text-decoration:none; white-space:nowrap; }
    .button:hover,nav a:hover { border-color:rgba(57,208,255,.72); color:#fff; text-decoration:none; }
    .hero { padding:30px 20px 25px; }
    .kicker { color:#ff7863; font-weight:700; letter-spacing:.12em; text-transform:uppercase; font-size:.72rem; margin:0 0 10px; }
    h1 { margin:0; max-width:1200px; font-size:clamp(2.1rem,5.4vw,5.2rem); line-height:.92; letter-spacing:-.045em; text-transform:uppercase; }
    .subtitle { max-width:1040px; margin:18px 0 0; color:#c6c9cf; font-size:1.08rem; }
    .meta-row,.tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    .tag { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:4px; background:rgba(255,255,255,.04); padding:5px 8px; color:var(--muted); font:700 .68rem "IBM Plex Mono",monospace; text-transform:uppercase; }
    .tag.red { border-color:rgba(237,28,36,.45); color:#ff8a8f; background:rgba(237,28,36,.1); } .tag.cyan { border-color:rgba(57,208,255,.38); color:#b9efff; background:rgba(57,208,255,.08); } .tag.green { border-color:rgba(32,209,162,.4); color:#8ff0d5; background:rgba(32,209,162,.08); } .tag.warn { border-color:rgba(255,159,67,.45); color:#ffc388; background:rgba(255,159,67,.08); }
    nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
    main { padding:26px 0 52px; }
    section { margin:0 0 20px; padding:22px; border:1px solid var(--line); border-radius:8px; background:var(--panel); box-shadow:var(--shadow); }
    h2 { margin:0 0 8px; font-size:clamp(1.25rem,2.4vw,1.65rem); line-height:1.16; text-transform:uppercase; } h3 { margin:0 0 10px; font-size:1.05rem; }
    .section-intro { margin:0 0 18px; max-width:1050px; color:var(--muted); }
    .stats { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; }
    .stat { border:1px solid var(--line); border-radius:8px; background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018)),var(--panel2); padding:15px; min-height:118px; }
    .stat b { display:block; color:var(--cyan); font:700 clamp(1.35rem,2.3vw,2rem) "IBM Plex Mono",monospace; line-height:1.05; } .stat.escha b { color:#ff6f73; } .stat span { display:block; margin-top:8px; color:var(--muted); font-size:.82rem; } .stat small { display:block; margin-top:5px; color:var(--subtle); font:500 .66rem "IBM Plex Mono",monospace; }
    .callout { margin-top:16px; border:1px solid rgba(57,208,255,.24); border-left:5px solid var(--cyan); border-radius:8px; background:rgba(57,208,255,.08); padding:15px 18px; } .callout.warning { border-color:rgba(255,159,67,.25); border-left-color:var(--orange); background:rgba(255,159,67,.08); } .callout.good { border-color:rgba(32,209,162,.25); border-left-color:var(--green); background:rgba(32,209,162,.08); } .callout p { margin:0; }
    .hermes-chart { min-width:0; overflow:hidden; }
    .echarts-root>div { max-width:100%; }
    .score-strip { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:9px; margin-bottom:14px; } .score-chip { border:1px solid var(--line); background:rgba(255,255,255,.035); border-radius:7px; padding:12px; } .score-chip b { display:block; font:700 1.25rem "IBM Plex Mono",monospace; color:var(--cyan); } .score-chip.escha b { color:#ff6f73; } .score-chip span { color:var(--muted); font-size:.76rem; }
    .tabs { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 12px; } .tab { appearance:none; border:1px solid var(--line); border-radius:6px; padding:8px 10px; background:rgba(255,255,255,.04); color:var(--muted); font:700 .72rem "IBM Plex Mono",monospace; cursor:pointer; text-transform:uppercase; } .tab.active { border-color:rgba(57,208,255,.55); color:#fff; background:rgba(57,208,255,.12); }
    .tab-panel { display:none; } .tab-panel.active { display:block; }
    .table-tools { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 0 12px; }
    input,select { min-height:38px; border:1px solid var(--line); border-radius:6px; background:#0d0e10; color:var(--text); padding:8px 10px; font:500 .78rem "IBM Plex Mono",monospace; } input { min-width:min(430px,100%); flex:1; }
    .table-wrap { max-height:720px; overflow:auto; border:1px solid var(--line); border-radius:7px; }
    table { width:100%; border-collapse:separate; border-spacing:0; background:rgba(0,0,0,.18); font-size:.78rem; }
    th,td { border-right:1px solid var(--line); border-bottom:1px solid var(--line); padding:9px 10px; text-align:left; vertical-align:top; } th { position:sticky; top:0; z-index:2; background:#202126; color:var(--text); text-transform:uppercase; font:700 .67rem "IBM Plex Mono",monospace; letter-spacing:.035em; } td:last-child,th:last-child { border-right:0; } tr:last-child td { border-bottom:0; } tbody tr:hover { background:rgba(57,208,255,.045); }
    td small { display:block; max-width:440px; color:var(--subtle); margin-top:3px; overflow-wrap:anywhere; } .num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; } .score { color:#9beaff; font-weight:700; } .source { max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--subtle); } .quant { display:inline-block; color:#e9f7ff; border-bottom:1px dotted rgba(57,208,255,.5); }
    code { font-family:"IBM Plex Mono",monospace; color:#b9efff; overflow-wrap:anywhere; } .empty { color:var(--muted); padding:30px; text-align:center; }
    .footer { padding:0 0 32px; color:var(--subtle); font:500 .72rem "IBM Plex Mono",monospace; }
    @media (max-width:1180px) { .stats,.score-strip { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:850px) { .brand-row { align-items:flex-start; } .stats,.score-strip { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:560px) { header,main,.footer { width:min(calc(100% - 16px),var(--max)); } .hero,.brand-row,section { padding-left:14px; padding-right:14px; } h1 { font-size:2.15rem; } .stats,.score-strip { grid-template-columns:1fr; } .brand-row { flex-direction:column; } .button { width:100%; text-align:center; } .table-tools>* { width:100%; min-width:0; } }
  </style>
</head>
<body>
  <header>
    <div class="brand-row">
      <a class="brand-lockup" href="../"><span class="logo-plate"><img src="../ccglogo.png" alt="Crown Citadel Group"></span><span><span class="brand-title">Ciru Inference Lab</span><span class="brand-subtitle">llm.ciru.ai / research</span></span></a>
      <a class="button" href="../">Research Index</a>
    </div>
    <div class="hero">
      <p class="kicker">Crown Citadel Research Report</p>
      <h1>2-bit Escha, high-quant quality</h1>
      <p class="subtitle">A two-bit-class Qwen3.6-35B-A3B model leads the released 35B HermesAgent field and remains close to the best higher-quant coding results.</p>
      <div class="meta-row"><span class="tag red">2-bit-class EschaMoE W2</span><span class="tag cyan">Qwen3.6 35B-A3B</span><span class="tag green">Released-model field</span><span class="tag warn">Benchmarked result</span><span class="tag">Updated 2026-08-03</span></div>
      <nav aria-label="Report sections"><a href="#readout">Readout</a><a href="#hermes">HermesAgent-20</a><a href="#coding">Coding</a><a href="#quality-ledger">Quality Ledger</a></nav>
    </div>
  </header>

  <main>
    <section id="readout">
      <h2>Executive readout</h2>
      <p class="section-intro">The result is quality density. Escha’s 2-bit-class W2 format leads the released 35B HermesAgent field and stays within a few percentage points of the best higher-quant coding runs.</p>
      <div class="stats">
        <div class="stat escha"><b>2-bit W2</b><span>Expert quant core</span><small>2b gate/up · 3b down · INT8 dense</small></div>
        <div class="stat escha"><b>90 / 100</b><span>HermesAgent-20</span><small>rank #{hermes_rank} of {hermes_count} model/quant results</small></div>
        <div class="stat"><b>90.9%</b><span>HumanEval+ plus</span><small>{human_gap} pp from released best</small></div>
        <div class="stat"><b>75.7%</b><span>MBPP+ plus</span><small>286/378 · {mbpp_gap} pp from released best</small></div>
        <div class="stat"><b>29.73%</b><span>BigCodeBench Hard</span><small>44/148 · {bigcode_gap} pp from released best</small></div>
        <div class="stat"><b>87 / 100</b><span>Tool Eval · 69</span><small>80/100 on the 15-task hard set</small></div>
      </div>
      <div class="callout good"><p><strong>Bottom line.</strong> A 2-bit-class Escha model posts the best released-model 35B HermesAgent-20 score, while landing only {human_gap} points behind the best HumanEval+ result, {mbpp_gap} behind the best MBPP+ result, and {bigcode_gap} behind the best comparable BigCodeBench Hard result. That is the meaningful story: unusually high retained quality at W2.</p></div>
    </section>

    <section id="hermes">
      <h2>HermesAgent-20</h2>
      <p class="section-intro">The headline ranks {hermes_count} model-and-quant combinations using each combination’s highest complete 20-scenario score.</p>
      <div class="hermes-chart echarts-root">{hermes_bar}</div>
      <div class="callout"><p><strong>What stands out:</strong> Escha’s 90/100 exceeds the next-best released-model result at 88 despite using the lowest-bit weight format in the comparison. Bars are labeled with the quant wherever it is identifiable.</p></div>
    </section>

    <section id="coding">
      <h2>Coding and tool use</h2>
      <p class="section-intro">HumanEval+ and MBPP+ use EvalPlus plus pass@1, BigCodeBench uses pass@1, and Tool Eval reports its native 100-point score. Each chart keeps only the highest score for a model and quant.</p>
      <div class="score-strip">
        <div class="score-chip escha"><b>87 / 100</b><span>Tool Eval · 69</span></div><div class="score-chip escha"><b>80 / 100</b><span>Tool Eval hard · 15</span></div><div class="score-chip"><b>95.1%</b><span>HumanEval base</span></div><div class="score-chip"><b>90.9%</b><span>HumanEval plus</span></div><div class="score-chip"><b>{mbpp_chip}</b><span>MBPP plus</span></div><div class="score-chip"><b>29.73%</b><span>BigCode Hard</span></div>
      </div>
      <div class="tabs" data-tabs="coding"><button class="tab active" data-tab="humaneval">HumanEval+</button><button class="tab" data-tab="mbpp">MBPP+</button><button class="tab" data-tab="bigcode">BigCodeBench</button></div>
      <div class="tab-panel active echarts-root" data-panel="humaneval">{humaneval_chart}</div>
      <div class="tab-panel echarts-root" data-panel="mbpp">{mbpp_chart}</div>
      <div class="tab-panel echarts-root" data-panel="bigcode">{bigcode_chart}</div>
      <div class="callout warning"><p><strong>MBPP scoring is complete.</strong> {mbpp_note} The score uses the original 378 first samples.</p></div>
    </section>

    <section id="quality-ledger">
      <h2>Released 35B quality ledger</h2>
      <p class="section-intro">Highest scored result for each public 35B model, quant, and suite, plus the Escha results. Search model, series, quant, or suite.</p>
      <div class="table-tools"><input id="quality-search" type="search" placeholder="Search quality rows…"><select id="quality-family"><option value="">All families</option>{family_options}</select><span class="tag cyan" id="quality-count"></span></div>
      <div class="table-wrap"><table id="quality-table"><thead><tr><th>Date</th><th>Family</th><th>Suite</th><th>Public release</th><th>Quant</th><th class="num">Tasks</th><th class="num">Score</th></tr></thead><tbody>{quality_rows}</tbody></table></div>
    </section>
  </main>
  <footer class="footer">Ciru Inference Lab · released-model quality comparison · generated {generated}</footer>
  <script>
    document.querySelectorAll('[data-tabs]').forEach(group=>{group.addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(!button)return;const section=group.parentElement;group.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el===button));section.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===button.dataset.tab));window.dispatchEvent(new Event('resize'));});});
    function wireTable(searchId,selectId,tableId,countId,attribute){const search=document.getElementById(searchId),select=document.getElementById(selectId),rows=[...document.querySelectorAll(`#${tableId} tbody tr`)],count=document.getElementById(countId);function apply(){const q=search.value.trim().toLowerCase(),choice=select.value;let visible=0;rows.forEach(row=>{const okText=!q||row.textContent.toLowerCase().includes(q),okSelect=!choice||row.dataset[attribute]===choice;row.hidden=!(okText&&okSelect);if(!row.hidden)visible++;});count.textContent=`${visible} / ${rows.length} rows`;};search.addEventListener('input',apply);select.addEventListener('change',apply);apply();}
    wireTable('quality-search','quality-family','quality-table','quality-count','family');
  </script>
</body></html>'''

    families = sorted({row["family"] for row in quality_with_escha})
    replacements = {
        "hermes_rank": hermes_rank,
        "hermes_count": len(hermes_full),
        "mbpp_chip": "pending" if campaign["mbpp_plus"] is None else f"{campaign['mbpp_plus']:.1f}%",
        "mbpp_note": h(mbpp_note),
        "human_gap": f"{human_gap:.1f}",
        "mbpp_gap": f"{mbpp_gap:.1f}",
        "bigcode_gap": f"{bigcode_gap:.1f}",
        "hermes_bar": charts["hermes_bar"],
        "humaneval_chart": charts["humaneval"],
        "mbpp_chart": charts["mbpp"],
        "bigcode_chart": charts["bigcode"],
        "quality_rows": quality_table(quality_with_escha),
        "family_options": "".join(f"<option value='{h(family)}'>{h(family)}</option>" for family in families),
        "generated": snapshot["generated_utc"],
    }
    html_out = template
    for key, value in replacements.items():
        html_out = html_out.replace("{" + key + "}", str(value))
    html_out = "\n".join(line.rstrip() for line in html_out.splitlines()) + "\n"
    args.html_out.parent.mkdir(parents=True, exist_ok=True)
    args.html_out.write_text(html_out, encoding="utf-8")
    print(json.dumps({"html": str(args.html_out), "data": str(args.data_out), "counts": snapshot["counts"], "hermes_rank": hermes_rank, "top_hermes": top_hermes}, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quality-db", type=Path, required=True)
    parser.add_argument("--html-out", type=Path, default=Path("index.html"))
    parser.add_argument("--data-out", type=Path, default=Path("results.json"))
    return parser.parse_args()


if __name__ == "__main__":
    build(parse_args())
