# Ornith hard-panel comparison: CIRU v3 and Halo

All three builds completed the existing Ornith 1.5 difficulty panel with **one request at a time**, MTP enabled, and the same native tasks and graders. CIRU v3 took **25m 18.32s**, compared with **29m 17.11s** before and **24m 34.43s** for Halo. Model load is shown separately.

V3 changed total wall time by **-13.59% versus previous CIRU** and **+2.98% versus Halo**. These are complete measured runs, including tool work, scoring, and harness overhead.

| Build | Full wall after readiness | Load | Full wall including load | Total output tokens |
|---|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 29m 17.11s | 31.17s | 29m 48.28s | 33,294 |
| CIRU v3, MTP6 | 25m 18.32s | 31.15s | 25m 49.47s | 33,451 |
| Halo Vulkan, MTP3 | 24m 34.43s | 33.62s | 25m 08.05s | 31,058 |

Halo finished **43.89 seconds sooner than v3 in this run**. V3 had faster prompt processing and long-history generation; Halo had faster short-task generation, fewer total output tokens, and one additional passing case in short IFEval and long HumanEval.

Hardware: Ciru, AMD Ryzen AI Max+395 / gfx1151, 128 GB unified memory, NixOS. The test uses the previously qualified one-slot profiles.

## Correctness

Scores are kept separate by task family. The panel was selected from historical Ornith disagreements and failures; its rates do not estimate general model quality. One native sample per short/long task, exactly two Hermes rounds, no answer repair.

| Build | Short IFEval strict | Short GSM8K | Short HumanEval | Long IFEval strict | Long GSM8K | Long HumanEval |
|---|---:|---:|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 5/8 | 8/8 | 5/6 | 2/2 | 2/2 | 2/4 |
| CIRU v3, MTP6 | 5/8 | 8/8 | 5/6 | 2/2 | 2/2 | 2/4 |
| Halo Vulkan, MTP3 | 6/8 | 8/8 | 5/6 | 2/2 | 2/2 | 3/4 |

| Build | Hermes native full passes / 12 | Native mean points / 100 | Reviewed end states / 12 | Short health, base + extended | Long health, base + extended |
|---|---:|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 7/12 | 80.83 | 11/12 | 10/10 + 10/10 | 8/8 + 8/8 |
| CIRU v3, MTP6 | 11/12 | 95.83 | 12/12 | 10/10 + 10/10 | 8/8 + 8/8 |
| Halo Vulkan, MTP3 | 11/12 | 95.83 | 12/12 | 10/10 + 10/10 | 8/8 + 8/8 |

Health cases are easy regression sentinels; passing them does not imply high general coding quality. Native Hermes grades and reviewed task end states are distinct. Raw native outcome flags are retained in the data; the reviewed column annotates demonstrated grader artifacts without changing native scores. See the reviewed partials below.

## Short-task speed

| Build | Entire scored short stage | API request wall sum | Output tokens | New prompt tokens/s | Generated tokens/s |
|---|---:|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 320.33s | 260.79s | 8,911 | 269.15 | 38.44 |
| CIRU v3, MTP6 | 320.85s | 260.45s | 9,311 | 350.34 | 39.09 |
| Halo Vulkan, MTP3 | 275.60s | 216.37s | 8,255 | 272.61 | 43.97 |

## Hermes agent speed and work

| Build | Round | Wall | Output tokens | API calls | New prompt tokens/s | Generated tokens/s | Reviewed end states |
|---|---:|---:|---:|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 1 | 352.55s | 6,933 | 34 | 285.20 | 35.21 | 6/6 |
| Previous CIRU, MTP6 | 2 | 395.46s | 8,963 | 37 | 264.48 | 35.62 | 5/6 |
| CIRU v3, MTP6 | 1 | 381.56s | 8,814 | 34 | 375.33 | 36.88 | 6/6 |
| CIRU v3, MTP6 | 2 | 316.01s | 7,246 | 33 | 364.35 | 37.45 | 6/6 |
| Halo Vulkan, MTP3 | 1 | 307.74s | 6,705 | 36 | 293.48 | 41.86 | 6/6 |
| Halo Vulkan, MTP3 | 2 | 300.38s | 7,380 | 35 | 282.75 | 41.78 | 6/6 |

A longer answer or extra tool work can increase wall time despite higher token throughput. Each round has fresh scenario state. The two repetitions expose variation; they do not establish a reliable failure probability.

## Shared long history

| Build | Seed prompt tokens | Seed wall | Seed prompt tokens/s | Long health wall | Long hard wall | Long hard output tokens | Long hard generation tokens/s |
|---|---:|---:|---:|---:|---:|---:|---:|
| Previous CIRU, MTP6 | 63,000 | 206.33s | 306.51 | 61.91s | 283.92s | 5,498 | 21.75 |
| CIRU v3, MTP6 | 63,000 | 162.80s | 388.50 | 40.67s | 161.90s | 5,090 | 35.93 |
| Halo Vulkan, MTP3 | 63,000 | 201.00s | 314.53 | 48.24s | 202.96s | 5,717 | 31.25 |

The same retained archive and task text were rendered with each served Qwen template/tokenizer. The physical server capacity is 262,144 tokens; the original long-workload boundary remains 65,536. Seeding is charged explicitly. These are returns to a shared history, not independently populated histories.

## Case-level agent outcomes

| Case | Previous R1 / R2 | V3 R1 / R2 | Halo R1 / R2 |
|---|---:|---:|---:|
| HA-02 | 100 / 50 | 100 / 100 | 100 / 50 |
| HA-08 | 100 / 100 | 100 / 100 | 100 / 100 |
| HA-10 | 100 / 100 | 100 / 100 | 100 / 100 |
| HA-11 | 50 / 50 | 100 / 50 | 100 / 100 |
| HA-12 | 100 / 100 | 100 / 100 | 100 / 100 |
| HA-19 | 85 / 35 | 100 / 100 | 100 / 100 |

## Reviewed partials and failures

- **Previous CIRU, MTP6, hermes-1, HA-11, native 50:** The model used a broad edit despite the request for a narrow patch. The required skill content and Verification section survived. The native action penalty remains.
- **Previous CIRU, MTP6, hermes-1, HA-19, native 85:** Deployment failed, was corrected, and succeeded within one shell tool call. The saved output and follow-up reads verify DEPLOY_OK and the release manifest. The native grader expects a later separate deployment call, so the 85-point result reflects command grouping. The native score remains unchanged.
- **Previous CIRU, MTP6, hermes-2, HA-19, native 35:** The first attempt failed because deploy.sh lacked executable permission. The harness then explicitly denied the chmod-and-deploy request. The model respected that denial and correctly reported that deployment was incomplete. The task end state was not achieved; respecting the denial was appropriate.
- **Previous CIRU, MTP6, hermes-2, HA-02, native 50:** All three facts were retained within the memory limit. The native grader at core.mjs:1010 only recognizes “not tag” or “not the tag”; the saved memory says “never tag”. This is a wording-matching artifact. The native score and outcome flag remain unchanged; the reviewed end state is successful.
- **CIRU v3, MTP6, hermes-2, HA-11, native 50:** The model used a broad edit despite the request for a narrow patch. The required skill content and Verification section survived. The native action penalty remains.
- **Halo Vulkan, MTP3, hermes-2, HA-02, native 50:** All three facts were retained within the memory limit. The native grader at core.mjs:1010 only recognizes “not tag” or “not the tag”; the saved memory says “never tag”. This is a wording-matching artifact. The native score and outcome flag remain unchanged; the reviewed end state is successful.

## Reproducibility and limits

- Runtime/model source identities, exact launch commands, samplers, templates, prompts, reasoning, native responses, tool traces, scoring decisions, and timings are retained with each run.
- Previous CIRU and v3 use the same weights. Their runtime and batch/ubatch profiles differ; this measures the complete promoted change. Halo uses its unchanged Vulkan source and published compatible Q8 head. Its larger Q4_K_XL model makes the external result a serving-package comparison.
- MTP depth is distinct from slot count: previous CIRU and v3 use depth 6; Halo uses depth 3. Every run has one server slot.
- Native short tasks retain temperature 0, seed 15035, no thinking, and a 32768-token output allowance. Hermes retains temperature 0.6, top-p 0.95, top-k 20, thinking enabled and full remaining context. Full settings are in protocol locks and actual requests.
- Native PP is newly processed prompt tokens divided by prompt phase seconds. TG follows both runtimes’ native convention: sum(output tokens minus one per request) divided by decode phase seconds. Wall throughput includes additional work and is separate.
- Short quality was split into a scored three-case smoke and the remaining nineteen cases. Each is counted once. Scorer startup/cleanup is included equally for all builds.
- Interrupted clarification captures and the canceled concurrency launch are preserved separately and excluded from this completed comparison. No reserve tasks or Ornith-specific BF16 token probes were consumed.
- Hermes SSE timing fields were normalized from the preserved raw responses after capture; original recorder summaries are retained. This required no new inference.

The original v3 release passed its existing gates before publication. This additional hard-panel test was requested afterward. Published v3 artifacts remain unchanged.

[GitHub v3 release](https://github.com/ciru-ai/Qwen3.8-Flash-CIRU-STRIX-IU4/releases/tag/v3.0.0) · [Hugging Face v3](https://huggingface.co/jcbtc/Qwen3.8-Flash-CIRU-STRIX-IU4/tree/v3.0.0)

Evidence checks passed: 81 new official speed rows, 24 official quality rows and 2,972 archived files verified by SHA-256. Raw evidence remains retained by the lab.

[Public structured results](v3-results.json) · [Research page](https://llm.ciru.ai/research/qwen38-v2/)
