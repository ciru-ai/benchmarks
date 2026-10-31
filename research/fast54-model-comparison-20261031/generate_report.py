#!/usr/bin/env python3
"""Render a static Ciru report with Apache ECharts options made by pyecharts."""
from __future__ import annotations

import html
import json
from pathlib import Path

from pyecharts import options as opts
from pyecharts.charts import HeatMap
from pyecharts.commons.utils import JsCode

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "benchmark-data.json").read_text())
COLUMNS = ["ARC", "IFEval", "HumanEval+", "Tool-Eval"]


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def make_heatmap(group: dict) -> str:
    # An explicit cell label is retained independently of its visual percentage:
    # 9/15 and 15/17 do not mean the same case set was eligible.
    cells = []
    for y, run in enumerate(group["runs"]):
        for x, score in enumerate(run["scores"]):
            passed, denominator = score if score else (0, 0)
            item = {
                "value": [x, y, round(100 * passed / denominator, 1) if denominator else 0],
                "display": f"{passed}/{denominator}" if denominator else "—",
                "model": run["name"],
                "component": COLUMNS[x],
                "detail": run["notes"][x],
            }
            if not score:
                item["itemStyle"] = {"color": "#202328", "borderColor": "#0c0e10", "borderWidth": 4}
            cells.append(item)

    chart = (
        HeatMap(init_opts=opts.InitOpts(bg_color="transparent", animation_opts=opts.AnimationOpts(animation=False)))
        .add_xaxis(COLUMNS)
        .add_yaxis(
            "Passes / eligible", [r["short"] for r in group["runs"]], cells,
            label_opts=opts.LabelOpts(is_show=True, color="#f7f7f4", font_size=13,
                font_family="IBM Plex Mono", formatter=JsCode("function(p){return p.data.display;}")),
            itemstyle_opts=opts.ItemStyleOpts(border_color="#0c0e10", border_width=4),
        )
        .set_global_opts(
            legend_opts=opts.LegendOpts(is_show=False),
            xaxis_opts=opts.AxisOpts(type_="category", position="top",
                axislabel_opts=opts.LabelOpts(color="#bec4cc", font_size=11, font_family="Space Grotesk"),
                axisline_opts=opts.AxisLineOpts(is_show=False), axistick_opts=opts.AxisTickOpts(is_show=False)),
            yaxis_opts=opts.AxisOpts(type_="category", is_inverse=True,
                axislabel_opts=opts.LabelOpts(color="#e8e8e3", font_size=11, font_family="Space Grotesk"),
                axisline_opts=opts.AxisLineOpts(is_show=False), axistick_opts=opts.AxisTickOpts(is_show=False)),
            visualmap_opts=opts.VisualMapOpts(min_=0, max_=100, is_show=False,
                range_color=["#34272b", "#82403f", "#db5b51", "#20a28f"]),
            tooltip_opts=opts.TooltipOpts(
                background_color="#16191c", border_color="#454a51", textstyle_opts=opts.TextStyleOpts(color="#f7f7f4"),
                formatter=JsCode("function(p){const d=p.data;return '<strong>'+d.model+'</strong><br>'+d.component+': '+d.display+'<br><span style=\"color:#a8adb7\">'+d.detail+'</span>';}")),
        )
    )
    # Give model labels and heatmap cells enough room on narrow displays. The
    # surrounding scroller exposes a complete keyboard-accessible table too.
    chart.options["grid"] = {"left": 205, "right": 20, "top": 52, "bottom": 14}
    return chart.dump_options()


def table(group: dict) -> str:
    lines = []
    for run in group["runs"]:
        scores = "".join(f'<td>{esc(str(s[0])+"/"+str(s[1]) if s else "—")}</td>' for s in run["scores"])
        lines.append(f'<tr><th scope="row">{esc(run["name"])}</th>{scores}<td class="context">{esc(run["environment"])}</td></tr>')
    return "\n".join(lines)


def run_cards() -> str:
    cards = []
    for group in DATA["groups"]:
        for run in group["runs"]:
            cards.append(f'''<details class="run-card"><summary><span><span class="run-name">{esc(run['name'])}</span><span class="run-meta">{esc(run['date'])} · {esc(group['title'])}</span></span><span class="expand">+</span></summary>
              <div class="run-body"><p><strong>Environment</strong> {esc(run['environment'])}</p><p><strong>Settings</strong> {esc(run['settings'])}</p><p><strong>Frontier</strong> {esc(run['frontier'])}</p><p><strong>Source record</strong> <code>{esc(run['source'])}</code></p><ul>{''.join('<li>'+esc(note)+'</li>' for note in run['notes'])}</ul></div></details>''')
    return "\n".join(cards)


def main() -> None:
    template = (ROOT / "report-template.html").read_text()
    replacements = {
        "@@PUBLISHER_CHART@@": make_heatmap(DATA["groups"][0]),
        "@@HISTORICAL_CHART@@": make_heatmap(DATA["groups"][1]),
        "@@PUBLISHER_TABLE@@": table(DATA["groups"][0]),
        "@@HISTORICAL_TABLE@@": table(DATA["groups"][1]),
        "@@RUN_CARDS@@": run_cards(),
    }
    for key, value in replacements.items():
        assert key in template, key
        template = template.replace(key, value)
    assert "@@" not in template
    (ROOT / "index.html").write_text(template)
    print(f"Generated {ROOT / 'index.html'} from {sum(len(g['runs']) for g in DATA['groups'])} runs")


if __name__ == "__main__":
    main()
