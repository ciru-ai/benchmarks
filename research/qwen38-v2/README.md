# Qwen3.8 Flash v2.0 research report

Published at https://llm.ciru.ai/research/qwen38-v2/.

`results.json` is the normalized input for the page. HumanEval0–9 is a non-thinking MTP speed/acceptance workload, not a quality score. The BF16 data is a 64-distribution/60-loss numerical panel. Context sweeps have MTP disabled.

Rebuild:

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build_report.py
python -m http.server 8000
```

Serve the page over HTTP. `build_report.py` generates ECharts option JSON and HTML from `results.json` and `report-template.html`. `report.css` and `report.js` provide the responsive presentation; ECharts 5.5.1 is vendored. Exact measurement tables are available without JavaScript. CSV exports and the evidence archive preserve source records.

The original host-specific benchmark scripts and protocol locks are in `humaneval-evidence.zip`. The top-level harness includes the post-run correction to aggregate timing: native TG excludes one first token per request. `collect_he.py` verifies this convention against all 30 raw timings and the SQLite store; `humaneval-totals.csv` contains the resulting native-convention aggregates. No samples were rerun to make that arithmetic correction.

CIRU ran on Ciru; Laurent and Unsloth ran sequentially on Sozo. All use Ryzen AI MAX+395 / Radeon8060S gfx1151 hardware, with host identity preserved in records. No unrelated model workload ran concurrently on either host. Both services were initially inactive and remained inactive afterward. CPU governors were restored to their pre-run states.

Laurent and Unsloth card commands omit batch and microbatch flags. The exact native binaries' `--help` output was checked on 2026-09-05: each defaults to batch 2048, microbatch 512. New MTP panels retain those defaults. Sweeps explicitly use the same values. CIRU's retained profile explicitly uses 2048/512.

The `he_nonthinking.py` harness expects the local server installations and official llama-benchmark recorder paths captured in the protocol. It is an auditable reproduction artifact for this lab setup, not a portable model installer.

## Serving-context correction, 2026-09-05

The displayed CIRU HumanEval panel now uses the released 262144-token context. It supersedes the earlier 16384-token diagnostic configuration. All 10 outputs are byte-identical to the earlier run; all 10 MTP counters match. The new native aggregate TG is 54.8240798979 tok/s. Comparator panels, BF16 data and MTP-off sweeps are unchanged. Each package must use live recommended serving settings; no 16K serving profiles are permitted.
