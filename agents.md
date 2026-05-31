# Benchmark Site Agent Guide

This repository publishes the Crown Citadel benchmark site at `llm.ciru.ai`.

The current public page is v2 at `index.html`. The archived original page is `v1/index.html`. A direct v2 copy is kept at `benchv2/index.html`; when changing v2, update root first, then sync the `benchv2/` copy with adjusted relative paths.

## Repo Map

- `index.html`: public v2 homepage.
- `benchv2/index.html`: direct v2 copy served at `/benchv2/`.
- `v1/index.html`: old dashboard served at `/v1/`; do not overwrite it.
- `benchv2/scripts/build-data.mjs`: pulls benchmark data from `ciru` over SSH and writes the v2 data bundle.
- `benchv2/data/benchv2-data.json`: generated structured data.
- `benchv2/data/benchv2-data.js`: generated browser bundle, assigned to `window.BENCHV2_DATA`.
- `coding-quality/index.html`: standalone coding quality comparison page for EvalPlus and related coding benchmark suites.
- `BENCHMARK_HISTORY.md`: historical notes, run directories, method notes, and benchmark context.
- Race pages:
  - `dflash/`
  - `dflash/tg-race/`
  - `dflash/master-race/`
  - `dflash/master-race/archive-128-record-race.html`
  - `dflash/master-race/live-reveal-draft.html`
  - `dflash/master-race/static-gauntlet-v1.html`
  - `qwen35-mtp-race/`

## Remote Benchmark Sources

The data builder connects to `ciru`. The default SSH settings are in `benchv2/scripts/build-data.mjs`:

```text
BENCHV2_SSH_HOST or crown@192.168.0.238
BENCHV2_SSH_KEY or ~/.ssh/id_ed25519
```

Primary source locations on `ciru`:

- Main benchmark database: `/home/crown/bench-results/llama/results.sqlite3`
- Ledger mirror: `/home/crown/bench-results/llama/results.ledger.jsonl`
- MTP serving sweeps: `/home/crown/bench-results/llama/mtp-server/*/results.jsonl`
- Hermes auxiliary model evals: `/home/crown/bench-results/hermes-aux-eval/results.jsonl`
- Hermes loadout evals: `/home/crown/bench-results/hermes-aux-loadout/loadout-results.jsonl`
- Coding quality lab runs: `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs/*`
- Race summaries:
  - `/srv/llm/runs/20260512-203510-qwen36-27b-dflash-pflash-strix-full/summary.json`
  - `/srv/llm/runs/20260512-213418-qwen36-27b-fixed-decode-tg-pflash-vs-baseline/decode-tg-summary.json`
  - `/srv/llm/runs/20260512-235444-qwen36-27b-pflash-output-audit-rerun/qwen36-27b-dflash-pflash-output-audit-summary.json`
  - `/srv/llm/runs/20260513-015545-tg64-all-lanes/tg64-summary.json`
  - `/srv/llm/runs/20260513-qwen36-35b-mtp-unsloth-strix/mtp-benchmark-summary.json`
  - `/srv/llm/runs/20260514-094535-qwen36-mxfp4moe-race-draft4/race-summary.json`
  - `/srv/llm/runs/20260514-084001-crown-vs-mxfp4-mtp-draft4-mirofish-filter/mirofish-draft4-filter-summary.json`

Do not expose these server paths in public cards unless the page is explicitly for internal operators. Public visitors cannot access `/srv/llm/...` or `/home/crown/...`.

## Benchmark And Quality Lab Inventory

Use this section when a task asks where benchmark data, quality data, harnesses, or generated artifacts live.

### Local Site Repo

- Public v2 site files: `index.html`, `benchv2/index.html`, `coding-quality/index.html`.
- Generated public data bundle: `benchv2/data/benchv2-data.json` and `benchv2/data/benchv2-data.js`.
- Data collector: `benchv2/scripts/build-data.mjs`.
- Historical notes and benchmark context: `BENCHMARK_HISTORY.md`.

### `ciru` Benchmark Harnesses

- Machine setup and benchmark scripts: `/home/crown/machine-setup`
- Hermes aux harness source: `/home/crown/machine-setup/hermes-aux-eval/hermes_aux_eval.py`
- Older benchmark notes/state: `/home/crown/machine-setup/state`
- Local model/service profiles: `/home/crown/machine-setup/model-profiles`
- Real coding harness copy in the result area: `/home/crown/bench-results/llama/run_real_coding_workloads_20260518.py`
- General user benchmark checkouts: `/home/crown/benchmarks`

### `ciru` Throughput And Serving Results

- Main llama benchmark result root: `/home/crown/bench-results/llama`
- Structured DB: `/home/crown/bench-results/llama/results.sqlite3`
- JSONL mirrors: `/home/crown/bench-results/llama/results.jsonl` and `/home/crown/bench-results/llama/results.ledger.jsonl`
- Raw llama-bench outputs and sample files: `/home/crown/bench-results/llama/*-llama-bench.raw` and `/home/crown/bench-results/llama/*-samples.json`
- Prompt fixtures: `/home/crown/bench-results/llama/prompts`
- MTP serving sweeps: `/home/crown/bench-results/llama/mtp-server/*/results.jsonl`
- Real-coding long-context patch workload runs: `/home/crown/bench-results/llama/real-coding/*/results.jsonl`
- Real-coding candidate rosters: `/home/crown/bench-results/llama/real-coding*.json`
- Usage recordings: `/home/crown/bench-results/llama/usage-recordings`
- Mirofish quality data: `/home/crown/bench-results/llama/mirofish/quality`

### `ciru` Hermes Behavior Results

- Hermes aux behavior results: `/home/crown/bench-results/hermes-aux-eval/results.jsonl`
- Per-run Hermes aux outputs: `/home/crown/bench-results/hermes-aux-eval/<run-id>/`
- Hermes main+aux loadout results: `/home/crown/bench-results/hermes-aux-loadout/loadout-results.jsonl`
- Related replay/eval roots, when needed for context: `/home/crown/bench-results/hermes-session-replay`, `/home/crown/bench-results/hermes-title-replay`, `/home/crown/bench-results/hermes-vision-replay`

### External SSD Quality Lab

The richer coding quality lab is on the external SSD mounted at:

```text
/srv/ssd/p3700ba/data/llm-benchmarking-lab
```

Important subpaths:

- Run root: `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs`
- Tool wrappers: `/srv/ssd/p3700ba/data/llm-benchmarking-lab/bin/quality-*`
- Benchmark tool clones: `/srv/ssd/p3700ba/data/llm-benchmarking-lab/tools/clones`
- EvalPlus completed summaries: `runs/<run-id>/outputs/evalplus/summary.json`
- EvalPlus per-profile summaries: `runs/<run-id>/outputs/evalplus/*-summary.json`
- Live llama.cpp metrics summaries: `runs/<run-id>/outputs/metrics/summary.json`
- Human-readable run reports: `runs/<run-id>/reports/*.md`
- EvalPlus raw and sanitized samples: `runs/<run-id>/raw/evalplus/<profile>/<suite>/`
- EvalPlus generation and evaluation logs: `runs/<run-id>/logs/evalplus/<profile>/`
- Per-run scripts and summarizers: `runs/<run-id>/work/`
- Sandbox notes for generated-code execution: `runs/<run-id>/sandbox-notes/`

Known quality lab run examples:

- `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs/20260522T205318Z-full-coding-benchmark-large`
- `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs/20260523T070002Z-nemotron3-nano-omni-evalplus`
- `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs/20260523T104718Z-evalplus-qwopus-gemma-crown-metrics`
- `/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs/20260524T051816Z-quick-coding-test-small`

The SSD also has scratch/build trees under `/srv/ssd/p3700b/scratch/crown/tmp`. Those are useful for compiler or llama.cpp build provenance, but public pages should consume normalized result summaries rather than build-tree files.

### Quality Lab Tooling Names

The SSD lab currently exposes wrappers for common quality benchmarks:

- EvalPlus: `quality-evalplus`, `quality-evalplus-generate`
- BigCodeBench: `quality-bigcodebench`, `quality-bigcodebench-generate`
- LiveCodeBench: `quality-livecodebench`
- Aider and SWE-bench style repo edits: `quality-aider`, `quality-swebench`, `quality-mini-swe-agent`
- Function calling and general evals: `quality-bfcl`, `quality-livebench`, `quality-lighteval`, `quality-opencompass`
- Long-context RULER: `quality-ruler`
- Lab inspection/runtime helpers: `quality-env`, `quality-python`, `quality-lm-eval`, `quality-promptfoo`, `quality-inspect`

When publishing quality data, prefer summary JSON or generated public bundles. Avoid copying raw prompts, raw completions, absolute paths, logs with environment details, or generated-code execution traces into visible public UI.

## Data Build

To refresh v2 data:

```powershell
node benchv2\scripts\build-data.mjs
```

The build script executes an embedded Python collector on `ciru`, then writes:

```text
benchv2/data/benchv2-data.json
benchv2/data/benchv2-data.js
```

After regenerating, check the printed summary:

- `storeOk` should be `true`.
- `counts.benchmark_rows` should match the ledger row count.
- `strictRows`, `comparableRows`, API row counts, MTP rows, aux candidates, and loadouts should look plausible.

If a new source type is added, extend the embedded Python in `build-data.mjs` first. Keep the browser page consuming a clean JSON shape instead of scraping text from raw files.

## Main Data Arrays

`window.BENCHV2_DATA` currently provides:

- `meta`: generated time, source host, database, ledger status, row counts, latest timestamp.
- `strictRows`: validated llama-bench rows. This is the default atlas/chart result set.
- `comparableRows`: broader llama-bench rows for the `All Results` toggle.
- `apiRows`: `llama-server-api` rows for serving request behavior.
- `mtpServer`: summarized speculative/MTP server sweeps.
- `auxEval`: Hermes auxiliary model behavior tests.
- `loadouts`: Hermes main+aux loadout behavior tests.
- `codingLab`: external SSD coding quality lab summaries, currently EvalPlus HumanEval+ and MBPP+ with wall-clock generation speed and live metrics where captured.
- `races`: race summary JSON payloads.
- `notes`: generated method notes; v2 currently uses hand-authored `METHOD_NOTES` in `index.html`.

## How Atlas Profiles Work

The atlas does not display one row per raw benchmark row. It groups rows into profiles with `profileKey(row)` in `index.html`:

```text
modelName | backend | kv | batch | ubatch | splitMode | buildCommit/buildNumber | modelType
```

Context bands are:

```text
4k, 8k, 16k, 32k, 64k, 80k, 100k, 128k
```

Each band stores best `pg`, best `pp`, best `tg`, and memory sample where available. `cellMetric(cell, "context")` returns `pg` first, then `pp`. Standalone `tg` is kept separate because decode answers a different question from prompt/prefill behavior.

When adding new llama-bench rows to the database, make sure the DB row has enough settings for grouping:

- model path/name
- mode: `pp`, `pg`, or `tg`
- context length
- avg throughput
- backend
- KV types
- batch and ubatch
- split mode
- build number or commit
- memory samples when available

Incomplete rows may appear only in `All Results`, depending on the strict/comparable SQL views on `ciru`.

## Chart Wiring

Update `index.html` and then sync `benchv2/index.html`.

### Frontier Chart

Function: `renderFrontierChart()`

Data: grouped `profiles` from the active result set.

Requirements for a point:

- selected context band has a context row (`pg` or `pp`)
- profile has standalone `tg`
- profile has measured VRAM

Encoding:

- x: peak VRAM GiB
- y: standalone TG tokens/s
- color: selected context speed
- dot size: memory-scaled, capped

### Prompt / Prefill vs Decode

Function: `renderThroughputChart()`

Data: grouped `profiles` from the active result set.

Requirements for a point:

- selected context band has `pg` or `pp`
- profile has standalone `tg`

Encoding:

- x: selected-band prompt/prefill speed (`PG` or `PP`)
- y: standalone TG tokens/s
- series: model family

This chart exists because v1 had a useful prompt-vs-decode chart and users expect to see that balance.

### Context Curves

Function: `renderCurveChart()`

Data: grouped `profiles` from the active result set.

Rules:

- Only draw profiles with at least four measured context points.
- Require at least one 64k+ result.
- Do not draw sparse one-off long-context profiles.
- Sparse long-context checks belong in the atlas, not as misleading lines.

### Benchmark Atlas

Functions: `renderAtlas()`, `renderInspector()`

Data: grouped `profiles`.

Rules:

- Default source is `Validated`.
- `All Results` can show older or less complete rows.
- The measured context/run details accordion starts collapsed.
- If a user opens or closes the details accordion, preserve that state while they select other models.
- Keep the atlas spacious; it is the main data browser.

### MTP Serving Lab

Function: `renderServerLab()`

Data:

- Chart/table from `DATA.mtpServer`
- Serving request table from `DATA.apiRows`

This section should be public-facing. Avoid labels like `API rows`; use language such as serving requests, request behavior, first-token delay, total request time, prompt size, generated output, acceptance, and memory.

### Hermes Aux Behavior Tests

Function: `renderQuality()`

Data:

- `DATA.auxEval.candidates`
- `DATA.loadouts.loadouts`

Messaging:

- These are Hermes agent support-model behavior tests.
- They evaluate auxiliary models for side work, not only raw speed.
- Dot size represents evaluation coverage/row count. Keep dots capped so large coverage does not dominate the chart.

### Hermes Loadout Behavior

Function: `renderQuality()`

Data: `DATA.loadouts.loadouts`

Messaging:

- Loadouts test Hermes main and auxiliary models together as a routing plan.
- Explain that an agent loadout must be correct, responsive at p95, and small enough to coexist in memory beside the main model.

### Coding Quality Lab

Function: `renderCodingQuality()`

Data: `DATA.auxEval.candidates[*].categories.code_review`

This section appears toward the bottom of v2, after the race gallery and before method notes. It is currently based on the `code_review` / security-review task family in the Hermes auxiliary model suite.

Rules:

- Present it as coding quality, not raw throughput.
- Make clear that these are code review security tasks from the Hermes aux benchmark suite.
- Show correctness and latency together: pass rate, average score, average task time, and coverage.
- Exclude harness/config invalid rows from model scoring. The data builder marks these with `invalidRows`, `scoredRows`, and adjusted metrics on the category summary.
- Keep raw coverage visible so readers can see that excluded rows existed.
- Use candidate/family labels, not server paths.
- Keep the ranking table sorted by adjusted pass rate, then adjusted score, then adjusted latency.
- If future benchmark categories are added for bug fixing, repo edits, test writing, or code generation, either extend `codingQualityRows()` to include those suites or add/extend a generated object in `build-data.mjs`.

### Standalone Coding Quality Page

File: `coding-quality/index.html`

Data: `DATA.codingLab`

Rules:

- Keep this as the public coding quality page linked from the main homepage.
- Default ranking uses newest completed EvalPlus summary per profile.
- Compare correctness and speed without collapsing them into one opaque score.
- Show EvalPlus+ pass@1, base pass@1, suite coverage, wall-clock codegen samples/min, and live decode metrics where captured.
- Do not expose SSD, `/srv/...`, or `/home/crown/...` paths in visible UI or in `DATA.codingLab`.
- When adding new coding suites such as BigCodeBench, LiveCodeBench, SWE-bench, or repo-edit tests, extend `summarize_coding_lab()` first so the page receives normalized public data.

### Race Gallery

Functions/data:

- `DATA.races`
- `RACE_LINKS_BY_TITLE`
- `EXTRA_RACE_PAGES`
- `summarizeRace()`
- `renderRacesAndNotes()`

Rules:

- Every race card needs a plain-English description before the user clicks.
- CTA buttons must look clickable and say `Open race`.
- Do not show server-only summary paths on cards.
- Include all public race pages, not just the summaries listed in `DATA.races`.
- Race cards should explain what the race measures: speed, correctness, acceptance, validation status, memory pressure, failures, and output contract health.

When adding a new race:

1. Add its remote summary JSON path to `summarize_races()` in `build-data.mjs`.
2. Regenerate `benchv2-data`.
3. Add or update a public page under `dflash/`, `dflash/master-race/`, or another public folder.
4. Add the card link in `RACE_LINKS_BY_TITLE` if the title comes from `DATA.races`.
5. If it is a standalone public page without a remote summary, add it to `EXTRA_RACE_PAGES`.
6. Make sure `summarizeRace()` has a useful public description for its kind/title.

## Public Presentation Rules

Use these rules unless the user explicitly asks for an internal/debug view:

- Keep Crown Citadel branding consistent.
- v2 is the main page; v1 remains available at `/v1/`.
- Do not overwrite v1.
- Do not use internal meta labels as public category names. For example, avoid `API rows`; use `Serving Request Runs`.
- Avoid comparative copy that references development history, such as `wider atlas` or `new page`. Visitors arrive without that context.
- Do not expose server paths as visible card content.
- Make chart explanations human-readable and state what question the chart answers.
- Keep the speed frontier chart near the top; it is the first major visual.
- Keep the atlas large and useful.
- Avoid top summary cards that highlight one-off tiny-model wins or zero-context speed outliers.
- Do not add decorative cards that do not help a human interpret the data.
- Navigation tabs should look like buttons, not inert labels.
- Race start buttons should be visually obvious.
- Method notes must contain useful methodology, not empty placeholders.
- Use `NixOS • Linux 7.0.1` and `RADV STRIX_HALO` in the top environment chips. The full kernel detail currently used as a tooltip is: `Linux ciru 7.0.1 #1-NixOS SMP PREEMPT_DYNAMIC Wed Apr 22 11:32:23 UTC 2026 x86_64`.

## Model Naming Rules

Canonical aliases live in `CANONICAL_MODEL_NAMES` inside `build-data.mjs`.

Current required alias:

```text
Qwen3.6-35B-A3B-HaloStrix-Dyn-MTP-v7 -> Qwen3.6-35B-A3B-Crown-Dyn-MTP
```

If a raw model name is not public-facing, normalize it in the build script so every chart and table receives the clean name.

Family classification lives in `family_for(text)`. Add new model families there when new data arrives, otherwise rows will fall into `Other`.

## Syncing Root v2 to `/benchv2/`

After editing root `index.html`, sync the direct v2 copy:

```powershell
Copy-Item -LiteralPath index.html -Destination benchv2\index.html -Force
$path = 'benchv2\index.html'
$content = Get-Content -LiteralPath $path -Raw
$content = $content.Replace('href="ccglogo.png"', 'href="../ccglogo.png"')
$content = $content.Replace('src="benchv2/data/benchv2-data.js"', 'src="data/benchv2-data.js"')
$content = $content.Replace('srcset="242861895-A_AMD_Ryzen_AI_MAX_plus_badge.avif"', 'srcset="../242861895-A_AMD_Ryzen_AI_MAX_plus_badge.avif"')
$content = $content.Replace('src="242861895-A_AMD_Ryzen_AI_MAX_plus_badge.avif"', 'src="../242861895-A_AMD_Ryzen_AI_MAX_plus_badge.avif"')
$content = $content.Replace('href="coding-quality/"', 'href="../coding-quality/"')
$content = $content.Replace('href="llama-tuning-report.html"', 'href="../llama-tuning-report.html"')
Set-Content -LiteralPath $path -Value $content -NoNewline
```

## Validation

Run script parse checks after edits:

```powershell
@'
const fs = require('fs');
for (const file of ['index.html', 'benchv2/index.html', 'v1/index.html', 'coding-quality/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const [i, m] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
    new Function(m[1]);
    console.log(`${file} inline script ${i} ok`);
  }
}
'@ | node
```

Check local references:

```powershell
@'
const fs = require('fs');
const path = require('path');
const files = ['index.html', 'benchv2/index.html', 'v1/index.html', 'coding-quality/index.html'];
const attrs = [/<(?:script|img|source)[^>]+(?:src|srcset)="([^"]+)"/g, /<link[^>]+href="([^"]+)"/g, /<a[^>]+href="([^"]+)"/g];
const missing = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const base = path.dirname(path.resolve(file));
  for (const re of attrs) for (const match of html.matchAll(re)) {
    let ref = match[1].split(/\s+/)[0];
    if (!ref || ref.includes('${') || ref.startsWith('#') || /^[a-z]+:/i.test(ref) || ref.startsWith('//')) continue;
    ref = ref.split('#')[0].split('?')[0];
    if (!ref) continue;
    const resolved = path.resolve(base, ref);
    if (!fs.existsSync(resolved) && !fs.existsSync(path.join(resolved, 'index.html'))) missing.push({ file, ref, resolved });
  }
}
console.log(JSON.stringify({ missing }, null, 2));
if (missing.length) process.exit(1);
'@ | node
```

For visual checks, serve the static files locally rather than opening `file://` if the browser policy blocks file URLs.

## Publishing

The repo remote is GitHub, branch `main`. The public site is deployed by Vercel from the pushed branch.

Before committing:

- Stage only files related to the benchmark task.
- Do not stage unrelated dirty files such as screenshots, backups, generated side experiments, or unrelated notes.
- Common staged files for v2 changes are:
  - `index.html`
  - `benchv2/index.html`
  - `benchv2/data/benchv2-data.js`
  - `benchv2/data/benchv2-data.json`
  - `benchv2/scripts/build-data.mjs`
  - `coding-quality/index.html`
  - `v1/index.html` only when intentionally changing v1
  - `agents.md` when updating this guide

After push, poll:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'https://llm.ciru.ai/' -Headers @{ 'Cache-Control'='no-cache' }
Invoke-WebRequest -UseBasicParsing -Uri 'https://llm.ciru.ai/v1/' -Headers @{ 'Cache-Control'='no-cache' }
Invoke-WebRequest -UseBasicParsing -Uri 'https://llm.ciru.ai/benchv2/' -Headers @{ 'Cache-Control'='no-cache' }
Invoke-WebRequest -UseBasicParsing -Uri 'https://llm.ciru.ai/coding-quality/' -Headers @{ 'Cache-Control'='no-cache' }
```

Vercel may lag briefly after GitHub accepts the push.
