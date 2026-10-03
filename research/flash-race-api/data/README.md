# Showdown data contract

`nonhermes.json` is the readable artifact; `nonhermes.min.json` contains the same data with compact whitespace. Rebuild with `python reports/ultimate-qwen-flash-strix/scripts/build_data.py` from the repository root. The builder only reads saved receipts and writes this output folder. It never invokes a model, starts a server, or reruns a benchmark.

Canonical model IDs: `ciru44`, `ciru5`, `halobox`, `gufo`, `agention`, `halogen`, `carlos`, `orca`. Orca has Hermes/storage coverage only. Kairic is a configuration of `ciru5`, not an extra model.

Every measurement row has `modelId`, `model`, `sourceId`, `sourcePath`. `sources` and `source-manifest.json` give the exact input file sizes and SHA-256 hashes. Rows use full-precision numbers. Round for display only.

## Arrays for charts and tables

- `overview`: `heNativeTps`, `heWallSeconds`, `heTiming`, `toolsOfficial`, `toolsReviewed`, `toolsOriginal`, `fidelityKl`, `packageGiB`.
- `panels.he09.rows`: `nativeTps`, `interTokenProxyTps`, `wallSeconds`, `outputTokens`, `timing`, `completed`. `cases`: `taskId`, `nativeTps`, `wallSeconds`, `outputTokens`.
- `panels.toolsRecommended.rows` and `panels.toolsOriginal.rows`: `score`, `reviewedScore`, `points`, `passed`, `partial`, `failed`, `wallSeconds`, `caseWallSeconds`, `toolCalls`, `deployability`, `responsiveness`. `cases`: `taskId`, `title`, `status`, `points`, `reviewedPoints`, `durationSeconds`, `startSeconds`, `endSeconds`, `toolCalls` (descriptions), `toolCallCount`, `summary`, `expectedBehavior`, `turnCount`.
- `panels.fidelity.rows`: `kl`, `top1Pct`, `tieAwareTop1Pct`, `nll`, `perplexity`, `logitRmse`, `positions`.
- `panels.coldPrefill.rows`: `inputTokens`, `tps`, `cachedTokens`, `outputTokens`.
- `panels.appendPrefill.rows`, `panels.countingHistorical.rows`: `promptTokens`, `depthTokens`, `pp`, `tg`, `generated`, `ttfpMs`, `wallSeconds`, `equal512Output`, `status`, `replayTokens`.
- `panels.countingPair.pairs`: `promptTokens`, `depthTokens`, `carlosTps`, `v5Tps`, `carlosOutput`, `v5Output`, `bothClean`, `eligibleForSpeedComparison`, `relativeV5Pct`. `rows` contains both stacks' PP, TG and wall-time measurements. `coldRows` has the matched five-prefix prefill observations. `summary` has the nine-eligible-cell weighted speed aggregate and all 18-cell output-integrity counts.
- `panels.kairicHE.rows`: `configuration`, `nativeTps`, `relativePct`.
- `panels.memory.rows`: `packageGiB`, `servingGiB`, `hostPressureGiB`, `peakGttGiB`, `peakVramGiB`, `method`, `host`. `speedRows` retains original speed-workload memory separately. `toolHeadroom` gives latest tool-panel minimum available RAM.

Every panel has `title`, `conditions` and `caveats`. Render the qualifications near the relevant chart, not solely in a distant footnote.

## Interpretation requirements

- No combined rank: these are separate aspects of pinned weight/runtime deployments.
- HE0–9 measures speed and completion integrity, **not code correctness**. Gufo/Halogen native rates use n/time and other stacks use (n−1)/time. Saved proxies are explicitly labeled and should not replace the native rates silently.
- Recommended TC70–84 is the fresh common-host panel. Original TC70–84 is historical, with known fixture-date and turn-limit defects. Do not combine their scores. Official pass/partial/fail is preserved; Carlos TC80's reviewed 2 points stays visibly distinct from the official 0.
- Tool replay timestamps accumulate scored case durations. `wallSeconds` for the recommended panel includes the unscored one-token transport probe; `caseWallSeconds` excludes it. Animation is a replay of recorded timings, not a live benchmark. The environments are mocks with captured executed tool observations.
- Historical prefill/counting owner lifecycles differ. These tables show observations, not strict pooled speed rankings. Early Halogen outputs have `tg: null` and must remain visible as preserved early completions.
- The fresh Carlos/Kairic pair is matched. Its 9-cell speed aggregate deliberately excludes v5 formatting/numeric failures. Show all 18-cell output outcomes alongside that selected aggregate.
- Package size is suitable for a package comparison; serving RAM methods differ. UMA GTT, VRAM, process RSS/PSS and host pressure overlap; do not add them.
- Hermes scoring/race data is extracted separately. The memory rows here use only the selected two-pass stages.
