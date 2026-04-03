# Benchmark History

This file tracks prior LLM benchmark runs or related test commands found on this machine.

## Known prior runs

### 2026-04-02 Gemma 4 Q4_K_M benchmark series

Run labels:

- `gemma-4-e2b-it-q4-km`
- `gemma-4-e4b-it-q4-km`
- `gemma-4-26b-a4b-it-q4-km`
- `gemma-4-31b-it-q4-km`

Models:

- E2B: `/srv/llm/models/Gemma-4-E2B-it-Q4_K_M/google_gemma-4-E2B-it-Q4_K_M.gguf`
- E4B: `/srv/llm/models/Gemma-4-E4B-it-Q4_K_M/google_gemma-4-E4B-it-Q4_K_M.gguf`
- 26B A4B: `/srv/llm/models/Gemma-4-26B-A4B-it-Q4_K_M/google_gemma-4-26B-A4B-it-Q4_K_M.gguf`
- 31B Dense: `/srv/llm/models/Gemma-4-31B-it-Q4_K_M/google_gemma-4-31B-it-Q4_K_M.gguf`

Source:

- All four GGUFs were downloaded from the new `bartowski/google_gemma-4-*-GGUF` repos after Google announced Gemma 4 on `2026-04-02`

Tooling note:

- The system `llama.cpp` build on this host could not load Gemma 4 and failed with `unknown model architecture: 'gemma4'`
- A fresh local Vulkan-enabled `llama.cpp` build from `/tmp/llama.cpp-gemma4` was used for the benchmarks
- [bench-llama.sh](/home/crown/machine-setup/bench-llama.sh) was updated to preserve a caller-supplied `PATH` so the benchmark wrapper can use that newer binary without replacing the system package

Common settings:

- contexts: `4096 16384 32768`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- wrapper guard: `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- `qwen-main.service` was stopped and runtime-masked before the run so the live serving model would not contend for VRAM

E2B results:

- Manifest: `/srv/llm/runs/20260402-185005-gemma-4-e2b-it-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `3027.12 ± 3.28 t/s` | `107.00 ± 0.23 t/s` | `10.28 GiB` | `8.38 GiB` | `3.89 GiB` | `/srv/llm/runs/20260402-185005-gemma-4-e2b-it-q4-km-p4096.log` |
| 16384 | `2363.87 ± 1.93 t/s` | `107.07 ± 0.17 t/s` | `10.44 GiB` | `8.49 GiB` | `3.91 GiB` | `/srv/llm/runs/20260402-185005-gemma-4-e2b-it-q4-km-p16384.log` |
| 32768 | `1805.97 ± 1.71 t/s` | `106.60 ± 0.09 t/s` | `10.72 GiB` | `8.55 GiB` | `3.94 GiB` | `/srv/llm/runs/20260402-185005-gemma-4-e2b-it-q4-km-p32768.log` |

E4B results:

- Manifest: `/srv/llm/runs/20260402-185134-gemma-4-e4b-it-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `1734.97 ± 10.12 t/s` | `56.74 ± 0.19 t/s` | `10.65 GiB` | `10.27 GiB` | `4.25 GiB` | `/srv/llm/runs/20260402-185134-gemma-4-e4b-it-q4-km-p4096.log` |
| 16384 | `1508.68 ± 0.87 t/s` | `57.73 ± 0.26 t/s` | `11.07 GiB` | `10.53 GiB` | `4.27 GiB` | `/srv/llm/runs/20260402-185134-gemma-4-e4b-it-q4-km-p16384.log` |
| 32768 | `1276.91 ± 1.38 t/s` | `57.25 ± 0.09 t/s` | `10.65 GiB` | `10.70 GiB` | `4.30 GiB` | `/srv/llm/runs/20260402-185134-gemma-4-e4b-it-q4-km-p32768.log` |

26B A4B results:

- Manifest: `/srv/llm/runs/20260402-185349-gemma-4-26b-a4b-it-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `1161.60 ± 7.20 t/s` | `60.57 ± 0.06 t/s` | `9.16 GiB` | `21.38 GiB` | `2.66 GiB` | `/srv/llm/runs/20260402-185349-gemma-4-26b-a4b-it-q4-km-p4096.log` |
| 16384 | `1016.14 ± 1.83 t/s` | `60.57 ± 0.02 t/s` | `8.96 GiB` | `21.60 GiB` | `2.69 GiB` | `/srv/llm/runs/20260402-185349-gemma-4-26b-a4b-it-q4-km-p16384.log` |
| 32768 | `853.77 ± 0.51 t/s` | `60.74 ± 0.08 t/s` | `9.04 GiB` | `21.99 GiB` | `2.72 GiB` | `/srv/llm/runs/20260402-185349-gemma-4-26b-a4b-it-q4-km-p32768.log` |

31B Dense results:

- Manifest: `/srv/llm/runs/20260402-185714-gemma-4-31b-it-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `233.88 ± 0.07 t/s` | `10.69 ± 0.00 t/s` | `9.45 GiB` | `24.87 GiB` | `3.19 GiB` | `/srv/llm/runs/20260402-185714-gemma-4-31b-it-q4-km-p4096.log` |
| 16384 | `202.89 ± 0.16 t/s` | `10.69 ± 0.00 t/s` | `9.53 GiB` | `25.86 GiB` | `3.21 GiB` | `/srv/llm/runs/20260402-185714-gemma-4-31b-it-q4-km-p16384.log` |
| 32768 | aborted | not measured | not measured | not measured | not measured | `/srv/llm/runs/20260402-185714-gemma-4-31b-it-q4-km-p32768.log` |

Takeaways:

- Gemma 4 loaded and benchmarked successfully once a current `llama.cpp` build with `gemma4` support was used
- `E2B` is the outright throughput leader and stayed above `106 t/s` TG across the tested contexts
- `E4B` roughly halves E2B prompt throughput but still sustains about `57 t/s` TG while staying near `10.7 GiB` VRAM
- `26B A4B` is the best larger-model result in this series: about `60.6 t/s` TG with `21.4` to `22.0 GiB` VRAM, and much stronger PP than the 31B dense model
- `31B Dense` is technically runnable on this host, but it is not practically competitive under the current Vulkan setup: only about `10.7 t/s` TG, `24.9` to `25.9 GiB` VRAM at the first two contexts, and the `32768` pass was manually stopped after running for more than 10 minutes
- On this machine today, Gemma 4 `26B A4B Q4_K_M` looks like the strongest larger Gemma option, while `E2B` is the clear lightweight speed winner

### 2026-04-02 Qwopus3.5-27B-v3-Q5_K_M initial validation and benchmark

Run label: `qwopus3.5-27b-v3-q5-km`

- Manifest: `/srv/llm/runs/20260402-141136-qwopus3.5-27b-v3-q5-km-bench.txt`
- Model: `/home/crown/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q5_K_M.gguf`
- Command pattern: `/run/current-system/sw/bin/llama-bench -ngl 999 -fa 1 -n 128 -r 2 -o md`
- Guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- Status: completed successfully
- Validation: direct `llama-cli` chat-mode sanity check returned `4` for `2 + 2` with `--reasoning-budget 0`

Low-context tuning at `4096` before the main run:

- `-ngl 999 -fa 1`: `300.21 t/s` PP, `11.22 t/s` TG
- `-ngl 999 -fa 0`: `291.12 t/s` PP, `11.22 t/s` TG
- `-ngl 99 -fa 1`: `296.90 t/s` PP, `11.23 t/s` TG
- Selected settings for the main run: `-ngl 999 -fa 1`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `296.35 ± 0.16 t/s` | `11.26 ± 0.00 t/s` | `6.89 GiB` | `18.11 GiB` | `1.02 GiB` | `/srv/llm/runs/20260402-141136-qwopus3.5-27b-v3-q5-km-p4096.log` |
| 16384 | `262.44 ± 0.17 t/s` | `11.26 ± 0.01 t/s` | `6.92 GiB` | `18.99 GiB` | `1.04 GiB` | `/srv/llm/runs/20260402-141136-qwopus3.5-27b-v3-q5-km-p16384.log` |
| 32768 | `208.53 ± 0.05 t/s` | `11.27 ± 0.00 t/s` | `6.93 GiB` | `19.86 GiB` | `1.08 GiB` | `/srv/llm/runs/20260402-141136-qwopus3.5-27b-v3-q5-km-p32768.log` |

Takeaways:

- The Q5 quant is stable under the same Vulkan full-offload settings as Q4
- Versus `Qwopus3.5-27B-v3-Q4_K_M`, Q5 is consistently a bit slower and uses about `2.3 GiB` more VRAM at `32768`
- The small benchmark delta does not show a performance reason to prefer Q5 over Q4 on this host
- If Q5 is worth keeping as a serving option, the case will need to come from output quality, not throughput

Quality follow-up on the same date:

- Saved transcript set:
  - `/home/crown/machine-setup/state/qwopus-q4-quality-20260402.md`
  - `/home/crown/machine-setup/state/qwopus-q5-quality-20260402.md`
- Comparison summary:
  - `/home/crown/machine-setup/state/qwopus-quality-comparison-20260402.md`
- Result:
  - The 8-prompt side-by-side eval did not show a clear Q5 quality win
  - Both models leaked empty `<think>` tags even with `llama-server` reasoning disabled and `reasoning_budget=0`
  - Q4 was marginally cleaner on output formatting, while Q5 was occasionally a little more verbose
  - Practical recommendation remains Q4 unless a workload-specific eval later shows a repeatable Q5 advantage

### 2026-04-02 Qwopus3.5-27B-v3-Q4_K_M initial validation and benchmark

Run label: `qwopus3.5-27b-v3-q4-km`

- Manifest: `/srv/llm/runs/20260402-133000-qwopus3.5-27b-v3-q4-km-bench.txt`
- Model: `/home/crown/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q4_K_M.gguf`
- Command pattern: `/run/current-system/sw/bin/llama-bench -ngl 999 -fa 1 -n 128 -r 2 -o md`
- Guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- Status: completed successfully
- Validation: `qwen-main.service` was stopped and runtime-masked during the run to avoid auto-restart contention; direct `llama-cli` chat-mode sanity check returned `4` for `2 + 2` with `--reasoning-budget 0`

Low-context tuning at `4096` before the main run:

- `-ngl 999 -fa 1`: `305.53 t/s` PP, `12.82 t/s` TG
- `-ngl 999 -fa 0`: `296.28 t/s` PP, `12.84 t/s` TG
- `-ngl 99 -fa 1`: `302.20 t/s` PP, `12.81 t/s` TG
- Selected settings for the main run: `-ngl 999 -fa 1`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `305.26 ± 0.83 t/s` | `12.86 ± 0.00 t/s` | `6.88 GiB` | `15.76 GiB` | `1.02 GiB` | `/srv/llm/runs/20260402-133000-qwopus3.5-27b-v3-q4-km-p4096.log` |
| 16384 | `267.00 ± 0.42 t/s` | `12.85 ± 0.01 t/s` | `6.92 GiB` | `16.81 GiB` | `1.04 GiB` | `/srv/llm/runs/20260402-133000-qwopus3.5-27b-v3-q4-km-p16384.log` |
| 32768 | `211.45 ± 0.03 t/s` | `12.86 ± 0.00 t/s` | `6.96 GiB` | `17.51 GiB` | `1.08 GiB` | `/srv/llm/runs/20260402-133000-qwopus3.5-27b-v3-q4-km-p32768.log` |

Takeaways:

- The model is stable under llama.cpp Vulkan with full offload and modest memory use for its class
- It is much lighter on VRAM than the 80B Qwen baselines, but materially slower on token generation
- Raw and chat-mode sanity checks suggest this fine-tune strongly prefers a reasoning scaffold unless the reasoning budget is forced to zero
- This is a valid new local benchmark point, but not an obvious replacement for the current Qwen coding baseline on pure throughput

### 2026-03-30

Workflow update:

- Added [bench-llama.sh](/home/crown/machine-setup/bench-llama.sh) to standardize `llm-guard` benchmark runs and save timestamped outputs in `/srv/llm/runs`
- Default runner target remains `/srv/llm/models/Qwen3-Coder-Next-Q5_K_M/Qwen3-Coder-Next-Q5_K_M-00001-of-00004.gguf`
- Default contexts match the documented baseline series: `4096 16384 32768 100000`
- Default guard reserves in the runner are `8 GiB` system RAM, `2 GiB` VRAM, and `4 GiB` GTT
- Verified the wrapper with `--dry-run`; no benchmark was launched in this session

Candidate models currently present on disk for comparison:

- `/srv/llm/models/Qwen3-Coder-Next-Q4_K_M/Qwen3-Coder-Next-Q4_K_M.gguf`
- `/srv/llm/models/Qwen3.5-27B-Q5_K_M/Qwen_Qwen3.5-27B-Q5_K_M.gguf`

Notes:

- `/srv/llm/runs` was still empty before adding the wrapper
- The sandbox prevented writing to `/srv/llm/runs` during validation, so only dry-run validation was performed here
- The original local single-file `Qwen3-Coder-Next-Q4_K_M` artifact was later removed after failing direct inference sanity checks

### 2026-03-31 Qwen3-Coder-Next-Q5_K_M split-model verification

Run label: `qwen3-coder-next-q5-km`

- Manifest: `/srv/llm/runs/20260331-145027-qwen3-coder-next-q5-km-bench.txt`
- Model: `/srv/llm/models/Qwen3-Coder-Next-Q5_K_M/Qwen3-Coder-Next-Q5_K_M-00001-of-00004.gguf`
- Command pattern: `/run/current-system/sw/bin/llama-bench -ngl 999 -fa 1 -n 128 -r 2 -o md`
- Guard profile: inline launcher guard with `8 GiB` system RAM reserve, `1 GiB` VRAM reserve, and `4 GiB` GTT reserve
- Status: completed successfully

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `555.14 ± 1.35 t/s` | `51.53 ± 0.15 t/s` | `4.03 GiB` | `53.54 GiB` | `0.47 GiB` | `/srv/llm/runs/20260331-145027-qwen3-coder-next-q5-km-p16384.log` |

Takeaways:

- The split Q5 model is re-verified locally with a saved manifest and per-context log instead of only a hand-entered summary
- `16384` remains in the same performance band as the prior user-reported baseline and is materially slower than the newer Q4 quant
- Peak VRAM during this isolated run stayed well below the current live serving footprint seen from `llama-server`

### 2026-03-31 Qwen3-Coder-Next-Q4_K_M official GGUF replacement

Run label: `qwen3-coder-next-q4-km-official`

- Manifest: `/srv/llm/runs/20260331-161911-qwen3-coder-next-q4-km-official-bench.txt`
- Model: `/srv/llm/models/Qwen3-Coder-Next-Q4_K_M_official/Qwen3-Coder-Next-Q4_K_M-00001-of-00004.gguf`
- Command pattern: `/run/current-system/sw/bin/llama-bench -ngl 999 -fa 1 -n 128 -r 2 -o md`
- Guard profile: inline benchmark guard with `8 GiB` system RAM reserve, `1 GiB` VRAM reserve, and `4 GiB` GTT reserve
- Status: completed successfully
- Validation: direct `llama-cli` sanity check returned `2 + 2 = 4.`; direct OpenAI-compatible server sanity check returned `4`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `576.34 ± 1.73 t/s` | `55.95 ± 0.23 t/s` | `3.75 GiB` | `45.85 GiB` | `0.47 GiB` | `/srv/llm/runs/20260331-161911-qwen3-coder-next-q4-km-official-p16384.log` |

Takeaways:

- The earlier local single-file Q4 artifact was bad; the official 4-part Qwen GGUF replacement is working correctly
- The working official Q4 result beats the re-verified split Q5 baseline at the same `16384` context on both PP and TG
- This official replacement is now the first Q4 artifact on this host that is both benchmarked and directly validated for sane output

### 2026-03-31 Qwen3-Coder-Next official Q4 vs Q5 refresh series

Run labels:

- `qwen3-coder-next-q4-km-official-refresh`
- `qwen3-coder-next-q5-km-refresh`

Models:

- Q4: `/srv/llm/models/Qwen3-Coder-Next-Q4_K_M_official/Qwen3-Coder-Next-Q4_K_M-00001-of-00004.gguf`
- Q5: `/srv/llm/models/Qwen3-Coder-Next-Q5_K_M/Qwen3-Coder-Next-Q5_K_M-00001-of-00004.gguf`

Common settings:

- contexts: `4096 16384 32768 80000`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: inline benchmark guard with `8 GiB` system RAM reserve, `1 GiB` VRAM reserve, and `4 GiB` GTT reserve
- benchmarked with no model service loaded

Q4 refreshed results:

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `608.49 ± 4.61 t/s` | `55.77 ± 0.14 t/s` | `3.73 GiB` | `45.54 GiB` | `0.45 GiB` | `/srv/llm/runs/20260331-163600-qwen3-coder-next-q4-km-official-refresh-p4096.log` |
| 16384 | `574.03 ± 1.14 t/s` | `55.80 ± 0.08 t/s` | `3.74 GiB` | `45.85 GiB` | `0.47 GiB` | `/srv/llm/runs/20260331-163600-qwen3-coder-next-q4-km-official-refresh-p16384.log` |
| 32768 | `527.51 ± 0.13 t/s` | `55.60 ± 0.07 t/s` | `3.86 GiB` | `46.19 GiB` | `0.50 GiB` | `/srv/llm/runs/20260331-163600-qwen3-coder-next-q4-km-official-refresh-p32768.log` |
| 80000 | `412.62 ± 0.72 t/s` | `55.77 ± 0.16 t/s` | `3.92 GiB` | `47.35 GiB` | `0.60 GiB` | `/srv/llm/runs/20260331-163600-qwen3-coder-next-q4-km-official-refresh-p80000.log` |

Q5 refreshed results:

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `576.82 ± 2.11 t/s` | `51.21 ± 0.21 t/s` | `3.74 GiB` | `53.23 GiB` | `0.45 GiB` | `/srv/llm/runs/20260331-165113-qwen3-coder-next-q5-km-refresh-p4096.log` |
| 16384 | `550.93 ± 0.39 t/s` | `51.18 ± 0.11 t/s` | `3.79 GiB` | `53.54 GiB` | `0.47 GiB` | `/srv/llm/runs/20260331-165113-qwen3-coder-next-q5-km-refresh-p16384.log` |
| 32768 | `511.88 ± 0.14 t/s` | `51.39 ± 0.06 t/s` | `3.80 GiB` | `53.89 GiB` | `0.50 GiB` | `/srv/llm/runs/20260331-165113-qwen3-coder-next-q5-km-refresh-p32768.log` |
| 80000 | `404.03 ± 0.21 t/s` | `51.18 ± 0.04 t/s` | `3.90 GiB` | `55.05 GiB` | `0.60 GiB` | `/srv/llm/runs/20260331-165113-qwen3-coder-next-q5-km-refresh-p80000.log` |

Takeaways:

- The refreshed comparison confirms the working official Q4 is faster than Q5 at every tested context
- Q4 also holds a steady `~55.6` to `55.8 t/s` TG, versus Q5 at `~51.2` to `51.4 t/s`
- Q4 uses about `7.7` to `7.9 GiB` less VRAM than Q5 across the tested range
- At `80000`, Q4 still stays ahead: `412.62` PP vs `404.03` PP, with lower VRAM use

### 2026-03-30 overnight queue setup

- Added [TARGET_MODELS.tsv](/home/crown/machine-setup/TARGET_MODELS.tsv) to track the active shortlist, local presence, and first-wave download decisions
- Added [overnight-eval.sh](/home/crown/machine-setup/overnight-eval.sh) to run resumable downloads and skip already-completed benchmarks
- Added [overnight-watchdog.sh](/home/crown/machine-setup/overnight-watchdog.sh) plus a `systemd --user` timer to check the queue every 20 minutes and restart it if needed
- Added [MODEL_SELECTION_REPORT.md](/home/crown/machine-setup/MODEL_SELECTION_REPORT.md) as the main audit and recommendation report
- Started detached `tmux` session `overnight-eval` at `2026-03-30 04:00 EDT`
- First queued download: `Qwen3-Coder-30B-A3B-Instruct-Q5_K_M`
- Enabled linger for user `crown` so the watchdog timer continues while logged out

### 2026-03-30 Qwen3-Coder-30B-A3B-Instruct-Q5_K_M benchmark series

Run label: `qwen3-coder-30b-a3b-q5-km`

- Manifest: `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-bench.txt`
- Model: `/srv/llm/models/Qwen3-Coder-30B-A3B-Instruct-Q5_K_M/Qwen3-Coder-30B-A3B-Instruct-Q5_K_M.gguf`
- Command pattern: `llm-guard --reserve-sys-gib 8 --reserve-vram-gib 2 --reserve-gtt-gib 4 --poll-ms 250 llama-bench -ngl 999 -fa 1 -n 128 -r 2 -o md`
- Status: all queued contexts completed successfully

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `973.97 ± 12.10 t/s` | `79.82 ± 1.32 t/s` | `4.01 GiB` | `21.29 GiB` | `0.34 GiB` | `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-p4096.log` |
| 16384 | `576.85 ± 0.80 t/s` | `80.46 ± 0.03 t/s` | `4.09 GiB` | `22.43 GiB` | `0.36 GiB` | `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-p16384.log` |
| 32768 | `352.39 ± 0.22 t/s` | `80.43 ± 0.10 t/s` | `4.10 GiB` | `23.91 GiB` | `0.39 GiB` | `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-p32768.log` |
| 65536 | `163.29 ± 0.24 t/s` | `80.11 ± 0.26 t/s` | `4.15 GiB` | `26.91 GiB` | `0.45 GiB` | `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-p65536.log` |
| 100000 | `74.41 ± 0.13 t/s` | `80.41 ± 0.42 t/s` | `4.23 GiB` | `30.09 GiB` | `0.52 GiB` | `/srv/llm/runs/20260330-043208-qwen3-coder-30b-a3b-q5-km-p100000.log` |

Takeaways:

- This model is much lighter on VRAM than `Qwen3-Coder-Next-Q4_K_M`
- `tg128` stayed very strong at about `80 t/s` across all tested contexts
- `16384` looks like the best balance for an always-on coding model
- `100000` context is technically safe, but PP speed falls off hard enough that it should not be the default long-context choice on this host

### 2026-03-30 Llama-3.1-Nemotron-70B-Instruct-HF-Q4_K_M tuning check

Run labels:

- `llama-3.1-nemotron-70b-q4-km`
- `llama-3.1-nemotron-70b-q4-fa0-ngl999`

Model:

- `/srv/llm/models/Llama-3.1-Nemotron-70B-Instruct-HF-Q4_K_M/Llama-3.1-Nemotron-70B-Instruct-HF-Q4_K_M.gguf`

Results:

- `fa=1`, `4096`: about `99.49 t/s` PP, `5.17 t/s` TG
- `fa=1`, `16384`: about `49.33 t/s` PP, `5.18 t/s` TG
- `fa=0`, `4096`: about `98.55 t/s` PP, `5.16 t/s` TG

Takeaways:

- Performance was too poor to justify a full long-context series
- Turning flash attention off did not materially change the result
- This model is not a practical default for this llama.cpp Vulkan setup on Strix Halo without deeper architecture-specific tuning

### 2026-03-30 Hermes-3-Llama-3.1-8B-Q5_K_M benchmark series

Run label: `hermes-3-llama-3.1-8b-q5-km`

- Manifest: `/srv/llm/runs/20260330-084636-hermes-3-llama-3.1-8b-q5-km-bench.txt`
- Model: `/srv/llm/models/Hermes-3-Llama-3.1-8B-Q5_K_M/Hermes-3-Llama-3.1-8B-Q5_K_M.gguf`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `945.35 ± 5.79 t/s` | `38.63 ± 0.24 t/s` | `4.31 GiB` | `6.34 GiB` | `0.51 GiB` | `/srv/llm/runs/20260330-084636-hermes-3-llama-3.1-8b-q5-km-p4096.log` |
| 16384 | `564.73 ± 0.59 t/s` | `38.29 ± 0.06 t/s` | `4.32 GiB` | `7.84 GiB` | `0.53 GiB` | `/srv/llm/runs/20260330-084636-hermes-3-llama-3.1-8b-q5-km-p16384.log` |
| 32768 | `292.48 ± 0.37 t/s` | `38.53 ± 0.03 t/s` | `4.34 GiB` | `9.84 GiB` | `0.56 GiB` | `/srv/llm/runs/20260330-084636-hermes-3-llama-3.1-8b-q5-km-p32768.log` |

Takeaways:

- Hermes 3 8B is lightweight and safe on this host
- It was later outclassed by the newer `Qwen3.5` small-model comparisons for practical local use

### 2026-03-30 Qwen3.5-9B-Q4_K_M benchmark series

Run label: `qwen3.5-9b-q4-km`

- Manifest: `/srv/llm/runs/20260330-091620-qwen3.5-9b-q4-km-bench.txt`
- Model: `/srv/llm/models/Qwen3.5-9B-Q4_K_M/Qwen3.5-9B-Q4_K_M.gguf`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `969.44 ± 5.18 t/s` | `37.21 ± 0.02 t/s` | `4.94 GiB` | `5.99 GiB` | `0.88 GiB` | `/srv/llm/runs/20260330-091620-qwen3.5-9b-q4-km-p4096.log` |
| 16384 | `854.99 ± 3.02 t/s` | `38.52 ± 0.03 t/s` | `5.00 GiB` | `6.37 GiB` | `0.91 GiB` | `/srv/llm/runs/20260330-091620-qwen3.5-9b-q4-km-p16384.log` |
| 32768 | `704.80 ± 0.25 t/s` | `37.24 ± 0.12 t/s` | `4.82 GiB` | `6.87 GiB` | `0.94 GiB` | `/srv/llm/runs/20260330-091620-qwen3.5-9b-q4-km-p32768.log` |

Takeaways:

- `Qwen3.5-9B-Q4_K_M` clearly beat Hermes 3 8B on prompt processing at every overlapping tested context
- It stayed extremely light on VRAM while remaining much faster than the 27B and 70B-class alternatives

### 2026-03-30 Qwen3.5-4B-Q4_K_M benchmark series

Run label: `qwen3.5-4b-q4-km`

- Manifest: `/srv/llm/runs/20260330-092036-qwen3.5-4b-q4-km-bench.txt`
- Model: `/srv/llm/models/Qwen3.5-4B-Q4_K_M/Qwen_Qwen3.5-4B-Q4_K_M.gguf`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 4096 | `1782.74 ± 4.76 t/s` | `61.32 ± 0.03 t/s` | `4.35 GiB` | `3.90 GiB` | `0.58 GiB` | `/srv/llm/runs/20260330-092036-qwen3.5-4b-q4-km-p4096.log` |
| 16384 | `1428.80 ± 2.04 t/s` | `62.41 ± 0.19 t/s` | `4.44 GiB` | `4.28 GiB` | `0.61 GiB` | `/srv/llm/runs/20260330-092036-qwen3.5-4b-q4-km-p16384.log` |
| 32768 | `1064.36 ± 1.05 t/s` | `60.97 ± 0.02 t/s` | `4.49 GiB` | `4.78 GiB` | `0.64 GiB` | `/srv/llm/runs/20260330-092036-qwen3.5-4b-q4-km-p32768.log` |

Takeaways:

- This is the fastest small-model result measured so far on this machine
- It is an obvious candidate for ultra-light routing, short utility tasks, and quick local fallback work

### 2026-03-28

Source: `SESSION-HANDOFF.md`

1. `llama-bench -m /srv/llm/models/Qwen3-Coder-Next-Q5_K_M/Qwen3-Coder-Next-Q5_K_M-00001-of-00004.gguf -ngl 999 -fa 1 -p 4096 -n 128 -r 2 -o md`
   - Status: OOM killer fired at 2026-03-28 20:11:53 EDT
   - Notes: Ran from `/home/crown/machine-setup`; GNOME user session was torn down; machine did not reboot

2. `llama-bench -m /srv/llm/models/Qwen3-Coder-Next-Q5_K_M/Qwen3-Coder-Next-Q5_K_M-00001-of-00004.gguf -ngl 999 -fa 1 -p 16384 -n 128 -r 2 -o md`
   - Status: launched shortly after the first failed run
   - Notes: listed in incident handoff, but no standalone output log was found

3. `llama-cli -ngl 999 -fa auto -c 16384 -n 192`
   - Status: related large-prompt test around the same time
   - Notes: model path and output were not recorded in the local note

### Successful benchmark series

User-reported successful runs with:

- Model: `Qwen3-Coder-Next Q5_K_M`
- Backend: Vulkan
- Common flags: `-ngl 999 -fa 1 -n 128 -r 2`
- Guard: `llm-guard`
- Outcome: all completed successfully

| Prompt context | PP speed | TG speed | Observed VRAM |
| --- | --- | --- | --- |
| 4096 | `579.69 ± 1.97 t/s` | `51.51 ± 0.04 t/s` | not sampled during run |
| 16384 | `553.05 ± 0.94 t/s` | `51.86 ± 0.07 t/s` | about `58.26 GiB` |
| 32768 | `513.54 ± 0.36 t/s` | `51.53 ± 0.09 t/s` | about `58.64 GiB` early in run |
| 100000 | `366.52 ± 0.77 t/s` | `51.59 ± 0.11 t/s` | about `60.37 GiB` |

### Other observed model test

- Model on disk: `/srv/llm/models/Qwen3.5-27B-Q5_K_M/Qwen3.5-27B-Q5_K_M.gguf`
- User-reported result: performance was poor, around `10 t/s`
- Log status: no standalone `llama` log, run artifact, or shell history entry was found locally for this test
- Note: `/srv/llm/runs` exists but is currently empty

## Takeaways

- `tg128` stayed effectively flat at about `51.5` to `51.9 t/s` across all tested contexts
- PP speed declined as context increased, but remained usable:
- `4096 -> 16384`: about `4.6%` drop
- `16384 -> 32768`: about `7.1%` drop
- `32768 -> 100000`: about `28.6%` drop
- `100000` context still fit under the current `62 GiB` VRAM guard
- None of these benchmark-only runs reproduced the original crash

## Search summary

- Searched `/home/crown/machine-setup` for benchmark logs, results, JSON, CSV, and notes
- Searched local history-like locations and nearby files for `llama-bench`, `llama-cli`, `benchmark`, `bench`, and model names
- Searched `journalctl` for `llama-bench`, `llama-cli`, model names, and `27b`
- Searched `/srv/llm` and `/srv/llm/runs` for saved outputs
- Only concrete prior benchmark evidence found locally was in `SESSION-HANDOFF.md`

## Next entries

Append future runs here with:

- date/time
- exact command
- model
- prompt/context settings
- key throughput or latency numbers
- exit status
- log path
