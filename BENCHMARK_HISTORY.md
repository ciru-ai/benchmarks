# Benchmark History

This file tracks prior LLM benchmark runs or related test commands found on this machine.

## Agent quick recall

Last consolidated: `2026-05-12`

This file is the canonical local benchmark memory for agents. New entries should keep exact model paths, engine paths, settings, active context size, validity notes, and service-restore status. Older benchmark history is preserved below this quick recall section.

Current high-signal conclusions:

- New durable llama benchmark location from the `llama-benchmark` Codex skill is `/home/crown/bench-results/llama/`. Use `/home/crown/.codex/skills/llama-benchmark/scripts/llama_benchmark.py query` and prefer the `llama_bench_strict` view for published claims. The current store contains `593` rows in `results.sqlite3` plus mirrored `results.jsonl` / `results.ledger.jsonl`. New rows use `pg` for combined prompt+generation and `tg` for standalone generation; do not label `pg` as pure prefill.
- New 2026-05-12 DFlash/PFlash Strix run succeeded from `/srv/llm/runs/20260512-203510-qwen36-27b-dflash-pflash-strix-full`: Qwen3.6 27B Q4_K_M target plus `dflash-draft-3.6-q8_0.gguf`, 10 HumanEval-style prompts, `n_gen=128`, mode `fast`, mean acceptance `39.2%`, mean decode `30.33 t/s`, peak sampled VRAM `21.50 GiB`. This is +151.9% decode vs the current Qwen3.6 27B Q4 dashboard baseline (`12.04 -> 30.33 TG`), but it is not a clean llama-bench context row.
- 2026-05-12 clean roster refresh added missing dashboard rows for Qwen3.6 27B Q3/Q4/Q5/Q8, Carnice V2 27B Q8, Qwen3.6/HauhauCS/Qwopus 35B 4k refreshes, and Mistral Small 4 119B. Highlights: Qwen3.6 27B Q5 at 131072 was `148.23 PG / 10.66 TG` with `25.42 GiB` peak VRAM; Qwen3.6 35B Q8 at 131072 was `383.31 PG / 53.67 TG` with `39.96 GiB` peak VRAM; Mistral Small 4 119B reached `440.80 PG / 41.22 TG` at 4k and completed 131072 prompt processing at `110.57 PG` with `63.59 GiB` peak VRAM, but no representative standalone 131072 TG was recorded.
- 2026-05-10 b8995 q8-KV Dynamic Strix import supersedes the older main-dashboard Dynamic q8 prompt curve where `PG` is available: `799.76 PG / 66.27 TG` at 4k, `940.68 PG / 66.27 TG` at 16k, `839.70 PG / 66.27 TG` at 32k, and `438.90 PG / 66.27 TG` at 131072. Qwopus3.6 Q5 b8995 at 131072 was `421.60 PG / 68.02 TG`.
- Qwen3.6 35B A3B MTP matrix in `/home/crown/machine-setup/mtpbench.md` was run on `2026-05-06` with the isolated llama.cpp PR #22673 `mtp-clean` Vulkan binary at `/srv/llm/bench/qwen36-mtp-bench/src/llama.cpp-mtp/build-vulkan/bin`. On long real chat workloads, MTP improved decode but slowed prompt ingestion: Q4_1 MTP draft-3 was `66.8 TG` vs `59.3 TG` same-file MTP-off at 65k (+12.6%) and `53.42 TG` vs `48.86 TG` at 128k (+9.3%); Q8 MTP was `56.28 TG` vs `47.04 TG` at 65k (+19.7%) and `44.97 TG` vs `40.16 TG` at 128k (+12.0%). These are server-side multi-turn weighted generation rows, not clean `llama-bench` context rows.
- Strix-specific `0xSero/Qwen3.6-35B-A3B-GGUF-Strix` Dynamic quant was tested from the same MTP workspace. With `-b 2048 -ub 1024`, `q8_0/q8_0` KV produced `1055.10 PP / 66.17 TG` at 16k and `454.16 / 66.16` at 128k; `f16/f16` won short 16k (`1133.59 / 67.15`) but regressed true 128k prefill (`387.94 / 67.15`). Keep Dynamic Strix on q8 KV for long-context use.
- Qwen3.6 35B Q4 128k prompt batch sweep found `-b 2048 -ub 1024` best for the 96,112-token prompt: `526.41 tok/s`, about +8.9% over `-b 2048 -ub 512`; `-ub 2048` regressed.
- Gemma 4 MTP assistant heads were tested on `2026-05-08` with AtomicChat's Gemma 4 MTP llama.cpp fork, commit `2e81dc5f6`, locally rebuilt with Vulkan at `/home/crown/tmp/atomic-llama-cpp-turboquant-gemma4-mtp/build-vulkan/bin/llama-server`. Use Q4_K_S assistant heads and `--spec-type mtp --mtp-head ...`. On this Strix Halo Vulkan host, MTP is useful for larger/dense Gemma 4 decode but not for E2B: E2B old vanilla still wins (`2490.02 PP / 107.74 TG` at 16k via b8672 `llama-bench`), while Atomic MTP E2B only reached `1776.43 PP / 101.18 TG` in the best server-side `throughput` preset. E4B improved decode from `55.74` to `67.03 TG` with `lift`; 26B A4B improved from `56.04` to `59.43 TG` with `throughput`; 31B dense improved from `10.35` to `18.33 TG` with `lift`.
- Clean Gemma 4 E2B Q4_K_M refresh on `2026-05-07` using b8672 Vulkan `llama-bench`, f16 KV, `-sm row`: `2490.02 ± 3.06 PP / 107.74 ± 0.19 TG` at 16k and `764.21 ± 1.50 PP / 108.10 ± 0.62 TG` at 128k. This supersedes the older 2026-04-02 E2B 16k row and adds the missing 128k E2B row.
- MedPsy 4B Q5_K_M imatrix was downloaded from `qvac/MedPsy-4B-GGUF` on `2026-05-08`. q8 KV is the right serving profile: f16 KV at 32k was `310.97 PP / 67.12 TG` and f16 128k hit Vulkan `ErrorDeviceLost`; q8 KV improved to `581.80 PP / 67.12 TG` at 32k with lower peak GPU (`6.80 GiB`). q8 128k was manually stopped before completion due long prefill time; production profile is capped at validated `32768`.
- Gemma KV retest on `2026-05-08`: q8 KV is worse for Gemma. E2B q8 16k was `2026.97 PP / 106.41 TG`, below f16 `2490.02 / 107.74`; E4B q8 16k was only `541.17 PP / 20.46 TG`. Keep Gemma profiles on f16 KV.
- Clean `2026-05-07` current-model Qwopus3.6 run: `Qwopus3.6-35B-A3B-v1-Q5_K_M` on current system Vulkan build `8864`, serving-style `q8_0/q8_0` KV, `-sm row`, `-t 16`, `-ngl 999`, `-fa 1`, `-n 128`, `-r 2`, produced `996.23 PP / 68.14 TG` at 4k, `886.21 / 67.98` at 16k, `755.50 / 68.08` at 32k, `464.25 / 57.45` at 100k, and `400.94 / 68.20` at 128k. The 100k TG row had high variance (`±10.22`); the 128k row was cleaner (`±0.13`).
- Best validated Qwen3.6 27B Q8 speculative path: upstream b8971 built through the system Nix Vulkan package at `/home/crown/tmp/llama-cpp-upstream-20260429-b8971/result-vulkan-systempkg/bin/llama-server`, Qwen3.6 27B Q8 target, official `Qwen/Qwen3-1.7B-GGUF` Q8 draft, `--kv-unified`, `--spec-draft-n-max 32 --spec-draft-n-min 1 --spec-draft-p-min 0.75`, Vulkan. The older `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/result-vulkan/bin` package currently reports no Vulkan devices after the system update.
- Valid short/low-occupied-context result on `2026-04-30`: Qwen3.6 27B Q8 with `q8_0/q8_0` KV improved from `6.27 t/s` baseline to `17.83 t/s` with Qwen3-1.7B Q8 draft. With `f16/f16` KV it improved from `6.29` to `18.32 t/s`. This is a real result from coherent server output and clean checkpointed speculative decoding.
- Long occupied context result: at `32768` max context with about `24035` prompt tokens already active, baseline Q8 decode was `6.13 t/s`; speculative Qwen3-1.7B Q8 fell to `3.55 t/s`. Do not use this draft setup for long active context.
- Invalid result warning: standalone `llama-speculative` / `llama-speculative-simple` runs on Qwen3.6 emitted M-RoPE/KV position errors such as `inconsistent sequence positions`, `failed to decode`, or `non-consecutive token position`. Treat their throughput numbers as invalid even when tok/s looked high.
- Installed `/home/crown/.local/llama-current` was too old for valid Qwen3.6 server speculative checkpointing on `2026-04-24`: it disabled speculative decoding with `target context does not support partial sequence removal`. Fresh upstream llama.cpp fixed this by falling back to checkpoints.
- Older April DFlash tests were not useful on this AMD/Vulkan host: acceptance stayed around `1-3%`, decode was slower than baseline, and buun fork paths needed workarounds. The newer 2026-05-12 DFlash/PFlash Strix run is the first useful local DFlash result, but keep it separate from clean llama-bench context planning until a comparable long-context service run exists.
- Qwen3.6 27B Q8 is slower but preferred when quality/accuracy matters and RAM allows. Q4_XL is much faster for plain baseline decode, but the user explicitly prefers Q8 when feasible.
- HauhauCS Qwen3.6 35B A3B Uncensored Aggressive Q4/Q6/Q8 profiles should use `f16/f16` KV on this Vulkan stack. On `2026-04-29`, `f16/f16` beat the previous `q8_0/q8_0` defaults at 16k and 32k, and Q8 also held the gain at 128k. Profiles were updated accordingly.
- Official Qwen3.6 27B Q8 dense should keep `q8_0/q8_0` KV for the stable profile. Clean 32k rerun on `2026-04-29`: current build `q8_0/q8_0` was `223.82 PP / 6.11 TG`; upstream b8971 `q8_0/q8_0` was `223.54 / 6.12`; `q4_0/q4_0` was effectively tied (`223.37 / 6.11`) with slightly less memory but more quality risk; TheTom TurboQuant Vulkan `turbo3/turbo3` loaded and generated coherently but was slower at 32k (`201.48 / 6.12`).
- TheTom TurboQuant asymmetric KV with the Apr 29 attention-rotation default fix is not viable on Strix Halo Vulkan in the tested state. `q8_0/turbo4` aborts at 32k on both official Qwen3.6 27B Q8 and 35B A3B Q8 with Vulkan `SET_ROWS` unsupported for `cache_v_l3`; `q8_0/turbo3` produced no benchmark row before cutoff on both models and was not promoted to deeper context. On `2026-04-30`, TheTom `experiment/decode-speed-parity` built and saw the Vulkan device, but standard `q8_0/q8_0` had no gain (`280.49 PP / 6.27 TG` at `p512/n256` vs system `282.52 / 6.28`) and `turbo3` KV aborted on Vulkan `SET_ROWS`.
- Official Qwen3.6 35B A3B Q8 should keep `f16/f16` KV. Clean 32k b8971 rerun on `2026-04-29`: `f16/f16` was `837.35 PP / 53.23 TG`, while `q8_0/q8_0` fell to `739.18 / 52.32` for only about `0.27 GiB` peak combined GPU memory savings.
- After the `2026-04-30` kernel/system update, `/run/current-system/sw/bin/llama-bench` build `8864` sees Vulkan as `RADV STRIX_HALO` with `int dot: 1`. Quick 32k baselines improved versus the prior clean Vulkan checks: official Qwen3.6 27B Q8 `q8_0/q8_0` was `226.89 PP / 6.27 TG`; official Qwen3.6 35B A3B Q8 `f16/f16` was `910.13 / 54.45`; HauhauCS 35B A3B Q8 `f16/f16` was `789.50 / 43.50`.
- Clean `2026-04-30` novel-method sweep: current Vulkan 27B Q8 `q8_0/q8_0` at 32k was `226.55 PP / 6.27 TG`; isolated ROCm 7.2.2 build with `HSA_OVERRIDE_GFX_VERSION=11.5.1 ROCBLAS_USE_HIPBLASLT=1` was `280.94 / 6.42`. Treat ROCm as a prefill-bound option only: +24% PP, only +2.4% TG, and the user prefers ROCm only if materially faster.
- Clean `2026-04-30` official Qwen3.6 35B A3B Q8 `f16/f16` at 32k was `912.40 PP / 54.46 TG` on current Vulkan, still the strongest stable throughput class if that model is acceptable.
- For routine tests, stop only model services and restore them: `qwen-main.service` and `qwen3-tts.service`. For fully isolated clean windows, also stop `hermes-gateway.service`. Verify all three are active afterward with `systemctl --user is-active qwen-main.service qwen3-tts.service hermes-gateway.service`.

Important local paths:

| Purpose | Path |
| --- | --- |
| Current production-style llama.cpp install | `/home/crown/.local/llama-current` |
| Fresh upstream llama.cpp Vulkan build that supports Qwen3.6 speculative checkpoints | `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/result-vulkan/bin` |
| Working post-update upstream b8971 Vulkan build with speculative checkpoints | `/home/crown/tmp/llama-cpp-upstream-20260429-b8971/result-vulkan-systempkg/bin` |
| TheTom TurboQuant decode-speed branch build tested on 2026-04-30 | `/home/crown/tmp/llama-cpp-turboquant-decode-speed-parity-20260430/result-vulkan-systempkg/bin` |
| Qwen3.6 35B MTP bench workspace | `/srv/llm/bench/qwen36-mtp-bench` |
| Qwen3.6 MTP PR #22673 Vulkan binary | `/srv/llm/bench/qwen36-mtp-bench/src/llama.cpp-mtp/build-vulkan/bin` |
| AtomicChat Gemma 4 MTP Vulkan build tested on 2026-05-08 | `/home/crown/tmp/atomic-llama-cpp-turboquant-gemma4-mtp/build-vulkan/bin` |
| Fresh upstream source | `/home/crown/tmp/llama-cpp-upstream-qwen36-spec` |
| buun DFlash fork source | `/home/crown/tmp/buun-llama-cpp` |
| Qwen3.6 speculative benchmark harness | `/home/crown/machine-setup/bench-qwen36-spec.sh` |
| DFlash-specific benchmark harness | `/home/crown/machine-setup/bench-spec-qwen27b.sh` |
| Run logs | `/srv/llm/runs` |

## 2026-05-12 durable benchmark store import

Source skill: `/home/crown/.codex/skills/llama-benchmark/SKILL.md`.

Durable store:

- Root: `/home/crown/bench-results/llama/`
- Query helper: `/home/crown/.codex/skills/llama-benchmark/scripts/llama_benchmark.py`
- Database: `/home/crown/bench-results/llama/results.sqlite3`
- JSONL mirror: `/home/crown/bench-results/llama/results.jsonl`
- Ledger: `/home/crown/bench-results/llama/results.ledger.jsonl`
- Integrity at import time: `593` rows, `593` ledger rows, `ok: true`

Dashboard import notes:

- The dashboard backup was saved before import at local `backups/20260512-203401`, including the local page/history files and remote `results.sqlite3` / `results.jsonl`.
- The new store records `pg` as combined prompt+generation throughput and `tg` as standalone generation throughput. Published summaries should say `PG` or `PP+TG`, not pure prefill, when the source column is `pg`.
- `llama_bench_strict` is the claims view. `llama_bench_comparable` is broader and should be treated as exploratory.

Imported rows:

| Model / label | Context | Metric | TG | Notes |
| --- | ---: | ---: | ---: | --- |
| Qwen3.6 27B Q3_K_M | 4096 | `153.68 PG` | `13.41` | Clean roster refresh, b8864 Vulkan |
| Qwen3.6 27B UD Q4_K_XL | 4096 | `147.04 PG` | `11.35` | Clean roster refresh |
| Qwen3.6 27B Q5_K_M | 4096 / 16384 / 32768 / 131072 | `163.38 / 227.93 / 223.72 / 148.23 PG` | `10.67 / 10.67 / 10.67 / 10.66` | 131072 peak: `25.42 GiB` VRAM, `12.17 GiB` RAM, `1.61 GiB` GTT |
| Qwen3.6 27B UD Q8_K_XL | 4096 / 131072 | `101.48 / 142.01 PG` | `5.93 / 6.28` | 131072 peak: `37.73 GiB` VRAM, `13.57 GiB` RAM, `3.00 GiB` GTT |
| Carnice V2 27B Q8_0 | 4096 | `118.96 PG` | `7.26` | Peak: `28.48 GiB` VRAM |
| Qwen3.6 35B A3B Q4/Q8 | 4096 / 131072 | Q4 `730.32 PG`; Q8 `725.50 PG` at 4k and `383.31 PG` at 131072 | Q4 `57.76`; Q8 `54.48` and `53.67` | Q8 131072 peak: `39.96 GiB` VRAM |
| HauhauCS Qwen3.6 35B Q4/Q6/Q8 | 4096 | `791.85 / 722.54 / 616.99 PG` | `73.76 / 61.98 / 42.29` | Clean roster refresh |
| Qwopus MoE 35B Q8_0 | 4096 | `734.28 PG` | `54.20` | Clean roster refresh |
| Qwopus3.6 35B Q5_K_M | 131072 | `421.60 PG` | `68.02` | b8995 q8 KV |
| Qwen3.6 35B Dynamic Strix q8 KV | 4096 / 16384 / 32768 / 131072 | `799.76 / 940.68 / 839.70 / 438.90 PG` | `66.27` | b8995 q8 KV; dashboard keeps older pure-PP rows where they are the only pure-prefill source |
| Qwen3.6 35B Dynamic Strix f16 KV | 4096 / 131072 | `804.45 / 387.27 PG` | `66.87` | b8864 f16 KV |
| Mistral Small 4 119B UD Q4_K_M | 4096 / 32768 / 65536 / 131072 | `440.80 / 284.03 / 189.89 / 110.57 PG` | `41.22 / 40.70 / 41.16 / n/a` | 131072 completed prompt+generation with `gen=16`; no representative standalone 131072 TG row recorded. Peak: `63.59 GiB` VRAM, `24.09 GiB` RAM, `12.36 GiB` GTT |

## 2026-05-12 Qwen3.6 27B DFlash/PFlash Strix run

Source run directory: `/srv/llm/runs/20260512-203510-qwen36-27b-dflash-pflash-strix-full`.

Runtime:

- Script state: `bench_strix_qwen36_dflash.sh` untracked in the DFlash workspace at run time.
- Commit: `7c67e8b457bdabeaa6f80967297b1d417dba76f0`.
- Binary: `/srv/llm/bench/lucebox-hub/dflash/build-hip-gcc14x64/test_dflash`.
- Target: `/srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-Q4_K_M.gguf`.
- Draft: `/srv/llm/models/Qwen3.6-27B-DFlash-GGUF/dflash-draft-3.6-q8_0.gguf`.
- Tokenizer: `Qwen/Qwen3.6-27B`.
- Mode: `fast`, `n_gen=128`.
- Prompt set: 10 HumanEval-style coding prompts from `has_close_elements` through `rolling_max`, prompt lengths `86` to `139` tokens.
- Exit code: `0`.

Summary:

| Metric | Value |
| --- | ---: |
| Mean accepted length | `6.28` |
| Mean acceptance | `39.2%` |
| Mean decode | `30.33 t/s` |
| Decode range | `22.36 - 43.87 t/s` |
| Commit/step range | `4.57 - 9.14` |
| Peak sampled VRAM | `21.50 GiB` |
| Peak sampled GTT | `0.10 GiB` |

Per-prompt decode:

| Prompt | Steps | AL | Acceptance | Decode |
| --- | ---: | ---: | ---: | ---: |
| `has_close_elements` | `15` | `8.53` | `53.3%` | `40.80` |
| `separate_paren_groups` | `14` | `9.14` | `57.1%` | `43.87` |
| `truncate_number` | `28` | `4.57` | `28.6%` | `22.36` |
| `below_zero` | `16` | `8.00` | `50.0%` | `38.79` |
| `mean_absolute_deviation` | `21` | `6.10` | `38.1%` | `29.68` |
| `intersperse` | `26` | `4.92` | `30.8%` | `23.72` |
| `parse_nested_parens` | `21` | `6.10` | `38.1%` | `29.42` |
| `filter_by_substring` | `23` | `5.57` | `34.8%` | `27.07` |
| `sum_product` | `25` | `5.12` | `32.0%` | `24.91` |
| `rolling_max` | `27` | `4.74` | `29.6%` | `22.69` |

Interpretation:

- This is the first locally useful DFlash/PFlash result on Strix Halo: `30.33 t/s` mean decode is +151.9% vs the current Qwen3.6 27B Q4 clean-dashboard baseline (`12.04 -> 30.33 TG`).
- It also reverses the April DFlash conclusion for short coding prompts: the older DFlash Q8-on-Q4 experiment was `3.90 t/s` vs `12.2 t/s` baseline with `2.18%` acceptance, while this run reached `30.33 t/s` with `39.2%` acceptance.
- It should stay out of the clean context frontier because it is a DFlash-specific HumanEval-style server/test harness run, not a `llama-bench` `pg`/`tg` context row.

## 2026-05-06 Qwen3.6 35B MTP matrix and Strix Dynamic quant notes

Source file: `/home/crown/machine-setup/mtpbench.md`.

Goal: test Qwen3.6 35B A3B MTP on Strix Halo without changing the system llama.cpp binary, then capture prompt-processing and Strix-specific quant findings from the same workspace.

Runtime:

- Binary: `/srv/llm/bench/qwen36-mtp-bench/src/llama.cpp-mtp/build-vulkan/bin/llama-server`
- Version: `110 (267f8af)`
- Branch: ggml-org llama.cpp PR `#22673`, `mtp-clean`
- Backend: Vulkan/RADV
- Workspace: `/srv/llm/bench/qwen36-mtp-bench`
- Common server shape: `-ngl 999 -fa on --no-mmap -np 1`, `q8_0/q8_0` KV

65k Q4 workload:

- Context: `65536`
- Long prompt: `33680` prompt tokens
- Chat shape: real 3-turn multi-turn chat chain
- Existing baseline: `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf`
- MTP file: `/srv/llm/bench/qwen36-mtp-bench/models/bartowski-Qwen_Qwen3.6-35B-A3B-MTP-Q4_1.gguf`

Generation throughput:

| Condition | Turn 1 tok/s | Turn 2 tok/s | Turn 3 tok/s | Summary |
| --- | ---: | ---: | ---: | --- |
| Existing Q4, no MTP | `51.72` | `51.68` | `51.60` | Existing `UD-Q4_K_XL` baseline |
| MTP Q4_1, MTP off | `59.02` | `59.47` | `59.34` | Same MTP file, MTP disabled |
| MTP Q4_1, MTP on, draft 3 | `57.01` | `61.38` | `80.69` | About `66.8` weighted TG, +12.6% vs same-file MTP-off |

128k Q4 rerun:

- Context: `131072`
- First prompt: `96112` tokens
- No truncation reported

| Condition | Turn 1 tok/s | Turn 2 tok/s | Turn 3 tok/s | Weighted tok/s |
| --- | ---: | ---: | ---: | ---: |
| Existing Q4, no MTP | `43.49` | `43.55` | `43.47` | `43.50` |
| MTP Q4_1, MTP off | `48.95` | `48.90` | `48.77` | `48.86` |
| MTP Q4_1, MTP on, draft 3 | `55.08` | `47.14` | `58.12` | `53.42` |

Q8 MTP comparison:

- Existing Q8: `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-Q8_0.gguf`
- MTP Q8: `/srv/llm/bench/qwen36-mtp-bench/models/Qwen3.6-35BA3B-MTP.gguf`
- MTP Q8 source: `am17an/Qwen3.6-35BA3B-MTP-GGUF`
- Caveat: MTP-off control for the MTP Q8 quant was skipped, so this is base Q8 versus MTP Q8, not a pure MTP-only delta.

| Context | Condition | Turn 1 tok/s | Turn 2 tok/s | Turn 3 tok/s | Weighted tok/s |
| ---: | --- | ---: | ---: | ---: | ---: |
| 65536 | Existing Q8, no MTP | `47.13` | `47.11` | `46.93` | `47.04` |
| 65536 | Q8 MTP, draft 3 | `50.77` | `51.11` | `65.75` | `56.28` |
| 131072 | Existing Q8, no MTP | `40.21` | `40.18` | `40.12` | `40.16` |
| 131072 | Q8 MTP, draft 3 | `43.44` | `38.85` | `52.30` | `44.97` |

MTP interpretation:

- Q4 same-file MTP improved weighted decode by about `+12.6%` at 65k and `+9.3%` at 128k.
- Q8 MTP improved weighted decode by about `+19.7%` at 65k and `+12.0%` at 128k versus the existing Q8 baseline, but that comparison includes model/file differences.
- Prompt ingestion was slower with MTP enabled. Treat these as server-side, multi-turn, long-chat results, not clean `llama-bench` capacity rows.

Q4 128k batch/ubatch prompt sweep:

| Batch | Ubatch | Prompt tok/s | Elapsed |
| ---: | ---: | ---: | ---: |
| 2048 | 512 | `483.48` | `198.79s` |
| 2048 | 1024 | `526.41` | `182.58s` |
| 2048 | 2048 | `471.78` | `203.72s` |
| 4096 | 1024 | `526.03` | `182.71s` |
| 4096 | 2048 | `471.55` | `203.82s` |

Recommendation from this sweep: test `-b 2048 -ub 1024` in real server use; larger `-ub 2048` regressed.

Strix Dynamic quant:

- Source repo: `0xSero/Qwen3.6-35B-A3B-GGUF-Strix`
- Local Dynamic model: `/srv/llm/bench/qwen36-mtp-bench/models/Qwen3.6-35B-A3B-DYNAMIC.gguf`
- Fixed flags: `-ngl 999 -fa 1 -b 2048 -ub 1024 -mmp 0 -r 1`

| Prompt | KV | PP tok/s | TG tok/s | PP elapsed |
| ---: | --- | ---: | ---: | ---: |
| 16384 | `q8_0/q8_0` | `1055.10` | `66.17` | `15.53s` |
| 16384 | `f16/f16` | `1133.59` | `67.15` | `14.45s` |
| 128000 | `q8_0/q8_0` | `454.16` | `66.16` | `281.84s` |
| 128000 | `f16/f16` | `387.94` | `67.15` | `329.94s` |

Dynamic interpretation:

- At 16k, `f16/f16` is faster by about `+7.4%` PP and `+1.5%` TG.
- At true 128k prompt length, `f16/f16` regresses prefill by about `-14.6%` and takes about `48s` longer on the prefill leg.
- Keep Dynamic Strix on `q8_0/q8_0` KV for long-context use unless optimizing specifically for shorter/decode-heavy chats.

Artifacts:

- `/srv/llm/bench/qwen36-mtp-bench/results/matrix_results.json`
- `/srv/llm/bench/qwen36-mtp-bench/results/matrix_results_ctx128k.json`
- `/srv/llm/bench/qwen36-mtp-bench/results/matrix_results_q8_ctx65k.json`
- `/srv/llm/bench/qwen36-mtp-bench/results/matrix_results_q8_ctx128k.json`
- `/srv/llm/bench/qwen36-mtp-bench/results/q4_batch_ubatch_128k_prompt.jsonl`
- `/srv/llm/bench/qwen36-mtp-bench/results/dynamic_kv16_compare_16k_128k.jsonl`

## 2026-05-08 MedPsy 4B Q5_K_M imatrix benchmark and profile

Goal: download `medpsy-4b-q5_k_m-imat.gguf`, test it with the normal local Vulkan benchmark flow, compare f16 KV against q8 KV, and create a switchable profile.

Source and model:

- Hugging Face repo: `qvac/MedPsy-4B-GGUF`
- File: `medpsy-4b-q5_k_m-imat.gguf`
- Local path: `/srv/llm/models/MedPsy-4B-GGUF/medpsy-4b-q5_k_m-imat.gguf`
- Native context from GGUF metadata: `262144`
- Profile: `/home/crown/machine-setup/model-profiles/medpsy-4b-q5-k-m-imat.env`

Common settings:

- Engine: `/run/current-system/sw/bin/llama-bench`, build `8864`
- Backend/device: Vulkan, `Radeon 8060S Graphics (RADV STRIX_HALO)`
- Command shape: `-ngl 999 -fa 1 -n 128 -r 2 -o md -t 16 -sm row`

f16 KV results:

| Context | PP speed | TG speed | Peak GPU | Exit | Log |
| ---: | ---: | ---: | ---: | ---: | --- |
| 4096 | `1758.22 ± 7.11` | `67.21 ± 0.21` | `4.92 GiB` | `0` | `/srv/llm/runs/20260508-002959-medpsy-4b-q5-k-m-imat-p4096.log` |
| 16384 | `752.18 ± 1.43` | `67.07 ± 0.12` | `6.63 GiB` | `0` | `/srv/llm/runs/20260508-002959-medpsy-4b-q5-k-m-imat-p16384.log` |
| 32768 | `310.97 ± 0.32` | `67.12 ± 0.06` | `8.92 GiB` | `0` | `/srv/llm/runs/20260508-002959-medpsy-4b-q5-k-m-imat-p32768.log` |
| 128000 | aborted | not measured | `22.29 GiB` | `134` | `/srv/llm/runs/20260508-002959-medpsy-4b-q5-k-m-imat-p128000.log` |

q8_0 KV results:

| Context | PP speed | TG speed | Peak GPU | Exit | Log |
| ---: | ---: | ---: | ---: | ---: | --- |
| 4096 | `1773.47 ± 8.24` | `66.83 ± 0.06` | `4.66 GiB` | `0` | `/srv/llm/runs/20260508-004547-medpsy-4b-q5-k-m-imat-q8kv-p4096.log` |
| 16384 | `941.72 ± 0.75` | `67.31 ± 0.28` | `5.58 GiB` | `0` | `/srv/llm/runs/20260508-004547-medpsy-4b-q5-k-m-imat-q8kv-p16384.log` |
| 32768 | `581.80 ± 0.62` | `67.12 ± 0.05` | `6.80 GiB` | `0` | `/srv/llm/runs/20260508-004547-medpsy-4b-q5-k-m-imat-q8kv-p32768.log` |
| 128000 | manually stopped before row | not measured | not recorded | interrupted | `/srv/llm/runs/20260508-004547-medpsy-4b-q5-k-m-imat-q8kv-p128000.log` |

Takeaways:

- Use `q8_0/q8_0` KV for MedPsy. It improves PP materially at 16k and 32k, keeps TG around `67 t/s`, and lowers GPU memory.
- Do not promote a 128k MedPsy profile from this run. f16 128k lost the Vulkan device, and q8 128k was stopped before completion because prefill was too slow for this validation window.
- Created profile `medpsy-4b-q5-k-m-imat` capped at `32768`, q8 KV, single slot.

## 2026-05-08 Gemma q8 KV retest

User asked whether Gemma should also use q8 KV after MedPsy improved with q8. Retested E2B and E4B with q8 KV using b8672 Vulkan `llama-bench`, `-sm row`, `-t 16`.

| Model | Context | KV | PP speed | TG speed | Peak GPU | Exit | Log |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Gemma 4 E2B Q4_K_M | 16384 | `q8_0/q8_0` | `2026.97 ± 4.02` | `106.41 ± 0.35` | `6.71 GiB` | `0` | `/srv/llm/runs/20260508-010357-gemma4-e2b-it-q4-km-q8kv-b8672-clean-p16384.log` |
| Gemma 4 E2B Q4_K_M | 128000 | `q8_0/q8_0` | manually stopped | not measured | not recorded | interrupted | `/srv/llm/runs/20260508-010357-gemma4-e2b-it-q4-km-q8kv-b8672-clean-p128000.log` |
| Gemma 4 E4B Q4_K_M | 16384 | `q8_0/q8_0` | `541.17 ± 59.13` | `20.46 ± 0.09` | `15.20 GiB` | `0` | `/srv/llm/runs/20260508-011231-gemma4-e4b-it-q4-km-q8kv-b8672-clean-p16384.log` |
| Gemma 4 E4B Q4_K_M | 32768 | `q8_0/q8_0` | manually stopped | not measured | not recorded | interrupted | `/srv/llm/runs/20260508-011231-gemma4-e4b-it-q4-km-q8kv-b8672-clean-p32768.log` |

Takeaway: keep Gemma on f16 KV. E2B q8 loses PP and a little TG versus the f16 `2490.02 / 107.74` row; E4B q8 is dramatically worse than both f16 baseline and f16 MTP.

## 2026-05-08 Gemma 4 MTP assistant sweep

Goal: test Google's new Gemma 4 `gemma4_assistant` / MTP drafter heads against the local Gemma 4 Q4_K_M line, find the best decode-speed settings, keep metrics exposed during runs, and update the older E2B row with the faster clean baseline.

Sources checked:

- Official assistant models: `google/gemma-4-E2B-it-assistant`, `google/gemma-4-E4B-it-assistant`, `google/gemma-4-26B-A4B-it-assistant`, `google/gemma-4-31B-it-assistant`
- GGUF assistant heads: `AtomicChat/gemma-4-E2B-it-assistant-GGUF`, `AtomicChat/gemma-4-E4B-it-assistant-GGUF`, `AtomicChat/gemma-4-26B-A4B-it-assistant-GGUF`, `AtomicChat/gemma-4-31B-it-assistant-GGUF`
- Runtime: `AtomicBot-ai/atomic-llama-cpp-turboquant`, commit `2e81dc5f6`

Local files:

- Target E2B: `/srv/llm/models/Gemma-4-E2B-it-Q4_K_M/google_gemma-4-E2B-it-Q4_K_M.gguf`
- Target E4B: `/srv/llm/models/Gemma-4-E4B-it-Q4_K_M/google_gemma-4-E4B-it-Q4_K_M.gguf`
- Target 26B A4B: `/srv/llm/models/Gemma-4-26B-A4B-it-Q4_K_M/google_gemma-4-26B-A4B-it-Q4_K_M.gguf`
- Target 31B Dense: `/srv/llm/models/Gemma-4-31B-it-Q4_K_M/google_gemma-4-31B-it-Q4_K_M.gguf`
- Assistant heads: `/srv/llm/models/Gemma-4-*-assistant-GGUF/*Q4_K_S.gguf`

Tooling and metrics:

- Valid MTP engine: `/home/crown/tmp/atomic-llama-cpp-turboquant-gemma4-mtp/build-vulkan/bin/llama-server`
- Invalid engine excluded: `/nix/store/4zkdlkv99aacv3ir658f4spzch0biq15-llama-cpp-vulkan-0.0.0/bin/llama-server` was CPU-only despite the package name and printed `compiled without support for GPU offload`
- Harness: `/home/crown/machine-setup/gemma4-mtp-bench.py`
- Metrics page: `/home/crown/machine-setup/gemma-metrics-page.py`, human page `http://100.122.35.13:3011/metrics`, raw target proxy `http://100.122.35.13:3011/raw-metrics`
- Server flags common to all valid MTP runs: `--ctx-size 16384 --no-context-shift -sm row -ngl 999 -fa on -b 2048 -ub 1024 -t 16 -ctk f16 -ctv f16 --parallel 1 --metrics --no-webui`
- MTP settings tested: `throughput` = `--draft-block-size 2 --draft-max 6`; `lift` = `--draft-block-size 3 --draft-max 8`; `quality` = `--draft-block-size 4 --draft-max 16` on E2B only. All MTP rows used `--draft-min 0 --draft-p-min 0.75 -ngld 999`.
- Service restore status: `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` were restored and reported `active`; `http://127.0.0.1:18081/v1/models` returned `main`.

Clean E2B vanilla refresh:

| Context | Engine | PP speed | TG speed | Peak VRAM | Log |
| ---: | --- | ---: | ---: | ---: | --- |
| 16384 | b8672 `llama-bench` | `2490.02 ± 3.06` | `107.74 ± 0.19` | `6.76 GiB` | `/srv/llm/runs/20260507-233401-gemma4-e2b-it-q4-km-f16kv-b8672-p16384.log` |
| 128000 | b8672 `llama-bench` | `764.21 ± 1.50` | `108.10 ± 0.62` | `7.58 GiB` | `/srv/llm/runs/20260507-233401-gemma4-e2b-it-q4-km-f16kv-b8672-p128000.log` |

Valid MTP server sweep:

| Model | Mode | Prompt | Predict | PP t/s | TG t/s | Wall TG | Accept | Log |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| E2B | base | 527 | 256 | `1250.63` | `99.29` | `85.26` | n/a | `/srv/llm/runs/20260508-gemma4-mtp-e2b-vulkan-sweep/gemma4-e2b-base-ctx16384-p512-n256.server.log` |
| E2B | throughput | 527 | 256 | `1776.43` | `101.18` | `90.47` | `57.8%` | `/srv/llm/runs/20260508-gemma4-mtp-e2b-vulkan-sweep/gemma4-e2b-throughput-ctx16384-p512-n256.server.log` |
| E2B | lift | 527 | 256 | `1761.99` | `92.62` | `83.49` | `41.2%` | `/srv/llm/runs/20260508-gemma4-mtp-e2b-vulkan-sweep/gemma4-e2b-lift-ctx16384-p512-n256.server.log` |
| E2B | quality | 527 | 256 | `1734.27` | `88.98` | `80.40` | `34.3%` | `/srv/llm/runs/20260508-gemma4-mtp-e2b-vulkan-sweep/gemma4-e2b-quality-ctx16384-p512-n256.server.log` |
| E4B | base | 527 | 256 | `1450.34` | `55.74` | `51.63` | n/a | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-e4b-base-ctx16384-p512-n256.server.log` |
| E4B | throughput | 527 | 256 | `1035.84` | `64.56` | `57.19` | `55.5%` | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-e4b-throughput-ctx16384-p512-n256.server.log` |
| E4B | lift | 527 | 256 | `1053.21` | `67.03` | `59.22` | `46.2%` | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-e4b-lift-ctx16384-p512-n256.server.log` |
| 26B A4B | base | 527 | 256 | `731.91` | `56.04` | `48.38` | n/a | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-26b-base-ctx16384-p512-n256.server.log` |
| 26B A4B | throughput | 527 | 256 | `865.60` | `59.43` | `52.04` | `74.0%` | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-26b-throughput-ctx16384-p512-n256.server.log` |
| 26B A4B | lift | 527 | 256 | `871.07` | `55.29` | `48.87` | `56.2%` | `/srv/llm/runs/20260508-gemma4-mtp-e4b-26b-vulkan/gemma4-26b-lift-ctx16384-p512-n256.server.log` |
| 31B Dense | base | 527 | 128 | `243.08` | `10.35` | `8.80` | n/a | `/srv/llm/runs/20260508-gemma4-mtp-31b-vulkan/gemma4-31b-base-ctx16384-p512-n128.server.log` |
| 31B Dense | throughput | 527 | 128 | `214.02` | `15.89` | `12.16` | `78.9%` | `/srv/llm/runs/20260508-gemma4-mtp-31b-vulkan/gemma4-31b-throughput-ctx16384-p512-n128.server.log` |
| 31B Dense | lift | 527 | 128 | `210.76` | `18.33` | `13.49` | `70.5%` | `/srv/llm/runs/20260508-gemma4-mtp-31b-vulkan/gemma4-31b-lift-ctx16384-p512-n128.server.log` |

Takeaways:

- E2B MTP is not worth using on this host. The best Atomic MTP server result only reached `101.18 TG`, below the clean b8672 vanilla `107.74-108.10 TG`, and its server-side PP did not beat clean `llama-bench` PP.
- E4B benefits materially from MTP decode. Best setting was `lift` (`block 3 / draft-max 8`), `55.74 -> 67.03 TG` by llama.cpp timings.
- 26B A4B gets a small decode gain. Best setting was `throughput` (`block 2 / draft-max 6`), `56.04 -> 59.43 TG`; deeper `lift` accepted fewer drafts per cost and lost the gain.
- 31B Dense gets the strongest relative decode gain. Best setting was `lift`, `10.35 -> 18.33 TG`, but absolute speed is still low compared with E4B or 26B A4B.
- The MTP PP values above are server-side prompt timings for short prompts and should not replace the clean `llama-bench` PP rows for capacity/context planning.

## 2026-05-07 Current Qwopus3.6 35B A3B Q5 benchmark

Goal: benchmark the model currently served by `qwen-main.service` using the normal local `bench-llama.sh` flow and record all requested contexts, including the user's normal 128k row.

Service handling:

- Before benchmark, active `qwen-main.service` was serving `/srv/llm/models/Qwopus3.6-35B-A3B-v1-GGUF/Qwopus3.6-35B-A3B-v1-Q5_K_M.gguf` with alias `main`.
- Stopped `qwen-main.service` and `qwen3-tts.service` before benchmark windows; left `hermes-gateway.service` running.
- Restored `qwen-main.service` and `qwen3-tts.service` afterward.
- Final service check: `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` all reported `active`; `http://127.0.0.1:18081/v1/models` returned model id `main`.

Runtime and settings:

- Engine: `/run/current-system/sw/bin/llama-bench`
- Build: `8864`
- Backend/device: Vulkan, `Radeon 8060S Graphics (RADV STRIX_HALO)`, `int dot: 1`, `matrix cores: KHR_coopmat`
- Model: `/srv/llm/models/Qwopus3.6-35B-A3B-v1-GGUF/Qwopus3.6-35B-A3B-v1-Q5_K_M.gguf`
- Model metadata from `llama-bench`: `qwen35moe 35B.A3B Q5_K - Medium`, `23.02 GiB`, `34.66 B`
- Wrapper: `/home/crown/machine-setup/bench-llama.sh`
- Command shape: `-ngl 999 -fa 1 -n 128 -r 2 -o md -t 16 -ctk q8_0 -ctv q8_0 -sm row`
- Main manifest: `/srv/llm/runs/20260507-203139-qwopus36-35b-a3b-v1-q5-km-current-q8kv-bench.txt`
- 128k manifest: `/srv/llm/runs/20260507-205607-qwopus36-35b-a3b-v1-q5-km-current-q8kv-128k-bench.txt`

Results:

| Context | PP t/s | TG t/s | Peak system RAM | Peak VRAM | Peak GTT | Peak combined GPU | Exit | Log |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 4096 | `996.23 ± 0.71` | `68.14 ± 0.04` | `13.36 GiB` | `23.98 GiB` | `0.77 GiB` | `24.76 GiB` | `0` | `/srv/llm/runs/20260507-203139-qwopus36-35b-a3b-v1-q5-km-current-q8kv-p4096.log` |
| 16384 | `886.21 ± 0.74` | `67.98 ± 0.07` | `13.39 GiB` | `24.18 GiB` | `0.80 GiB` | `24.98 GiB` | `0` | `/srv/llm/runs/20260507-203139-qwopus36-35b-a3b-v1-q5-km-current-q8kv-p16384.log` |
| 32768 | `755.50 ± 1.52` | `68.08 ± 0.03` | `13.41 GiB` | `24.35 GiB` | `0.83 GiB` | `25.17 GiB` | `0` | `/srv/llm/runs/20260507-203139-qwopus36-35b-a3b-v1-q5-km-current-q8kv-p32768.log` |
| 100000 | `464.25 ± 0.47` | `57.45 ± 10.22` | `15.49 GiB` | `51.83 GiB` | `2.18 GiB` | `54.01 GiB` | `0` | `/srv/llm/runs/20260507-203139-qwopus36-35b-a3b-v1-q5-km-current-q8kv-p100000.log` |
| 128000 | `400.94 ± 0.17` | `68.20 ± 0.13` | `13.81 GiB` | `25.50 GiB` | `1.02 GiB` | `26.52 GiB` | `0` | `/srv/llm/runs/20260507-205607-qwopus36-35b-a3b-v1-q5-km-current-q8kv-128k-p128000.log` |

Validity:

- Valid `llama-bench` run: all five contexts exited `0`.
- No concurrent live serving model during benchmark windows.
- 100k TG variance was high; prefer the 128k row for long-context decode comparison.

Important model paths:

| Role | Model | Path | Notes |
| --- | --- | --- | --- |
| Target | Qwen3.6 27B Q8 | `/srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-UD-Q8_K_XL.gguf` | Main accuracy target; `qwen35` tokenizer, `248320` vocab |
| Target | Qwen3.6 27B Q4 | `/srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-UD-Q4_K_XL.gguf` | Faster baseline; lower quality than Q8 |
| Draft | Official Qwen3 1.7B Q8 | `/srv/llm/models/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q8_0.gguf` | Official Qwen HF repo; `qwen2` tokenizer, `151936` vocab, incompatible vocab translated by llama.cpp |
| DFlash draft | Qwen3.6 DFlash Q8 | `/srv/llm/models/Qwen3.6-27B-DFlash-GGUF/dflash-draft-3.6-q8_0.gguf` | Tested and not useful on local AMD/Vulkan setup |
| DFlash draft | Qwen3.6 DFlash Q4 | `/srv/llm/models/Qwen3.6-27B-DFlash/Qwen3.6-27B-DFlash-Q4_K_M.gguf` | Old local DFlash draft; poor acceptance |
| DFlash draft | Qwen3.6 DFlash F16 | `/srv/llm/models/Qwen3.6-27B-DFlash/Qwen3.6-27B-DFlash-F16.gguf` | Old local DFlash draft; poor acceptance |

Source repos / model pages checked:

- `https://huggingface.co/Qwen/Qwen3-1.7B-GGUF`
- `https://huggingface.co/spiritbuun/Qwen3.6-27B-DFlash-GGUF`
- `https://provide.ai/qwen-3-6-27b-llamacpp-speculative-decoding-appreciation-post/`
- `https://github.com/ggml-org/llama.cpp.git`
- `https://github.com/spiritbuun/buun-llama-cpp.git`

## 2026-04-30 Novel method sweep after kernel/system update

Goal: look up and test current Strix Halo / gfx1151 performance leads without changing production model infrastructure. The sweep focused on upstream Vulkan checkpointed speculative decoding, ROCm as an isolated engine comparison, and newer TheTom TurboQuant branches. Production services were stopped before testing and restored afterward.

Service handling:

- Stopped `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` before benchmark runs.
- Verified no active `llama-server`, `llama-bench`, or `llm-guard` processes before starting tests.
- Restored `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` afterward; all three returned `active`, and `http://127.0.0.1:18081/v1/models` returned `main`.
- Run directory: `/srv/llm/runs/20260430-novel-gains-sweep`.

Runtimes:

| Runtime | Path | Notes |
| --- | --- | --- |
| Current system Vulkan | `/run/current-system/sw/bin` | build `8864`, RADV STRIX_HALO, int dot enabled |
| Upstream b8971 Vulkan, rebuilt with system package | `/home/crown/tmp/llama-cpp-upstream-20260429-b8971/result-vulkan-systempkg/bin` | build `8971`, working RADV device detection and checkpointed speculative server |
| ROCm 7.2.2 isolated build | `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/build-rocm-7d/bin` | commit `f65bc34`, `HSA_OVERRIDE_GFX_VERSION=11.5.1`, optional `ROCBLAS_USE_HIPBLASLT=1` |
| TheTom TurboQuant decode-speed branch | `/home/crown/tmp/llama-cpp-turboquant-decode-speed-parity-20260430/result-vulkan-systempkg/bin` | commit `9b135133`, branch `experiment/decode-speed-parity` |

Clean 32k engine/model controls:

| Target | Runtime / mode | Context | KV | PP t/s | TG t/s | Peak combined GPU | Log |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Qwen3.6 27B Q8 | current Vulkan | 32768 | `q8_0/q8_0` | `226.55` | `6.27` | `35.22 GiB` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-134940-novel-vulkan-27b-q8-q8kv-32k-p32768.log` |
| Qwen3.6 27B Q8 | ROCm + hipBLASLt | 32768 | `q8_0/q8_0` | `280.94` | `6.42` | `34.77 GiB` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-135503-novel-rocm-27b-q8-q8kv-32k-p32768.log` |
| Qwen3.6 27B Q8 | upstream b8971 Vulkan | 32768 | `q8_0/q8_0` | `225.74` | `6.25` | `35.22 GiB` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-140928-novel-b8971-vulkan-27b-q8-q8kv-32k-p32768.log` |
| Qwen3.6 35B A3B Q8 | current Vulkan | 32768 | `f16/f16` | `912.40` | `54.46` | `36.24 GiB` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-143250-novel-system-35b-a3b-q8-f16kv-32k-p32768.log` |

Server speculative results on upstream b8971:

| Target | Mode | Context max | Active prompt tokens | KV | Prompt t/s | Decode t/s | Draft accepted | Validity | Response |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |
| Qwen3.6 27B Q8 | baseline | 4096 | `29` | `q8_0/q8_0` | `69.93` | `6.27` | n/a | valid | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-141903-b8971-baseline-q8kv-general-response.json` |
| Qwen3.6 27B Q8 + Qwen3 1.7B Q8 draft | draft model, `--spec-draft-n-max 32 --spec-draft-n-min 1 --spec-draft-p-min 0.75` | 4096 | `29` | `q8_0/q8_0` | `69.97` | `17.83` | `227/386` | valid, coherent output | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-141950-b8971-draft-q8kv-general-response.json` |
| Qwen3.6 27B Q8 | baseline | 32768 | `24035` | `q8_0/q8_0` | `162.31` | `6.13` | n/a | valid | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-142120-b8971-baseline-q8kv-500ledger-32k-response.json` |
| Qwen3.6 27B Q8 + Qwen3 1.7B Q8 draft | draft model, same flags | 32768 | `24035` | `q8_0/q8_0` | `162.70` | `3.55` | `78/124` | valid but slower | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-142414-b8971-draft-q8kv-500ledger-32k-response.json` |
| Qwen3.6 27B Q8 | `ngram-mod`, code-refactor prompt | 4096 | `319` | `f16/f16` | `181.51` | `6.22` | `3/74` | not useful | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-141749-b8971-ngram-mod-f16-prompt-v2-response.json` |

TurboQuant branch gate:

| Target | Runtime | Context | KV | PP t/s | TG t/s | Result | Log |
| --- | --- | ---: | --- | ---: | ---: | --- | --- |
| Qwen3.6 27B Q8 | current Vulkan | 512 | `q8_0/q8_0` | `282.52` | `6.28` | control | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-143049-novel-system-27b-q8-q8kv-p512n256-p512.log` |
| Qwen3.6 27B Q8 | TQ decode-speed branch | 512 | `q8_0/q8_0` | `280.49` | `6.27` | no gain | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-143136-novel-tqdecode-27b-q8-q8kv-p512n256-p512.log` |
| Qwen3.6 27B Q8 | TQ decode-speed branch | 512 | `turbo3/turbo3` | n/a | n/a | abort: Vulkan `SET_ROWS` unsupported for `cache_k_l3` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-143224-novel-tqdecode-27b-q8-turbo3kv-p512n256-p512.log` |
| Qwen3.6 27B Q8 | TQ decode-speed branch | 512 | `q8_0/turbo3` | n/a | n/a | abort: Vulkan `SET_ROWS` unsupported for `cache_v_l3` | `/srv/llm/runs/20260430-novel-gains-sweep/20260430-143230-novel-tqdecode-27b-q8-q8k-turbo3v-p512n256-p512.log` |

Conclusions:

- Real Qwen3.6 27B Q8 gain found: upstream b8971 checkpointed draft-model speculative decoding is about `2.85x` decode speed at low active context with q8 KV (`6.27 -> 17.83 t/s`).
- Do not enable that draft path for long active context. At `24035` active tokens, it is slower (`6.13 -> 3.55 t/s`) even with accepted draft tokens, because checkpoint/draft overhead dominates.
- ROCm is a real 27B Q8 prefill gain at 32k (`226.55 -> 280.94 PP t/s`) but not a meaningful decode gain (`6.27 -> 6.42 TG t/s`). Given ROCm stability concerns, it is not a broad replacement for Vulkan.
- The newer TheTom TurboQuant decode-speed branch is not usable as a Strix Halo Vulkan throughput path in this state. Standard q8 KV has no gain and turbo3 KV aborts before a bench row.
- Official Qwen3.6 35B A3B Q8 on current Vulkan remains the strongest stable throughput class if a MoE A3B model is acceptable (`912.40 PP / 54.46 TG` at 32k).

## 2026-04-29 Official Qwen3.6 Vulkan/TurboQuant KV clean rerun

Goal: investigate current AMD/Strix Halo llama.cpp Vulkan leads and KV-cache compression on clean official Qwen3.6 Q8 baselines, with model/gateway services unloaded during measurements.

Service handling:

- Stopped `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` for this clean window.
- Restored all three services afterward and verified `/v1/models` on the main passthrough endpoint.
- Run directory: `/srv/llm/runs/20260429-amd-vulkan-upstream-kv`.

Runtime builds:

| Runtime | Path | Notes |
| --- | --- | --- |
| Current production-style Vulkan | `/home/crown/.local/llama-current/bin` | current service-style install |
| Upstream b8971 Vulkan | `/home/crown/tmp/llama-cpp-upstream-20260429-b8971/result-vulkan/bin` | commit `683c5acb`, built from `ggml-org/llama.cpp` origin/master on 2026-04-29 |
| TheTom TurboQuant Vulkan fork | `/home/crown/tmp/llama-cpp-turboquant-kv-20260429/result-vulkan/bin` | branch `feature/turboquant-kv-cache`, commit `11a241d0`; local Nix duplicate `spirv-headers` arg removed for build only |

Official Qwen3.6 27B Q8 32k results, `-ngl 999 -fa 1 -p 32768 -n 128 -r 1`:

| Runtime | KV | PP | TG | Peak GPU | Log |
| --- | --- | ---: | ---: | ---: | --- |
| current | `f16/f16` | `194.29` | `6.15` | `36.25 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-114906-20260429-current-qwen36-27b-q8-f16kv-p32768.log` |
| current | `q8_0/q8_0` | `223.82` | `6.11` | `35.30 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-115529-20260429-current-qwen36-27b-q8-q8kv-p32768.log` |
| upstream b8971 | `f16/f16` | `194.97` | `6.13` | `36.24 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-120053-20260429-upstream-b8971-qwen36-27b-q8-f16kv-p32768.log` |
| upstream b8971 | `q8_0/q8_0` | `223.54` | `6.12` | `35.31 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-120700-20260429-upstream-b8971-qwen36-27b-q8-q8kv-p32768.log` |
| upstream b8971 | `q4_0/q4_0` | `223.37` | `6.11` | `34.81 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-121605-20260429-upstream-b8971-qwen36-27b-q8-q4kv-p32768.log` |
| TheTom TQ fork | `turbo3/turbo3` | `201.48` | `6.12` | `34.65 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-122504-20260429-tqfork-qwen36-27b-q8-turbo3kv-p32768.log` |

TheTom fork short probes, official Qwen3.6 27B Q8, `-p 512 -n 256`:

| KV | PP | TG | Peak GPU | Log |
| --- | ---: | ---: | ---: | --- |
| `turbo3/turbo3` | `280.35` | `6.12` | `34.20 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-122302-20260429-tqfork-qwen36-27b-q8-turbo3kv-p512-p512.log` |
| `q8_0/turbo3` | `163.70` | `5.90` | `34.20 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-122359-20260429-tqfork-qwen36-27b-q8-q8k-turbo3v-p512-p512.log` |

Official Qwen3.6 35B A3B Q8 32k results, upstream b8971, `-ngl 999 -fa 1 -p 32768 -n 128 -r 1`:

| KV | PP | TG | Peak GPU | Log |
| --- | ---: | ---: | ---: | --- |
| `f16/f16` | `837.35` | `53.23` | `36.32 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-121234-20260429-upstream-b8971-qwen36-35b-a3b-q8-f16kv-p32768.log` |
| `q8_0/q8_0` | `739.18` | `52.32` | `36.05 GiB` | `/srv/llm/runs/20260429-amd-vulkan-upstream-kv/20260429-121420-20260429-upstream-b8971-qwen36-35b-a3b-q8-q8kv-p32768.log` |

Conclusions:

- No upstream b8971 speed gain over current for the official 27B Q8 dense model; results are within run noise.
- Official 27B Q8: `q8_0/q8_0` remains the stable recommendation. `q4_0/q4_0` saves about `0.5 GiB` more at 32k but is not faster and carries more KV quality risk.
- Official 35B A3B Q8: `f16/f16` is clearly faster and already matches the profile default.
- TheTom TurboQuant Vulkan fork works on this box and a one-shot sanity prompt returned `2 + 2 is 4`, but at 32k it is slower than upstream q8/q4 KV and saves only about `0.16 GiB` versus q4 KV on this model/shape. Treat it as experimental memory-capacity work, not a throughput win.

## 2026-04-29 TheTom TurboQuant attn-rotation asymmetric KV check

Goal: check only the asymmetric KV lead after treating the prior symmetric `turbo3/turbo3` 32k result as a negative throughput result. Specifically test `q8_0/turbo4` and `q8_0/turbo3` on official Qwen3.6 27B Q8 and official Qwen3.6 35B A3B Q8, using a recent TheTom TurboQuant build with the Apr 29 attention-rotation default fix applied.

Runtime:

- Source: `/home/crown/tmp/llama-cpp-turboquant-attnrot-20260429`
- Binary: `/home/crown/tmp/llama-cpp-turboquant-attnrot-20260429/result-vulkan/bin/llama-bench`
- Base branch: TheTom `feature/turboquant-kv-cache` at `11a241d0`
- Local applied fix: TheTom `fix/enable-attn-rot-by-default` commit `6c55e849`, plus local Nix duplicate `spirv-headers` argument removal for build only.
- Run directory: `/srv/llm/runs/20260429-tq-attnrot-asym`

32k sanity results:

| Model | KV | Result | Peak GPU | Log |
| --- | --- | --- | ---: | --- |
| Qwen3.6 27B Q8 | `q8_0/turbo4` | abort, Vulkan `SET_ROWS` unsupported for `cache_v_l3` | `34.47 GiB` | `/srv/llm/runs/20260429-tq-attnrot-asym/20260429-141809-20260429-tqattnrot-qwen36-27b-q8-q8k-turbo4v-32k-p32768.log` |
| Qwen3.6 27B Q8 | `q8_0/turbo3` | terminated after no benchmark row before cutoff | `35.00 GiB` | `/srv/llm/runs/20260429-tq-attnrot-asym/20260429-141832-20260429-tqattnrot-qwen36-27b-q8-q8k-turbo3v-32k-p32768.log` |
| Qwen3.6 35B A3B Q8 | `q8_0/turbo4` | abort, Vulkan `SET_ROWS` unsupported for `cache_v_l3` | `35.30 GiB` | `/srv/llm/runs/20260429-tq-attnrot-asym/20260429-143935-20260429-tqattnrot-qwen36-35b-a3b-q8-q8k-turbo4v-32k-p32768.log` |
| Qwen3.6 35B A3B Q8 | `q8_0/turbo3` | terminated after no benchmark row before cutoff | `35.91 GiB` | `/srv/llm/runs/20260429-tq-attnrot-asym/20260429-144000-20260429-tqattnrot-qwen36-35b-a3b-q8-q8k-turbo3v-32k-p32768.log` |

Comparison baselines from the clean run immediately before this check:

| Model | Stable KV | 32k PP | TG | Peak GPU |
| --- | --- | ---: | ---: | ---: |
| Qwen3.6 27B Q8 | `q8_0/q8_0` | `223.54-223.82` | `6.11-6.12` | `35.30-35.31 GiB` |
| Qwen3.6 35B A3B Q8 | `f16/f16` | `837.35` | `53.23` | `36.32 GiB` |

Conclusion:

- Asymmetric TurboQuant KV was not promoted to deeper context because both requested configs failed the 32k sanity gate for non-memory reasons.
- `q8_0/turbo4` is currently a hard Vulkan backend failure.
- `q8_0/turbo3` is not a practical throughput path with the attention-rotation default fix on this Strix Halo Vulkan setup.
- Classification: not a throughput feature here; not currently usable enough to recommend as a memory-capacity feature for these Qwen3.6 profiles.

## 2026-04-30 Kernel/system update quick baseline

Goal: after kernel/system update, run a few clean 32k baselines to see whether Vulkan throughput materially changed.

Environment:

- Kernel: `Linux ciru 7.0.1 #1-NixOS SMP PREEMPT_DYNAMIC Wed Apr 22 11:32:23 UTC 2026 x86_64 GNU/Linux`
- Active benchmark binary: `/run/current-system/sw/bin/llama-bench`, build `8864`
- Vulkan device line: `Radeon 8060S Graphics (RADV STRIX_HALO)`, UMA, `int dot: 1`, `matrix cores: KHR_coopmat`
- Note: `/home/crown/.local/llama-current/llama-bench` reported no Vulkan devices after the update. The restored service uses `/run/current-system/sw/bin/llama-server`, so these baselines use the active system binary.
- Run directory: `/srv/llm/runs/20260430-kernel-baseline`
- Services stopped for benchmark window and restored afterward: `qwen-main.service`, `qwen3-tts.service`, `hermes-gateway.service`.

Results, all `-ngl 999 -fa 1 -p 32768 -n 128 -r 1`:

| Model | KV | PP | TG | Peak GPU | Prior comparable | Log |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Official Qwen3.6 27B Q8 | `q8_0/q8_0` | `226.89` | `6.27` | `35.23 GiB` | `223.54-223.82 / 6.11-6.12` | `/srv/llm/runs/20260430-kernel-baseline/20260430-124844-20260430-system8864-qwen36-27b-q8-q8kv-32k-p32768.log` |
| Official Qwen3.6 35B A3B Q8 | `f16/f16` | `910.13` | `54.45` | `36.24 GiB` | `837.35 / 53.23` | `/srv/llm/runs/20260430-kernel-baseline/20260430-125414-20260430-system8864-qwen36-35b-a3b-q8-f16kv-32k-p32768.log` |
| HauhauCS Qwen3.6 35B A3B Q8_K_P | `f16/f16` | `789.50` | `43.50` | `42.48 GiB` | `739.10 / 41.21` | `/srv/llm/runs/20260430-kernel-baseline/20260430-125552-20260430-system8864-hauhaucs35b-q8-f16kv-32k-p32768.log` |

Conclusion:

- Material positive change for 35B/MoE prefill: official 35B A3B Q8 prefill improved about `8.7%`, HauhauCS Q8 prefill about `6.8%`.
- 27B dense Q8 moved only slightly: about `1.4-1.5%` prefill and about `2.5%` decode.
- This should be treated as a kernel/system/runtime change, not isolated to the kernel alone, because the active service binary also changed to the system `llama.cpp` build `8864` and RADV now identifies the device as `STRIX_HALO`.

## 2026-04-29 HauhauCS Qwen3.6 35B A3B Aggressive KV sweep

Goal: find faster serving defaults for HauhauCS `Q4_K_M`, `Q6_K_P`, and `Q8_K_P`, especially materially faster Q8 prefill/decode without breaking the existing stack.

Service handling:

- Stopped `qwen-main.service` and `qwen3-tts.service` before the sweep.
- Left unrelated services alone.
- Run directory: `/srv/llm/runs/20260429-hauhaucs-35b-sweep`.
- Baseline engine: `/home/crown/.local/llama-current/llama-bench`.
- Settings unless noted: Vulkan, `-ngl 999 -fa 1 -t 16 -sm row -n 128 -r 1 -o md`.

Key 16k screening result: `f16/f16` KV was fastest for all three HauhauCS quants. `q8_0/q8_0` and `q4_0/q4_0` saved only a small amount of memory and consistently lost throughput.

Confirmed 32k comparisons:

| Model | KV | PP | TG | Peak GPU | Log |
| --- | --- | ---: | ---: | ---: | --- |
| Q4_K_M | `f16/f16` | `802.67` | `71.83` | `21.78 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-050237-hauhaucs35b-q4-f16-32k-p32768.log` |
| Q4_K_M | `q8_0/q8_0` | `709.42` | `72.73` | `21.51 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-053400-hauhaucs35b-q4-confirm-q8kv-32k-p32768.log` |
| Q6_K_P | `f16/f16` | `764.56` | `60.94` | `30.49 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-050410-hauhaucs35b-q6-f16-32k-p32768.log` |
| Q6_K_P | `q8_0/q8_0` | `678.37` | `59.87` | `30.22 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-053543-hauhaucs35b-q6-confirm-q8kv-32k-p32768.log` |
| Q8_K_P | `f16/f16` | `739.10` | `41.21` | `42.56 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-050749-hauhaucs35b-q8-f16-32k-p32768.log` |
| Q8_K_P | `q8_0/q8_0` | `665.13` | `40.80` | `42.28 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-050549-hauhaucs35b-q8-current-profile-q8kv-32k-p32768.log` |

Q8 128k decisive comparison:

| Model | KV | PP | TG | Peak GPU | Log |
| --- | --- | ---: | ---: | ---: | --- |
| Q8_K_P | `q8_0/q8_0` | `364.01` | `40.81` | `43.59 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-051123-hauhaucs35b-q8-128k-q8_0-q8_0-p128000.log` |
| Q8_K_P | `f16/f16` | `420.95` | `41.25` | `44.75 GiB` | `/srv/llm/runs/20260429-hauhaucs-35b-sweep/20260429-052313-hauhaucs35b-q8-128k-f16-f16-p128000.log` |

ROCm check:

- ROCm Q8 `f16/f16` at 32k: `734.30` PP / `41.29` TG.
- Vulkan Q8 `f16/f16` at 32k: `739.10` PP / `41.21` TG.
- ROCm was not materially faster and is less stable on this box, so it is not a recommended default for this model family.

Profile changes made after the sweep:

- `machine-setup/model-profiles/qwen3.6-35b-a3b-uncensored-hauhaucs-aggressive-q4-k-m.env`
- `machine-setup/model-profiles/qwen3.6-35b-a3b-uncensored-hauhaucs-aggressive-q6-k-p.env`
- `machine-setup/model-profiles/qwen3.6-35b-a3b-uncensored-hauhaucs-aggressive-q8-k-p.env`

All three were changed from `CACHE_TYPE_K=q8_0` / `CACHE_TYPE_V=q8_0` to `CACHE_TYPE_K=f16` / `CACHE_TYPE_V=f16`.

## 2026-04-24 Qwen3.6 27B ROCm backend investigation

### 2026-04-24 Qwen3.6 35B A3B Q8_0 128k ROCm check

Goal: test whether the ROCm backend that helped Qwen3.6 27B prefill also helps the active Qwen3.6 35B A3B `Q8_0` model at 128k context.

Service handling:

- Stopped `qwen-main.service` and `qwen3-tts.service`.
- Left `hermes-gateway.service` active.
- Restored `qwen-main.service` and `qwen3-tts.service` after the requested Q8 tests.

Command shape:

```bash
llm-guard --reserve-sys-gib 8 --gpu-limit-gib 95 --poll-ms 250 \
  <llama-bench> \
  -m /srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-Q8_0.gguf \
  -ngl 999 -fa 1 -p 128000 -n 128 -r 1 -o md
```

ROCm runtime env:

```bash
HSA_OVERRIDE_GFX_VERSION=11.5.1 ROCBLAS_USE_HIPBLASLT=1
```

Results:

| Model | Backend | Context | PP | TG | Notes | Log |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Qwen3.6 35B A3B Q8_0 | Vulkan | 128000 | `454.13 t/s` | `53.05 t/s` | valid baseline | `/srv/llm/runs/20260424-175106-qwen36-35b-q8-vulkan-rocm-128k-vulkan-q8-p128000.log` |
| Qwen3.6 35B A3B Q8_0 | ROCm + hipBLASLt | 128000 | `445.18 t/s` | `46.25 t/s` | valid but slower than Vulkan | `/srv/llm/runs/20260424-175106-qwen36-35b-q8-vulkan-rocm-128k-rocm-q8-hipblaslt-p128000.log` |

Conclusion:

- For Qwen3.6 35B A3B `Q8_0` at 128k, Vulkan is better than ROCm on both prompt processing and generation.
- ROCm was about `2%` slower on PP and about `12.8%` slower on TG.
- Keep the active Vulkan main-model path for this 35B Q8 model.
- An extra Q4 128k Vulkan run was started after the requested Q8 pair, but it was interrupted and has no result table. Do not treat `/srv/llm/runs/20260424-175106-qwen36-35b-q8-vulkan-rocm-128k-vulkan-q4-p128000.log` as a valid benchmark.

Goal: research and test a clean ROCm-backed Qwen3.6 27B engine on the local Strix Halo host without changing the current production serving path.

Local ROCm capability:

- Host GPU: AMD Strix Halo / Radeon 8060S, exposed to ROCm as `gfx1151`.
- `/dev/kfd` and `/dev/dri/renderD128` are present.
- `rocminfo` from Nix ROCm 7.2.2 sees the GPU agent as `gfx1151`, 40 CUs, wavefront size 32, and fast f16 support.

Build notes:

- Upstream source: `/home/crown/tmp/llama-cpp-upstream-qwen36-spec`
- Commit: `f65bc34`
- Upstream flake `.#rocm` failed because it pinned ROCm 6.0.2 while current `ggml-hip` requires HIP/ROCm 6.1+.
- Successful build path: manual CMake build in `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/build-rocm-7d`
- Build shape: Nix ROCm 7.2.2 packages, GCC host compiler, ROCm clang HIP compiler, `AMDGPU_TARGETS=gfx1151`, `GGML_HIP=ON`, `GGML_HIP_GRAPHS=ON`, `GGML_HIP_MMQ_MFMA=ON`.
- First manual attempt with ROCm clang as the host C++ compiler failed on a glibc header conflict around `posix_memalign`; using GCC for host C/C++ and ROCm clang only for HIP fixed it.
- Device enumeration from the final binary: `Radeon 8060S Graphics, gfx1151 (0x1151), VMM: no, Wave Size: 32, VRAM: 65536 MiB`.

Runtime setup:

```bash
export HSA_OVERRIDE_GFX_VERSION=11.5.1
export ROCBLAS_USE_HIPBLASLT=1
```

New local flow:

- Direct isolated server: `/home/crown/machine-setup/serve-qwen36-rocm.sh`
- Optional main-model profile: `/home/crown/machine-setup/model-profiles/qwen3.6-27b-ud-q8-k-xl-rocm.env`

Clean benchmark procedure:

- Stopped `qwen-main.service` and `qwen3-tts.service`.
- Left `hermes-gateway.service` active.
- Used `llm-guard --reserve-sys-gib 8 --gpu-limit-gib 95 --poll-ms 250`.
- Ran current-source Vulkan baseline and ROCm comparison at `-p 32768 -n 128 -r 1 -ngl 999 -fa 1`.

Results:

| Model | Backend | Context | PP | TG | Notes | Log |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Qwen3.6 27B Q8 | Vulkan | 32768 | `194.46 t/s` | `6.13 t/s` | current-source baseline, matches previous installed result | `/srv/llm/runs/20260424-141651-qwen36-27b-vulkan-rocm-32k-vulkan-q8-p32768.log` |
| Qwen3.6 27B Q8 | ROCm | 32768 | `283.30 t/s` | `6.44 t/s` | valid ROCm baseline | `/srv/llm/runs/20260424-141651-qwen36-27b-vulkan-rocm-32k-rocm-q8-p32768.log` |
| Qwen3.6 27B Q8 | ROCm + hipBLASLt | 32768 | `284.68 t/s` | `6.44 t/s` | best Q8 ROCm setting tested | `/srv/llm/runs/20260424-141651-qwen36-27b-vulkan-rocm-32k-rocm-q8-hipblaslt-p32768.log` |
| Qwen3.6 27B Q4 | Vulkan | 32768 | `211.40 t/s` | `12.02 t/s` | current-source baseline | `/srv/llm/runs/20260424-141651-qwen36-27b-vulkan-rocm-32k-vulkan-q4-p32768.log` |
| Qwen3.6 27B Q4 | ROCm | 32768 | `282.25 t/s` | `11.63 t/s` | PP faster, TG slower than Vulkan | `/srv/llm/runs/20260424-141651-qwen36-27b-vulkan-rocm-32k-rocm-q4-p32768.log` |

Conclusion:

- ROCm is viable on this host for upstream llama.cpp Qwen3.6 27B.
- ROCm materially improves Q8 prompt/prefill throughput: `194.46 -> 284.68 t/s`, about `46%`.
- ROCm barely improves Q8 decode: `6.13 -> 6.44 t/s`, about `5%`.
- ROCm improves Q4 prompt throughput but is slower on Q4 decode, so it should not replace Vulkan for fastest Q4 generation.
- Recommended ROCm use case: Qwen3.6 27B Q8 accuracy target for prefill-heavy workflows. Keep Vulkan as the default production path unless a workload is known to be prefill-bound.

## 2026-04-24 Qwen3.6 27B speculative decoding investigation

Goal: test whether Qwen3-1.7B can accelerate Qwen3.6 27B on the local AMD/Vulkan UMA host, and evaluate DFlash / ngram-style reports without disturbing existing services.

Service handling:

- Stopped only `qwen-main.service` and `qwen3-tts.service` during model tests.
- Left `hermes-gateway.service` active.
- Final verified state after testing: `qwen-main.service`, `qwen3-tts.service`, and `hermes-gateway.service` all `active`.

### Recommended validated short-context command shape

Use fresh upstream server, not `/home/crown/.local/llama-current`, for Qwen3.6 speculative decoding:

```bash
llm-guard --reserve-sys-gib 8 --gpu-limit-gib 95 --poll-ms 250 \
  /home/crown/tmp/llama-cpp-upstream-qwen36-spec/result-vulkan/bin/llama-server \
  -m /srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-UD-Q8_K_XL.gguf \
  -md /srv/llm/models/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q8_0.gguf \
  -ngl 999 -ngld 999 \
  -c 4096 --kv-unified -fa on -b 256 -ub 64 \
  --draft 32 --draft-min 1 --draft-p-min 0.75 \
  --parallel 1 --no-webui \
  --temp 0.0 --top-k 1 --top-p 1.0 --min-p 0.0 --seed 1 --perf
```

For a `32768` max context server, same settings worked with `-c 32768 -b 512 -ub 128`, but only low occupied context benefited from draft speculation.

### Valid server-mode Qwen3-1.7B draft results

These results used fresh upstream llama.cpp built from `ggml-org/llama.cpp` at `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/result-vulkan/bin`. The important loader line was `speculative decoding will use checkpoints`, followed by `speculative decoding context initialized`.

| Target | Context max | Active prompt tokens | Draft settings | Prompt speed | Decode speed | Draft accepted | Validity | Notes |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |
| Qwen3.6 27B Q8 | 4096 | 29 | `--draft 8 --draft-min 1 --draft-p-min 0.75` | `56.73 t/s` | `11.01 t/s` | `100/100` | valid | coherent output, clean server timings |
| Qwen3.6 27B Q8 | 4096 | 29 | `--draft 16 --draft-min 1 --draft-p-min 0.75` | `67.40 t/s` | `11.22 t/s` | `104/104` | valid | slight improvement over draft 8 |
| Qwen3.6 27B Q8 | 4096 | 29 | `--draft 32 --draft-min 1 --draft-p-min 0.75` | `68.44 t/s` | `14.04 t/s` | `111/111` | valid | best short-context setting in this sweep |
| Qwen3.6 27B Q8 | 4096 | 29 | `--draft 48 --draft-min 1 --draft-p-min 0.75` | `68.72 t/s` | `13.47 t/s` | `111/111` | valid | slower than draft 32 |
| Qwen3.6 27B Q8 | 32768 | 29 | `--draft 32 --draft-min 1 --draft-p-min 0.75` | `63.38 t/s` | `14.25 t/s` | `111/111` | valid | large max context does not hurt if active prompt is short |
| Qwen3.6 27B Q8 | 32768 | 29800 | `--draft 32 --draft-min 1 --draft-p-min 0.75` | `208.52 t/s` | `3.46 t/s` | `88/88` | valid but not useful | near-30k active context makes speculative slower than baseline |

### Matching baseline results

| Target | Engine / mode | Context max | Active prompt tokens | Prompt speed | Decode speed | Validity | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Qwen3.6 27B Q8 | `llama-bench`, installed `llama-current` | 32768 | synthetic bench prompt | `194.47 t/s` | `6.13 t/s` | valid | clean benchmark from `2026-04-23`; see older section below |
| Qwen3.6 27B Q8 | fresh upstream `llama-server`, no draft | 32768 | 29800 | `208.96 t/s` | `5.83 t/s` | valid | apples-to-apples long active context baseline for speculative comparison |
| Qwen3.6 27B Q4 | `llama-bench`, installed `llama-current` | 32768 | synthetic bench prompt | `211.65 t/s` | `12.04 t/s` | valid | clean benchmark from `2026-04-23`; faster than Q8, lower quality |

Interpretation:

- Short/low-occupied context: Qwen3-1.7B Q8 draft can give about `2.3x` Q8 decode speedup (`6.13 t/s` class baseline to `14.04-14.25 t/s`) when using fresh upstream server checkpointing.
- Near-30k active context: Qwen3-1.7B Q8 draft is a loss (`5.83 t/s` baseline vs `3.46 t/s` speculative), even though all reported draft tokens were accepted. The checkpoint/draft overhead dominates.
- Acceptance can appear excellent in server timings (`111/111` accepted) despite tokenizer mismatch, but performance still depends on active context and checkpoint overhead.

### Invalid standalone speculative-example results

These runs used standalone `llama-speculative` / `llama-speculative-simple` style binaries. They produced M-RoPE/KV position errors and often degenerate output. Preserve them only as failure evidence.

| Target | Draft | Engine | Settings | Reported decode | Reported acceptance | Validity | Failure evidence |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Qwen3.6 27B Q4 | Qwen3-1.7B Q8 | installed upstream example | `--draft 16 --draft-min 1 --draft-p-min 0.75` | `15.06 t/s` | `7.50%` | invalid | `inconsistent sequence positions`, `failed to decode` |
| Qwen3.6 27B Q4 | Qwen3-1.7B Q8 | installed upstream example | code prompt, `--draft 16 --draft-min 0 --draft-p-min 0.60` | `20.21 t/s` | `4.45%` | invalid | repeated decode-position failures |
| Qwen3.6 27B Q8 | Qwen3-1.7B Q8 | installed upstream example | code prompt, `--draft 16 --draft-min 0 --draft-p-min 0.60` | `20.84 t/s` | `20.05%` | invalid | repeated `useState`/`{` output plus M-RoPE/KV errors |
| Qwen3.6 27B Q8 | Qwen3-1.7B Q8 | patched buun example | `--draft 8 --draft-min 1 --draft-p-min 0.75` | `7.95 t/s` | `15.19%` | invalid | `non-consecutive token position` and degenerate output |

Common invalid-log patterns:

- `init: the tokens of sequence 0 in the input batch have inconsistent sequence positions`
- `for M-RoPE, it is required that the position satisfies: X < Y`
- `llama_decode: failed to decode, ret = -1`
- `find_slot: non-consecutive token position`

### DFlash results

DFlash was tested because of new user-provided repos and forum/Twitter claims. Local conclusion: not useful yet on this AMD/Vulkan setup.

| Target | Draft | Engine | Baseline | Spec decode | Acceptance | Validity | Log prefix |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Qwen3.6 27B Q4 | old DFlash Q4 | buun fork | `12.4 t/s` | `4.35 t/s` | `3.19%` | valid failed experiment | `/srv/llm/runs/20260424-095221-qwen3.6-27b-q4xl-dflash-q4-spec-*` |
| Qwen3.6 27B Q4 | old DFlash F16 | buun fork | `12.2 t/s` | `3.20 t/s` | `1.07%` | valid failed experiment | `/srv/llm/runs/20260424-095635-qwen3.6-27b-q4xl-dflash-f16-spec-*` |
| Qwen3.6 27B Q4 | new DFlash Q8 | buun fork | `12.2 t/s` | `3.90 t/s` | `2.18%` | valid failed experiment | `/srv/llm/runs/20260424-100711-qwen3.6-27b-q4xl-dflash-q8-spec-*` |
| Qwen3.6 27B Q8 | new DFlash Q8 | buun fork | `6.2 t/s` | `3.57 t/s` | `2.55%` | valid failed experiment | `/srv/llm/runs/20260424-100805-qwen3.6-27b-q8xl-dflash-q8-spec-*` |

Notes:

- New DFlash repo checked: `https://huggingface.co/spiritbuun/Qwen3.6-27B-DFlash-GGUF`.
- Downloaded new Q8 file: `/srv/llm/models/Qwen3.6-27B-DFlash-GGUF/dflash-draft-3.6-q8_0.gguf`.
- buun fork source updated to `f8c928b Merge SD-075: multi-slot DFlash tape + tree kernel guards`.
- Local buun patch was needed because Vulkan lacked the DFlash tree op path; DFlash still underperformed badly.

### Engine findings

| Engine | Path | Qwen3.6 standard draft status | Qwen3.6 ngram-mod status | DFlash status | Notes |
| --- | --- | --- | --- | --- | --- |
| Installed llama.cpp | `/home/crown/.local/llama-current` | standalone examples invalid; server disabled spec | server exposed `--spec-type`, but disabled speculative for Qwen3.6 context | no DFlash | too old for Qwen3.6 checkpoint fallback |
| Fresh upstream llama.cpp | `/home/crown/tmp/llama-cpp-upstream-qwen36-spec/result-vulkan/bin` | valid in `llama-server` with checkpoints | not retested after checkpoint fix in this consolidation | no DFlash | best general engine found so far |
| buun fork | `/home/crown/tmp/buun-llama-cpp/result-qwen36-spec-vulkan/bin` and related result links | example path still invalid for standard Qwen3 draft | supports extra spec types | DFlash available but slow | use only for DFlash experiments unless proven otherwise |

### Search and model availability findings

- Official `Qwen/Qwen3-1.7B-GGUF` exists, Apache-2.0, file `Qwen3-1.7B-Q8_0.gguf`, author `Qwen`.
- HF search did not find official `Qwen3.6-1.6B` or `Qwen3.6-1.7B` draft models on `2026-04-24`.
- The official Qwen3-1.7B draft and Qwen3.6 27B target use incompatible tokenizers/vocabs; fresh upstream server can translate between them, but this may still affect workload-dependent speed.
- Forum-style `ngram-mod` commands were identified, but installed upstream server initially disabled speculative on Qwen3.6. Fresh upstream fixed checkpoint fallback for draft-model speculative; ngram-mod should be retested separately before recommending.


## Known prior runs

### 2026-04-23 Qwen3.6 27B UD Q8_K_XL and Q4_K_XL clean benchmark attempt

These runs benchmark the downloaded `unsloth/Qwen3.6-27B-GGUF` UD quants after unloading `qwen-main.service` so the measurements ran without a resident `llama-server` process.

Models:

- Q8: `/srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-UD-Q8_K_XL.gguf`
- Q4: `/srv/llm/models/Qwen3.6-27B-GGUF/Qwen3.6-27B-UD-Q4_K_XL.gguf`
- mmproj: `/srv/llm/models/Qwen3.6-27B-GGUF/mmproj-F16.gguf`

Source:

- `https://huggingface.co/unsloth/Qwen3.6-27B-GGUF`

Recommended serving settings carried into the local profiles:

- keep at least `128K` context
- `--jinja`
- `--ngl 999`
- `--cache-type-k q8_0`
- `--cache-type-v q8_0`
- `--threads 16`
- coding sampling defaults: `temperature=0.6`, `min_p=0.0`, `top_p=0.95`, `top_k=20`, `repeat_penalty=1.0`

Benchmark notes:

- service state: `qwen-main.service` was stopped before the first run and stayed unloaded until the benchmarks were complete
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`
- initial `r=2` Q8 `131072` attempt ran for about one hour without producing a result table, so the remaining measurements were rerun or continued with `r=1`
- this host can load the model into memory, but long-context prompt processing on the current llama.cpp Vulkan build is dramatically slower than the previously logged `Qwen3.6` 35B A3B family

Completed results:

| Model | Prompt context | Reps | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Exit | Log |
| --- | ---: | ---: | --- | --- | --- | --- | --- | ---: | --- |
| `Qwen3.6-27B-UD-Q8_K_XL` | 32768 | 1 | `194.47 +/- 0.00 t/s` | `6.13 +/- 0.00 t/s` | `18.69 GiB` | `39.25 GiB` | `2.62 GiB` | `0` | `/srv/llm/runs/20260423-060653-qwen3.6-27b-ud-q8-k-xl-clean-r1-32k-131072-p32768.log` |
| `Qwen3.6-27B-UD-Q4_K_XL` | 32768 | 1 | `211.65 +/- 0.00 t/s` | `12.04 +/- 0.00 t/s` | `17.32 GiB` | `24.46 GiB` | `1.22 GiB` | `0` | `/srv/llm/runs/20260423-064402-qwen3.6-27b-ud-q4-k-xl-clean-r1-32k-p32768.log` |

Long-context outcome:

| Model | Prompt context | Reps | Result | Peak system RAM | Peak VRAM | Peak GTT | Exit | Log |
| --- | ---: | ---: | --- | --- | --- | --- | ---: | --- |
| `Qwen3.6-27B-UD-Q8_K_XL` | 131072 | 1 | no result table emitted before manual stop at about `31m`; prompt run was abandoned as impractically slow on this host | `18.90 GiB` | `45.26 GiB` | `2.81 GiB` | `143` | `/srv/llm/runs/20260423-060653-qwen3.6-27b-ud-q8-k-xl-clean-r1-32k-131072-p131072.log` |
| `Qwen3.6-27B-UD-Q4_K_XL` | 131072 | 1 | no result table emitted before `timeout 30m` | not recorded | not recorded | not recorded | `124` | `/srv/llm/runs/20260423-064935-qwen3.6-27b-ud-q4-k-xl-clean-r1-131072-p131072.log` |

Associated manifests:

- `/srv/llm/runs/20260423-060653-qwen3.6-27b-ud-q8-k-xl-clean-r1-32k-131072-bench.txt`
- `/srv/llm/runs/20260423-064402-qwen3.6-27b-ud-q4-k-xl-clean-r1-32k-bench.txt`
- `/srv/llm/runs/20260423-064935-qwen3.6-27b-ud-q4-k-xl-clean-r1-131072-bench.txt`

Takeaways:

- At `32768`, the Q4 quant is only modestly faster than the Q8 quant on prompt processing (`211.65` vs `194.47 t/s`) and about `1.96x` faster on token generation (`12.04` vs `6.13 t/s`)
- Both quants fit comfortably at `32768` on this machine, with the expected Q8 memory penalty
- `131072` prompt benchmarking is currently not practical for this 27B Qwen3.6 family on the installed llama.cpp Vulkan build, despite both quants loading into memory successfully
- The local switchable profiles were still added with the model card's normal `262144` context cap and `128K+` usage guidance, but the benchmark record should be treated as a warning that this host/build combination is a poor fit for long-context prompt throughput on these quants

### 2026-04-20 Qwen3.6 35B A3B Q8_0 clean 32K benchmark

This run benchmarks the downloaded `unsloth/Qwen3.6-35B-A3B-GGUF` `Qwen3.6-35B-A3B-Q8_0.gguf` after unloading `qwen-main.service` so the benchmark could run cleanly with no resident `llama-server` process competing for memory.

Model:

- `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-Q8_0.gguf`
- mmproj: `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/mmproj-F16.gguf`

Source:

- `https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF`

Common settings:

- context: `32768`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run and remained inactive after the benchmark
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Result:

- Manifest: `/srv/llm/runs/20260420-002832-qwen3.6-35b-a3b-q8-0-clean-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `799.72 +/- 55.09 t/s` | `52.81 +/- 0.08 t/s` | `14.28 GiB` | `40.72 GiB` | `0.65 GiB` | `/srv/llm/runs/20260420-002832-qwen3.6-35b-a3b-q8-0-clean-32k-p32768.log` |

Takeaways:

- The plain `Q8_0` quant fits this host at `32768` prompt context under Vulkan with the existing guard settings
- Prompt processing is in the same broad range as recent clean 35B A3B Q4-family 32K runs, while token generation is lower than the Q4-family results because the Q8_0 weights occupy substantially more memory
- This entry records a clean 32K datapoint only; it does not prove that the full `262144` profile context is practical for serving or benchmarking on this machine



### 2026-04-17 HauhauCS Qwen3.6 35B A3B Uncensored Aggressive Q4_K_M clean 32K benchmark

This run benchmarks the downloaded `HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive` `Q4_K_M` GGUF after unloading `qwen-main.service` so the benchmark could run cleanly from an unloaded state.

Model:

- `/srv/llm/models/HauhauCS-Qwen3.6-35B-A3B-Uncensored-Aggressive-GGUF/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_M.gguf`
- mmproj: `/srv/llm/models/HauhauCS-Qwen3.6-35B-A3B-Uncensored-Aggressive-GGUF/mmproj-Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-f16.gguf`

Source:

- `https://huggingface.co/HauhauCS/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive`

Selection note:

- The repo publishes both `Q4_K_P` and `Q4_K_M`; this run used `Q4_K_M` as the requested plain `q4` variant

Recommended settings from model card:

- keep at least `128K` context
- use `--jinja`
- vision support requires the `mmproj` file

Common settings:

- context: `32768`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run so no other live serving model remained loaded
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Result:

- Manifest: `/srv/llm/runs/20260417-110540-qwen3.6-35b-a3b-uncensored-hauhaucs-aggressive-q4-k-m-clean-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `801.63 ± 0.05 t/s` | `71.44 ± 0.79 t/s` | `19.54 GiB` | `26.37 GiB` | `0.53 GiB` | `/srv/llm/runs/20260417-110540-qwen3.6-35b-a3b-uncensored-hauhaucs-aggressive-q4-k-m-clean-32k-p32768.log` |

Takeaways:

- On this host, this HauhauCS `Q4_K_M` run lands in essentially the same prompt-processing class as the recent clean `Qwen3.6` and `Qwopus` 35B A3B Q4-family runs at `32768`
- `TG` at `71.44 t/s` is materially higher than the clean `Qwen3.6-35B-A3B-UD-Q4_K_XL` runs recorded earlier, while peak VRAM remains in the same practical range for this machine
- The model card recommends keeping `128K` context, so the switchable serving profile for this model keeps the normal `128000` default context rather than treating this `32K` benchmark as a serving cap
- The current profile schema does not expose the model card's recommended `presence_penalty`, so the new serving profile keeps the supported llama.cpp knobs only

### 2026-04-17 Qwen3.6 35B A3B UD Q4_K_XL clean 65536 benchmark

This run benchmarks the downloaded `unsloth/Qwen3.6-35B-A3B-GGUF` `Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf` at `65536` prompt context after unloading the active local Qwen3.6 serving process so the benchmark could run from a cold baseline.

Model:

- `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf`
- mmproj: `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/mmproj-F16.gguf`

Source:

- `https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF`

Common settings:

- context: `65536`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- service state: the resident Qwen3.6 `llama-server` process was stopped before the run and remained unloaded until the benchmark completed
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`
- guard note: the normal `llm-guard` wrapper on this host is currently hard-coded to `/sys/class/drm/card1/device`, so this run used direct `llama-bench` with manual pre-run and post-run AMD memory-counter checks against `card0`

Result:

- Run time: `2026-04-17T09:27:11-04:00`

| Prompt context | PP speed | TG speed | Pre-run VRAM | Pre-run GTT | Mid-run VRAM sample | Mid-run GTT sample | Post-run VRAM | Post-run GTT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 65536 | `645.58 ± 1.20 t/s` | `57.59 ± 0.21 t/s` | `5.68 GiB` | `0.06 GiB` | `27.93 GiB` | `0.70 GiB` | `5.68 GiB` | `0.06 GiB` |

Takeaways:

- This was a clean cold-start run: no resident `llama-server` or `llama-bench` process remained loaded before or after the measurement
- Relative to the clean `131072` `fa=1` result recorded on `2026-04-16`, prompt throughput at `65536` is substantially higher (`645.58` vs `435.41 t/s`) while `TG` remains effectively in the same band
- Mid-run residency stayed well below the contaminated earlier attempt from the same morning, confirming that the first `~55 GiB` sample was inflated by the already loaded live server rather than by the benchmark alone
- The usual main-model profile for this GGUF still targets `128000` requested context with a `131072` profile cap, so this `65536` result is a benchmark datapoint rather than a serving-profile change
### 2026-04-16 Qwen3.6 35B A3B UD Q4_K_XL clean 32K and 131072 benchmark comparison

These runs benchmark the downloaded `unsloth/Qwen3.6-35B-A3B-GGUF` `Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf` after unloading the active local serving stack so the benchmark could run cleanly. Two series were recorded on this host:

- initial benchmark with `fa=1`
- follow-up rerun with `fa=0` after reviewing the model author's recommendation

Model:

- `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf`
- mmproj: `/srv/llm/models/Qwen3.6-35B-A3B-GGUF/mmproj-F16.gguf`

Source:

- `https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF`

Recommended serving settings from model author:

- `--jinja`
- `--ctx-size 131072`
- `--gpu-layers all`
- `--fa off`
- `--cache-type-k q8_0`
- `--cache-type-v q8_0`
- `--threads 16`
- `--temp 0.6`
- `--min-p 0.0`
- `--top-p 0.95`
- `--top-k 20`
- `--repeat-penalty 1.0`

Common settings:

- contexts: `32768 131072`
- flags: `-ngl 999 -n 128 -r 2`, with one series at `-fa 1` and one at `-fa 0`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run to unload the live `qwopus-moe-35b-a3b-q4` server
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

`fa=1` result:

- Manifest: `/srv/llm/runs/20260416-123743-qwen3-6-35b-a3b-ud-q4-k-xl-clean-32k-131072-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `807.81 ± 1.04 t/s` | `57.62 ± 0.62 t/s` | `19.21 GiB` | `27.24 GiB` | `0.64 GiB` | `/srv/llm/runs/20260416-123743-qwen3-6-35b-a3b-ud-q4-k-xl-clean-32k-131072-p32768.log` |
| 131072 | `435.41 ± 0.02 t/s` | `56.67 ± 0.21 t/s` | `19.59 GiB` | `29.32 GiB` | `0.83 GiB` | `/srv/llm/runs/20260416-123743-qwen3-6-35b-a3b-ud-q4-k-xl-clean-32k-131072-p131072.log` |

`fa=0` follow-up rerun:

- Manifest: `/srv/llm/runs/20260416-125739-qwen3-6-35b-a3b-ud-q4-k-xl-fa-off-clean-32k-131072-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `678.97 ± 1.07 t/s` | `57.36 ± 0.12 t/s` | `19.25 GiB` | `27.89 GiB` | `0.64 GiB` | `/srv/llm/runs/20260416-125739-qwen3-6-35b-a3b-ud-q4-k-xl-fa-off-clean-32k-131072-p32768.log` |
| 131072 | `210.58 ± 0.11 t/s` | `57.53 ± 0.16 t/s` | `25.71 GiB` | `33.03 GiB` | `1.09 GiB` | `/srv/llm/runs/20260416-125739-qwen3-6-35b-a3b-ud-q4-k-xl-fa-off-clean-32k-131072-p131072.log` |

Takeaways:

- On this host, `fa=0` is materially worse on prompt processing at both tested contexts: about `15.9%` slower at `32768` and about `51.6%` slower at `131072`
- `TG` stayed nearly flat across both series, so the `fa=0` rerun does not buy a meaningful generation-speed gain here
- `fa=0` also used noticeably more memory at `131072`, adding about `6.12 GiB` system RAM, `3.71 GiB` VRAM, and `0.26 GiB` GTT versus the `fa=1` run
- The model author recommends `fa off`, likely to avoid host-specific fallback issues, but the measured benchmark data on this machine favors keeping `FA=on` as the default profile setting for now
- Relative to the current `qwopus-moe-35b-a3b-q4` baseline on this host, this Qwen3.6 quant remains materially slower on TG but still practical for 131072-context use while staying within the machine's memory envelope when `fa=1`

### 2026-04-16 Gemopus 4 26B A4B Preview Q4_K_M and Q8_0 clean 32K and 128K benchmark

This run benchmarks the downloaded `Jackrong/Gemopus-4-26B-A4B-it-GGUF` `Q4_K_M` and `Q8_0` GGUFs after unloading the active local serving stack so both quants could be measured cleanly at `32768` and `128000`.

Run labels:

- `gemopus-4-26b-a4b-it-preview-q4-km-clean-32k-128k`
- `gemopus-4-26b-a4b-it-preview-q8-0-clean-32k-128k`

Models:

- Q4: `/srv/llm/models/Gemopus-4-26B-A4B-it-GGUF/Gemopus-4-26B-A4B-it-Preview-Q4_K_M.gguf`
- Q8: `/srv/llm/models/Gemopus-4-26B-A4B-it-GGUF/Gemopus-4-26B-A4B-it-Preview-Q8_0.gguf`
- mmproj: `/srv/llm/models/Gemopus-4-26B-A4B-it-GGUF/mmproj.gguf`

Source:

- `https://huggingface.co/Jackrong/Gemopus-4-26B-A4B-it-GGUF`

Serving note from model author:

- recommended sampling settings: `temperature=1.0`, `top_p=0.95`, `top_k=64`
- these affect inference behavior, not `llama-bench` PP/TG throughput

Common settings:

- contexts: `32768 128000`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run to unload the live `qwopus-moe-35b-a3b-q4` server, then started again after both Gemopus runs finished
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Q4 result:

- Manifest: `/srv/llm/runs/20260416-010140-gemopus-4-26b-a4b-it-preview-q4-km-clean-32k-128k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `814.13 ± 4.50 t/s` | `64.27 ± 0.36 t/s` | `19.35 GiB` | `22.82 GiB` | `0.71 GiB` | `/srv/llm/runs/20260416-010140-gemopus-4-26b-a4b-it-preview-q4-km-clean-32k-128k-p32768.log` |
| 128000 | `313.21 ± 0.34 t/s` | `64.07 ± 0.72 t/s` | `19.57 GiB` | `24.57 GiB` | `0.90 GiB` | `/srv/llm/runs/20260416-010140-gemopus-4-26b-a4b-it-preview-q4-km-clean-32k-128k-p128000.log` |

Q8 result:

- Manifest: `/srv/llm/runs/20260416-012831-gemopus-4-26b-a4b-it-preview-q8-0-clean-32k-128k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `841.00 ± 0.71 t/s` | `45.70 ± 0.26 t/s` | `19.53 GiB` | `32.20 GiB` | `0.89 GiB` | `/srv/llm/runs/20260416-012831-gemopus-4-26b-a4b-it-preview-q8-0-clean-32k-128k-p32768.log` |
| 128000 | `317.71 ± 0.35 t/s` | `45.96 ± 0.33 t/s` | `19.73 GiB` | `33.95 GiB` | `1.07 GiB` | `/srv/llm/runs/20260416-012831-gemopus-4-26b-a4b-it-preview-q8-0-clean-32k-128k-p128000.log` |

Takeaways:

- `Q8_0` buys only a small PP gain over `Q4_K_M`: about `3.3%` at `32768` and about `1.4%` at `128000`
- `Q4_K_M` is much stronger on TG: about `40.6%` faster than `Q8_0` at `32768` and about `39.4%` faster at `128000`
- `Q8_0` costs about `9.38 GiB` more VRAM than `Q4_K_M` at both tested contexts while also using slightly more system RAM and GTT
- `Q4_K_M` stayed effectively flat on TG from `32768` to `128000`, while `Q8_0` also stayed flat but at a much lower generation rate
- On this machine, `Gemopus` `Q4_K_M` is the practical default between these two quants unless a later quality eval shows a real win worth the extra memory and lower TG speed

### 2026-04-15 Qwopus MoE 35B A3B Q4_K_M clean 32K and 128K benchmark

This run benchmarks `Qwopus-MoE-35B-A3B-Q4_K_M` at `32768` and `128000` context after unloading the active local serving stack so the benchmark could run cleanly.

Run label:

- `qwopus-moe-35b-a3b-q4-k-m-clean-32k-128k`

Model:

- `/srv/llm/models/Qwopus-MoE-35B-A3B-GGUF/Qwopus-MoE-35B-A3B-Q4_K_M.gguf`

Common settings:

- contexts: `32768 128000`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run and no `llama-*` serving process was left loaded during the benchmark
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Result:

- Manifest: `/srv/llm/runs/20260415-151045-qwopus-moe-35b-a3b-q4-k-m-clean-32k-128k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 32768 | `804.57 ± 0.72 t/s` | `73.81 ± 0.21 t/s` | `17.31 GiB` | `26.38 GiB` | `0.53 GiB` | `/srv/llm/runs/20260415-151045-qwopus-moe-35b-a3b-q4-k-m-clean-32k-128k-p32768.log` |
| 128000 | `442.31 ± 0.25 t/s` | `73.75 ± 0.05 t/s` | `17.53 GiB` | `28.38 GiB` | `0.71 GiB` | `/srv/llm/runs/20260415-151045-qwopus-moe-35b-a3b-q4-k-m-clean-32k-128k-p128000.log` |

Takeaways:

- `TG` stayed effectively flat from `32768` to `128000`, moving only from `73.81` to `73.75 t/s`
- `PP` dropped materially at the larger prompt, from `804.57` to `442.31 t/s`, which is the expected high-context cost on this host
- Peak VRAM rose by about `2.00 GiB` going from `32768` to `128000`, while peak system RAM rose only slightly by about `0.22 GiB`
- Relative to the earlier clean Qwopus MoE Q4 run at `32768`, this rerun is slightly faster on both PP and TG but uses more measured peak system RAM and VRAM on this machine
- The `128000` context completed successfully and appears practical on this box for this model, but it has a noticeably longer wall-clock setup and benchmark time than the `32768` case

### 2026-04-13 SuperGemma4 26B uncensored fast v2 Q4_K_M clean 16K benchmark

This run benchmarks the downloaded `Jiunsong/supergemma4-26b-uncensored-gguf-v2` `Q4_K_M` GGUF through the existing Vulkan benchmark wrapper on this machine.

Run label:

- `supergemma4-26b-uncensored-fast-v2-q4-km`

Model:

- `/home/crown/models-local/supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf`

Source:

- `https://huggingface.co/Jiunsong/supergemma4-26b-uncensored-gguf-v2`

Common settings:

- contexts: `16384`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped and runtime-masked during the run, then restored after completion
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Result:

- Manifest: `/srv/llm/runs/20260413-143959-supergemma4-26b-uncensored-fast-v2-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `982.28 ± 3.72 t/s` | `66.07 ± 0.10 t/s` | `8.45 GiB` | `22.26 GiB` | `0.66 GiB` | `/srv/llm/runs/20260413-143959-supergemma4-26b-uncensored-fast-v2-q4-km-p16384.log` |

Takeaways:

- This `supergemma4` Q4 run lands in the same practical class as the recent Gemma 4 uncensored 26B Q4 runs on this host
- Against the earlier `gemma-4-26b-a4b-it-uncensored-q4-km` result at `16384`, it is slightly slower on PP (`982.28` vs `1012.67 t/s`) but essentially tied on TG (`66.07` vs `65.85 t/s`)
- Peak VRAM is materially higher than that earlier uncensored Gemma 4 Q4 run (`22.26 GiB` vs `18.40 GiB`), so this variant does not improve efficiency on this machine

### 2026-04-10 Carnice MoE 35B A3B Q4_K_M clean 16K to 80K benchmark

This run benchmarks the newly downloaded `Carnice-MoE-35B-A3B-Q4_K_M` on the same clean 16K to 80K matrix used for the earlier `Qwopus-MoE-35B-A3B` comparison series.

Run label:

- `carnice-moe-35b-a3b-q4-k-m`

Model:

- `/srv/llm/models/Carnice-MoE-35B-A3B-GGUF/Carnice-MoE-35B-A3B-Q4_K_M.gguf`

Common settings:

- contexts: `16384 32768 65536 80000`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- wrapper guard: `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` was stopped before the run and no `llama-*` process was left loaded

Result:

- Manifest: `/srv/llm/runs/20260410-115841-carnice-moe-35b-a3b-q4-k-m-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `934.44 ± 2.65 t/s` | `72.58 ± 0.09 t/s` | `8.29 GiB` | `25.25 GiB` | `0.48 GiB` | `/srv/llm/runs/20260410-115841-carnice-moe-35b-a3b-q4-k-m-p16384.log` |
| 32768 | `816.34 ± 0.47 t/s` | `72.59 ± 0.05 t/s` | `8.35 GiB` | `25.56 GiB` | `0.51 GiB` | `/srv/llm/runs/20260410-115841-carnice-moe-35b-a3b-q4-k-m-p32768.log` |
| 65536 | `651.20 ± 0.37 t/s` | `72.64 ± 0.14 t/s` | `8.41 GiB` | `26.25 GiB` | `0.58 GiB` | `/srv/llm/runs/20260410-115841-carnice-moe-35b-a3b-q4-k-m-p65536.log` |
| 80000 | `593.08 ± 0.47 t/s` | `72.71 ± 0.15 t/s` | `8.41 GiB` | `26.55 GiB` | `0.60 GiB` | `/srv/llm/runs/20260410-115841-carnice-moe-35b-a3b-q4-k-m-p80000.log` |

Takeaways:

- This Carnice Q4 run is effectively in the same throughput class as the earlier `Qwopus-MoE-35B-A3B-Q4_K_M` run on this host
- Compared with the earlier Qwopus MoE Q4 series, Carnice is slightly faster at `16384` and `80000`, slightly slower at `32768` and `65536`, and functionally tied on TG around `72.6 t/s`
- The practical trade is memory: Carnice used about `3.2 GiB` more peak VRAM than the earlier Qwopus MoE Q4 at every tested context while staying slightly lower on peak system RAM
- On this machine, Carnice Q4 looks safe to serve as another high-throughput 35B A3B option, but it does not clearly displace the earlier Qwopus MoE Q4 on efficiency

### 2026-04-07 Qwopus3.5-27B-v3 clean 16K and 32K family completion

This completes the clean rerun for the `Qwopus3.5-27B-v3` quant family after the earlier gameplay-contaminated attempt.

Run labels:

- `qwopus3-5-27b-v3-q4-k-m-clean-16k-32k`
- `qwopus3-5-27b-v3-q5-k-m-clean-16k-32k`
- `qwopus3-5-27b-v3-q6-k-clean-16k-32k`
- `qwopus3-5-27b-v3-q8-0-clean-16k-32k`

Models:

- Q4_K_M: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q4_K_M.gguf`
- Q5_K_M: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q5_K_M.gguf`
- Q6_K: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q6_K.gguf`
- Q8_0: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q8_0.gguf`

Common settings:

- contexts: `16384 32768`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` remained stopped for the run

Q4_K_M result:

- Manifest: `/srv/llm/runs/20260407-003947-qwopus3-5-27b-v3-q4-k-m-clean-16k-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `264.73 ± 0.42 t/s` | `12.94 ± 0.00 t/s` | `13.87 GiB` | `18.16 GiB` | `1.18 GiB` | `/srv/llm/runs/20260407-003947-qwopus3-5-27b-v3-q4-k-m-clean-16k-32k-p16384.log` |
| 32768 | `210.91 ± 0.34 t/s` | `12.97 ± 0.03 t/s` | `13.91 GiB` | `19.03 GiB` | `1.22 GiB` | `/srv/llm/runs/20260407-003947-qwopus3-5-27b-v3-q4-k-m-clean-16k-32k-p32768.log` |

Q5_K_M result:

- Manifest: `/srv/llm/runs/20260407-005126-qwopus3-5-27b-v3-q5-k-m-clean-16k-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `260.20 ± 0.01 t/s` | `11.32 ± 0.00 t/s` | `13.86 GiB` | `20.52 GiB` | `1.18 GiB` | `/srv/llm/runs/20260407-005126-qwopus3-5-27b-v3-q5-k-m-clean-16k-32k-p16384.log` |
| 32768 | `208.78 ± 0.06 t/s` | `11.32 ± 0.00 t/s` | `13.94 GiB` | `21.39 GiB` | `1.22 GiB` | `/srv/llm/runs/20260407-005126-qwopus3-5-27b-v3-q5-k-m-clean-16k-32k-p32768.log` |

Q6_K result:

- Manifest: `/srv/llm/runs/20260407-010322-qwopus3-5-27b-v3-q6-k-clean-16k-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `256.51 ± 0.02 t/s` | `9.85 ± 0.00 t/s` | `13.87 GiB` | `23.01 GiB` | `1.18 GiB` | `/srv/llm/runs/20260407-010322-qwopus3-5-27b-v3-q6-k-clean-16k-32k-p16384.log` |
| 32768 | `205.94 ± 0.09 t/s` | `9.86 ± 0.00 t/s` | `13.91 GiB` | `24.04 GiB` | `1.22 GiB` | `/srv/llm/runs/20260407-010322-qwopus3-5-27b-v3-q6-k-clean-16k-32k-p32768.log` |

Q8_0 result:

- Manifest: `/srv/llm/runs/20260407-011535-qwopus3-5-27b-v3-q8-0-clean-16k-32k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `277.00 ± 0.04 t/s` | `7.85 ± 0.01 t/s` | `14.20 GiB` | `28.79 GiB` | `1.47 GiB` | `/srv/llm/runs/20260407-011535-qwopus3-5-27b-v3-q8-0-clean-16k-32k-p16384.log` |
| 32768 | `215.47 ± 0.32 t/s` | `7.84 ± 0.00 t/s` | `14.25 GiB` | `29.66 GiB` | `1.51 GiB` | `/srv/llm/runs/20260407-011535-qwopus3-5-27b-v3-q8-0-clean-16k-32k-p32768.log` |

Takeaways:

- `Q4_K_M` remains the strongest practical default in this family: it is either fastest or effectively tied on PP while clearly leading TG
- `Q5_K_M` is very close to `Q4_K_M` on PP, but loses about `1.6 t/s` on TG and costs about `2.3 GiB` more VRAM at `32768`
- `Q6_K` and `Q8_0` do not buy enough PP improvement to justify their TG losses on this host
- `Q8_0` is the most extreme trade: best PP in the set, but only about `7.8 t/s` TG while using nearly `30 GiB` VRAM at `32768`
- Compared with the earlier contaminated gameplay run for `Q4_K_M`, the clean rerun again confirms that concurrent gaming had materially depressed both PP and TG

### 2026-04-06 to 2026-04-07 Qwopus MoE 35B A3B clean 16K to 80K benchmark series

This is the clean rerun for the actual intended new Qwopus MoE pair after stopping all model services and confirming no other `llama-*` workloads were loaded.

Run labels:

- `qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k`
- `qwopus-moe-35b-a3b-q8-0-clean-16k-80k`

Models:

- Q4_K_M: `/srv/llm/models/Qwopus-MoE-35B-A3B-GGUF/Qwopus-MoE-35B-A3B-Q4_K_M.gguf`
- Q8_0: `/srv/llm/models/Qwopus-MoE-35B-A3B-GGUF/Qwopus-MoE-35B-A3B-Q8_0.gguf`

Common settings:

- contexts: `16384 32768 65536 80000`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- service state: `qwen-main.service` remained stopped for the full run so no other model was loaded

Q4_K_M result:

- Manifest: `/srv/llm/runs/20260406-235825-qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `909.34 ± 2.18 t/s` | `72.41 ± 0.05 t/s` | `13.95 GiB` | `22.04 GiB` | `0.59 GiB` | `/srv/llm/runs/20260406-235825-qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k-p16384.log` |
| 32768 | `800.74 ± 1.01 t/s` | `72.39 ± 0.19 t/s` | `13.88 GiB` | `22.35 GiB` | `0.63 GiB` | `/srv/llm/runs/20260406-235825-qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k-p32768.log` |
| 65536 | `641.58 ± 0.71 t/s` | `72.51 ± 0.13 t/s` | `13.95 GiB` | `23.04 GiB` | `0.69 GiB` | `/srv/llm/runs/20260406-235825-qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k-p65536.log` |
| 80000 | `586.28 ± 0.71 t/s` | `72.43 ± 0.11 t/s` | `13.98 GiB` | `23.34 GiB` | `0.71 GiB` | `/srv/llm/runs/20260406-235825-qwopus-moe-35b-a3b-q4-k-m-clean-16k-80k-p80000.log` |

Q8_0 result:

- Manifest: `/srv/llm/runs/20260407-001348-qwopus-moe-35b-a3b-q8-0-clean-16k-80k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `941.79 ± 3.30 t/s` | `50.27 ± 0.21 t/s` | `13.48 GiB` | `36.46 GiB` | `0.70 GiB` | `/srv/llm/runs/20260407-001348-qwopus-moe-35b-a3b-q8-0-clean-16k-80k-p16384.log` |
| 32768 | `828.12 ± 0.65 t/s` | `53.08 ± 0.08 t/s` | `13.47 GiB` | `36.77 GiB` | `0.73 GiB` | `/srv/llm/runs/20260407-001348-qwopus-moe-35b-a3b-q8-0-clean-16k-80k-p32768.log` |
| 65536 | `661.07 ± 0.27 t/s` | `53.16 ± 0.06 t/s` | `13.49 GiB` | `37.46 GiB` | `0.80 GiB` | `/srv/llm/runs/20260407-001348-qwopus-moe-35b-a3b-q8-0-clean-16k-80k-p65536.log` |
| 80000 | `602.47 ± 0.04 t/s` | `53.14 ± 0.01 t/s` | `13.53 GiB` | `37.77 GiB` | `0.83 GiB` | `/srv/llm/runs/20260407-001348-qwopus-moe-35b-a3b-q8-0-clean-16k-80k-p80000.log` |

Takeaways:

- `Q4_K_M` is the stronger default on this machine for throughput-balanced use: TG stayed near `72.4 t/s` across the full range while peak VRAM stayed between `22.04` and `23.34 GiB`
- `Q8_0` was slightly faster on PP at every tested context, but TG dropped to about `50.3` to `53.2 t/s`
- `Q8_0` also cost about `14 GiB` more VRAM than `Q4_K_M` at every tested context
- For practical local serving, the measured trade strongly favors `Q4_K_M` unless the Q8 quant shows a workload-specific quality win later

Game-load comparison note:

- The earlier gameplay-contaminated run on `2026-04-06` was for the older `Qwopus3.5-27B-v3` quant set, not this MoE pair, so there is no direct contaminated-vs-clean apples-to-apples comparison for the MoE models yet
- The one clean same-day cross-check we do have for the older `Qwopus3.5-27B-v3-Q4_K_M` at `16384` shows the scale of the distortion:
  - gameplay-contaminated: `146.32 ± 0.88 t/s` PP, `6.06 ± 0.19 t/s` TG
  - clean rerun: `/srv/llm/runs/20260406-235230-qwopus3-5-27b-v3-q4-k-m-clean-16k-80k-p16384.log` with `264.63 ± 0.44 t/s` PP, `12.94 ± 0.01 t/s` TG
- That earlier side-by-side is enough to show that a concurrent game can materially distort both PP and TG on this host

### 2026-04-06 Qwopus3.5-27B-v3 16K to 80K refresh attempt stopped early due concurrent gameplay

This series was started while a game was also running on the machine. The partial numbers below are potentially tarnished by GPU contention and should not be treated as clean comparison data. Plan to rerun the full matrix later after the game session is finished.

Requested matrix:

- Models:
  - `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q4_K_M.gguf`
  - `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q5_K_M.gguf`
  - `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q6_K.gguf`
  - `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q8_0.gguf`
- Contexts: `16384 32768 65536 80000`
- Common flags: `-ngl 999 -fa 1 -n 128 -r 2`
- Guard profile: benchmark wrapper guard with `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- Live service note: `qwen-main.service` was stopped before the run, then left stopped after the run was cancelled so the machine could stay free for gaming

Q4_K_M partial result:

- Run label: `qwopus3-5-27b-v3-q4-k-m-refresh-16k-80k`
- Manifest: `/srv/llm/runs/20260406-230636-qwopus3-5-27b-v3-q4-k-m-refresh-16k-80k-bench.txt`
- Status: partial and contaminated; user requested stop mid-series

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Status | Log |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16384 | `146.32 ± 0.88 t/s` | `6.06 ± 0.19 t/s` | `25.41 GiB` | `29.92 GiB` | `1.36 GiB` | completed, contaminated | `/srv/llm/runs/20260406-230636-qwopus3-5-27b-v3-q4-k-m-refresh-16k-80k-p16384.log` |
| 32768 | `124.54 ± 6.15 t/s` | `6.09 ± 0.19 t/s` | `25.57 GiB` | `31.08 GiB` | `1.39 GiB` | completed, contaminated | `/srv/llm/runs/20260406-230636-qwopus3-5-27b-v3-q4-k-m-refresh-16k-80k-p32768.log` |
| 65536 | not measured | not measured | `25.64 GiB` | `32.74 GiB` | `1.45 GiB` | terminated by user, `exit_status=143` | `/srv/llm/runs/20260406-230636-qwopus3-5-27b-v3-q4-k-m-refresh-16k-80k-p65536.log` |
| 80000 | not started | not started | not measured | not measured | not measured | not run | no log |

Q5_K_M partial result:

- Run label: `qwopus3-5-27b-v3-q5-k-m-refresh-16k-80k`
- Manifest: `/srv/llm/runs/20260406-233156-qwopus3-5-27b-v3-q5-k-m-refresh-16k-80k-bench.txt`
- Status: started at `16384`, then terminated before any benchmark row was written
- Partial log: `/srv/llm/runs/20260406-233156-qwopus3-5-27b-v3-q5-k-m-refresh-16k-80k-p16384.log`

Q6_K and Q8_0:

- Not started in this attempt

Takeaways:

- These results are not reliable enough for model selection because the run overlapped with gameplay on the same machine
- The only recorded throughput rows from this attempt are the contaminated `Q4_K_M` `16384` and `32768` entries above
- A clean rerun should restart the full matrix from `16384` through `80000` for all four quants instead of mixing clean and contaminated samples
- No benchmark or model server processes were left running after the cancellation

### 2026-04-06 Gemma 4 26B 16K refresh for new Q6 and uncensored variants

Run labels:

- `gemma-4-26b-a4b-it-q6-k`
- `gemma-4-26b-a4b-it-uncensored-q4-km`
- `gemma-4-26b-a4b-it-uncensored-q8`

Models:

- Q6_K: `/srv/llm/models/Gemma-4-26B-A4B-it-Q6_K/gemma-4-26B-A4B-it-Q6_K.gguf`
- Uncensored Q4_K_M: `/srv/llm/models/gemma-4-26B-A4B-it-uncensored-GGUF/gemma-4-26B-A4B-it-uncensored-Q4_K_M.gguf`
- Uncensored Q8_0: `/srv/llm/models/gemma-4-26B-A4B-it-uncensored-GGUF/gemma-4-26B-A4B-it-uncensored-Q8_0.gguf`

Common settings:

- context: `16384`
- flags: `-ngl 999 -fa 1 -n 128 -r 2`
- wrapper guard: `8 GiB` system RAM reserve, `2 GiB` VRAM reserve, and `4 GiB` GTT reserve
- `qwen-main.service` was stopped before the run so the live serving model would not contend for VRAM
- benchmark binary: `/home/crown/.local/llama-current/llama-bench`

Q6_K result:

- Manifest: `/srv/llm/runs/20260406-022810-gemma-4-26b-a4b-it-q6-k-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `965.33 ± 2.18 t/s` | `55.52 ± 0.25 t/s` | `13.09 GiB` | `23.84 GiB` | `0.77 GiB` | `/srv/llm/runs/20260406-022810-gemma-4-26b-a4b-it-q6-k-p16384.log` |

Uncensored Q4_K_M result:

- Manifest: `/srv/llm/runs/20260406-022921-gemma-4-26b-a4b-it-uncensored-q4-km-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `1012.67 ± 0.94 t/s` | `65.85 ± 0.18 t/s` | `13.09 GiB` | `18.40 GiB` | `0.77 GiB` | `/srv/llm/runs/20260406-022921-gemma-4-26b-a4b-it-uncensored-q4-km-p16384.log` |

Uncensored Q8_0 result:

- Manifest: `/srv/llm/runs/20260406-023021-gemma-4-26b-a4b-it-uncensored-q8-bench.txt`

| Prompt context | PP speed | TG speed | Peak system RAM | Peak VRAM | Peak GTT | Log |
| --- | --- | --- | --- | --- | --- | --- |
| 16384 | `1054.80 ± 0.38 t/s` | `47.16 ± 0.15 t/s` | `13.53 GiB` | `27.77 GiB` | `0.94 GiB` | `/srv/llm/runs/20260406-023021-gemma-4-26b-a4b-it-uncensored-q8-p16384.log` |

Takeaways:

- Of the three new additions, the uncensored `Q4_K_M` is the strongest practical result on this machine at `16384`: it beats the new `Q6_K` on both PP and TG while using about `5.4 GiB` less VRAM.
- The uncensored `Q4_K_M` also edges out the earlier official `Gemma 4 26B A4B Q4_K_M` baseline at `16384` on both PP and TG in this environment.
- `Q6_K` increased model size and VRAM use without improving throughput on this host.
- `Q8_0` improved PP speed, but TG speed dropped sharply to `47.16 t/s` while peak VRAM climbed to `27.77 GiB`, making it a poor default serving choice here.

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
- Model: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q5_K_M.gguf`
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
- Model: `/srv/llm/models/Qwopus3.5-27B-v3-GGUF/Qwopus3.5-27B-v3-Q4_K_M.gguf`
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

## 2026-04-26 Ornstein3.6 35B A3B SABER Q4_K_M

Goal: download and benchmark `DJLougen/Ornstein3.6-35B-A3B-SABER-GGUF` at 32k and 128k context, then add switchable model profiles if valid.

Setup:

- Model repo: `https://huggingface.co/DJLougen/Ornstein3.6-35B-A3B-SABER-GGUF`
- Downloaded Q4 file: `/srv/llm/models/Ornstein3.6-35B-A3B-SABER-GGUF/Ornstein3.6-35B-A3B-SABER-Q4_K_M.gguf`
- Downloaded Q4 size: `21166758112` bytes, shown by llama.cpp as `19.70 GiB`
- Downloaded Q8 file: `/srv/llm/models/Ornstein3.6-35B-A3B-SABER-GGUF/Ornstein3.6-35B-A3B-SABER-Q8_0.gguf`
- Downloaded Q8 size: `36903139552` bytes, shown by llama.cpp as `34.36 GiB`
- Runtime: `/home/crown/tmp/llama-cpp-upstream-20260426-tech-sweep/result-vulkan/bin/llama-bench`
- Backend: Vulkan, Radeon 8060S Graphics / RADV GFX1151
- Clean benchmark window: stopped `qwen-main.service` and `qwen3-tts.service`; `hermes-gateway.service` stayed active; no llama processes were running before benchmark.

Commands:

```bash
/home/crown/.local/bin/llm-guard --reserve-vram-gib 2 \
  /home/crown/tmp/llama-cpp-upstream-20260426-tech-sweep/result-vulkan/bin/llama-bench \
  -m /srv/llm/models/Ornstein3.6-35B-A3B-SABER-GGUF/Ornstein3.6-35B-A3B-SABER-Q4_K_M.gguf \
  -ngl 999 -fa 1 -p 32768 -n 128 -r 1 -o md

/home/crown/.local/bin/llm-guard --reserve-vram-gib 2 \
  /home/crown/tmp/llama-cpp-upstream-20260426-tech-sweep/result-vulkan/bin/llama-bench \
  -m /srv/llm/models/Ornstein3.6-35B-A3B-SABER-GGUF/Ornstein3.6-35B-A3B-SABER-Q4_K_M.gguf \
  -ngl 999 -fa 1 -p 128000 -n 128 -r 1 -o md
```

Results:

| Model | Quant | Context | PP speed | TG speed | Status | Log |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Ornstein3.6 35B A3B SABER | Q4_K_M | 32768 | `809.65 t/s` | `73.84 t/s` | valid | `/srv/llm/runs/20260426-ornstein36-35b-a3b-saber/ornstein36-35b-a3b-saber-q4km-vulkan-p32768.log` |
| Ornstein3.6 35B A3B SABER | Q4_K_M | 128000 | `446.30 t/s` | `74.36 t/s` | valid | `/srv/llm/runs/20260426-ornstein36-35b-a3b-saber/ornstein36-35b-a3b-saber-q4km-vulkan-p128000.log` |
| Ornstein3.6 35B A3B SABER | Q8_0 | 32768 | `842.25 t/s` | `52.77 t/s` | valid | `/srv/llm/runs/20260426-ornstein36-35b-a3b-saber/ornstein36-35b-a3b-saber-q8-vulkan-p32768.log` |
| Ornstein3.6 35B A3B SABER | Q8_0 | 128000 | `454.20 t/s` | `52.83 t/s` | valid | `/srv/llm/runs/20260426-ornstein36-35b-a3b-saber/ornstein36-35b-a3b-saber-q8-vulkan-p128000.log` |

Takeaways:

- Ornstein3.6 SABER Q4_K_M is a top-tier 35B A3B local throughput candidate on this host.
- Ornstein3.6 SABER Q8_0 is a strong accuracy-oriented local 35B A3B candidate, matching the prior Qwen3.6/Qwopus Q8 decode class while slightly improving 128k prefill.
- Decode throughput is essentially flat from 32k to 128k and slightly above prior Qwopus/Carnice Q4-class results.
- 128k prefill is strong for this model class: `446.30 t/s`, similar to the best prior 35B A3B/Qwopus long-context results.
- Added model profile: `/home/crown/machine-setup/model-profiles/ornstein3.6-35b-a3b-saber-q4-k-m.env`.
- Added model profile: `/home/crown/machine-setup/model-profiles/ornstein3.6-35b-a3b-saber-q8-0.env`.
