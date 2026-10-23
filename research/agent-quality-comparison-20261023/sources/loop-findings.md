# Investigation of the Ornith and Flint loops

**The saved evidence does not establish a harness, environment or serving-configuration error that caused either loop to start. It does establish a harness containment defect: its automatic detector misses rephrased reasoning loops.** The separate monitor identified and stopped both. Model behavior versus a silent serving-runtime arithmetic/state bug remains unresolved; this investigation did not run a counterfactual generation or numerical replay.

This is a forensic investigation of Ornith request 32 and Flint request 67 from the sustained Export workflows. It uses the original requests, raw streams, tool receipts, filesystem/checkpoint history, backend logs, installed templates and publisher metadata. No new model generation, model download, service restart, GPU benchmark, live configuration change or failed-attempt regeneration occurred. CPU checks and small public metadata reads were sufficient for the findings below.

## Harness and environment

The audit checked all **99 requests** in these two trajectories. All **97 closed responses** decode exactly from their raw SSE, including reasoning, content, calls, finish reason and usage. Every request transition retains the exact preceding history and response; all **114 tool results** retain the correct call ID, command and JSON result. The only allowed additions are the frozen follow-up user requests. There is no duplicated-request/replayed-tool-result explanation in this evidence.

Each model kept one exact Docker sandbox ID across all its turns and pauses. `/tmp` and process state were retained; the harness did not recreate a container from a disk-only snapshot. No tool hit the 30-second timeout, returned an OOM-kill code or truncated output. Ornith initially supplied three forbidden absolute paths; it received clear relative-path feedback and corrected them in turn one. Those repaired errors precede the actual loop and are not an impossible-path block at its onset. Flint had no tool-interface exceptions.

The two stopped responses each have one upstream response ID, incremental deltas, no upstream error, no completed tool call and no final response. They were still emitting reasoning. This was neither a pending-tool deadlock nor duplicated cumulative SSE text. Serving logs show continued decode rather than an ongoing prefill stall. No GPU OOM, preemption or kernel-error event was found in the collected backend logs; that does not exclude silent numerical errors.

Flint's interrupted request processed **130,863 prompt tokens** and stopped at a logged total of **136,799**, with `truncated=0`, below the configured 262,144 window. Ornith's stopped request renders to **50,941 prompt tokens**, leaving substantial room. There is no observed context-exhaustion trigger. Long-history quality degradation remains possible even within configured capacity.

## The templates and samplers check out

Ornith's active `chat_template.jinja` is byte-identical to the publisher template at revision `10fbf86fed7ecee4a061f8b499a618f46001cac1`. CPU rendering/tokenization reproduces the recorded prompt counts for requests 1, 29, 30 and 31 exactly: **939, 36,917, 38,296 and 49,996**. At requests 30–32, all 29 nonempty reasoning messages from the first user turn remain in the rendered prompt. The generation suffix correctly opens thinking.

An initial suspicion was rejected: `tokenizer_config.json` contains an alternate fallback template that would drop older thinking unless `preserve_thinking` is set. The actual separate Jinja file overrides it. Its rendered request-30 count matches 38,296; the fallback would give 18,662. Consequently the request's unused `truncate_history_thinking` variable is **not evidence that the active Ornith prompt dropped history**. My earlier progress message called this a concrete mismatch too soon; the actual-render check disproved it.

Flint's embedded GGUF template is also byte-identical to the publisher's Jinja template at revision `2a247be0c0aec895ccb0ac7ca92229ec6df37288`. It retains both old and current reasoning in the CPU sentinel check. Its launcher sets `--reasoning-preserve`; the native renderer maps this to the applicable preservation variables. Publisher guidance explicitly calls for keeping returned reasoning in history. [Flint generation guidance](https://huggingface.co/RecursiveSI/flint#recommended-generation-settings).

The saved requests use positive-temperature sampling: Ornith **0.6 / top-p 0.95 / top-k 20**, and Flint **1.0 / 0.95 / 20**. Penalties are neutral, and the correct runtime-specific repetition-penalty names are used. A fixed seed is seeded sampling, not greedy. Ornith's startup generation-config warning describes defaults; explicit request values take precedence. Its logs also show random speculative-rejection sampler kernels. Ornith's general-use recommendation is 0.6; publisher benchmark reproduction uses 1.0. We used the former, so this was not a reproduction of that benchmark regime. [Ornith generation guidance](https://huggingface.co/ornith-ai/Ornith-1.5-35B-A3B#quickstart).

Ornith used its custom Ultra Q8 runtime with learned DFlash and hybrid/recurrent cache machinery. Flint used publisher-trained INT4/Q4_1, F16 KV and no speculative decoder. Both had prefix/cache facilities, but different inference stacks. Rechecked launcher/runtime identities match the recorded admission hashes. Matching identities and healthy logs do not prove numerical fidelity.

## What immediately preceded the loops

**Ornith:** tool 38 demonstrated that replacing an order deletes its credit, then failed because of an error in that small probe. Tool 39 corrected the probe and successfully demonstrated an in-place revision-safe UPSERT preserving the credit. That exact successful result reached request 32. The response then repeatedly reopened the same generation-policy decision without issuing a new probe or implementing a choice. There were feasible implementation choices; the environment had demonstrated the necessary SQLite feature. The task did not require an impossible command.

**Flint:** tool 23 saved `/tmp/exporter_fixed.py` during user turn one. Turn-two diffs at tools 33–35 already show how the working implementation had advanced beyond it. In turn four, tool 65 explicitly copied that old backup over `exporter.py`; tool 66 reapplied incident-specific changes but left earlier revision/edition fixes missing. Its test output visibly reported four regressions, and tools 74–75 confirmed the current implementation. Request 67 received all of that evidence, then repeatedly reconsidered the same stale-file chronology without acting. The old source came from its own successful copy command; no harness rollback is demonstrated.

Some Flint test commands piped output through `head` or `tail`, returning shell status zero while displaying unittest failures. This is ordinary shell pipeline behavior from its chosen commands. It weakens status-only verification, but the actual failures and subsequent source readback were available and investigated; it is not a missing-feedback explanation for the terminal loop.

These establish the observed failure mechanisms, not a causal separation of weights, quantization, inference arithmetic and prompt sensitivity.

## The proven harness weakness

Replaying both complete saved partial streams through the **unchanged original automatic guard** triggers no loop event. Each reaches the ordinary incomplete-stream check after exhausting the captured bytes. The guard detects exact character periods, heavily repeated 32-token windows and repeated action/result/workspace fingerprints. Both episodes repeatedly restated a decision in different wording while emitting no action, so those rules did not fire.

This is a containment failure. An automatic semantic-progress monitor is needed to implement the user's expectation that genuine loops are always stopped. It is separate from why the model entered the loop. The human-style operational monitor supplied that missing judgment here, and both trajectories are already terminal.

## What remains unresolved

The evidence supports **intact transport/history, preserved environment, feasible tools, correct active templates and supported sampling**. It supports **a deficient automatic loop guard**. It does not support saying either loop was conclusively caused by model weights alone, nor does it clear the custom runtimes of silent numerical/state errors.

The smallest useful next causal experiment would freeze the failed prompt and a short generated prefix, then compare next-token target distributions under one controlled change. For Ornith, first separate target-only generation from the existing learned-speculation/cache path while holding weights and prompt fixed. For Flint, compare the same trained INT4 values and prefix against a numerically qualified reference path. Comparing unrelated fresh answers or merely changing a seed would not isolate the cause. Such tests were not performed here; no hours-long rerun or broad sampling sweep was started.

The prior recommendation remains a provisional choice between the tested packages. These loop observations are operational failures; they should not be presented as isolated proof of intrinsic base-model weakness.

Evidence files beside this report: saved forensic audit (full archive; not included here), prompt render audit (full archive; not included here), Flint template comparison (full archive; not included here), automatic guard replay (full archive; not included here), trigger timeline (full archive; not included here), identity recheck (full archive; not included here).
