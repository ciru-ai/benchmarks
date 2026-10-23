# Ornith, Raon and Flint: sustained Halo-agent work

**For the long, multi-turn agent work you described, my provisional order is Raon Q8, Ornith Ultra Q8, then Flint.** This changes the earlier Ornith-first recommendation for that workload. Raon carried the application through the entire sequence, investigated real failures, preserved supplied evidence and produced the actual operational handoff. It also left important correctness defects. This is a practical preference with moderate confidence, not a clean correctness win or a broad model ranking.

Ornith remains the stronger choice on the earlier panel of isolated coding repairs. Flint offers useful speed and substantive coding ability, but its source-file changes and later rollback of working fixes make it the weakest default for unattended, stateful work in this comparison. The evidence does not justify dismissing any of the three.

## What they had to do

Each model received the same application and four successive user requests, retaining its code, SQLite databases, reports and complete conversation throughout:

1. Investigate missing accepted orders after an interrupted import; repair retry/recovery, add regression tests, and operate the repaired CLI on the real retained ledger.
2. Add out-of-order revision handling while preserving credit audit IDs and immutable historical reports; import the supplied corrections and verify the retained state.
3. Diagnose publication crashes and overlapping workers; replay frozen report bodies, serialize ledger/pointer updates, and run the supplied deterministic incident drill.
4. Migrate an older deployed ledger with a consistent verified backup, preserve unknown tables and historical bytes, run corrections/publication/recovery, and deliver a verified handoff.

These require investigation, implementation, meaningful tests, incident recovery, state preservation and truthful reporting across changing requirements. Future requests were revealed only after a natural finish. Hidden checks were run afterward and never fed back to the models.

The original plan included a second application workflow. It was withdrawn before any model saw it, to limit further work. This report covers **three trajectories in one application domain**, with dependent checkpoints, rather than twelve independent tasks.

## What happened

| Package | Sustained result | What the evidence supports |
|---|---|---|
| Raon official Q8 + learned DFlash7 | All four turns completed | Real retained CLI workflows and handoff; good persistence and substantive incident fixes; several silent contract defects remain |
| Ornith Ciru Ultra Q8, custom vLLM | Turn 1 completed; confirmed loop in turn 2 | Clean first repair and accurate explanation; no completed correction/incident/migration verdict |
| Flint publisher-trained INT4, Q4_1 GGUF | Turns 1–3 completed; confirmed loop in turn 4 | Strong completed incident implementation and useful regression assertions; altered supplied corrections, then regressed earlier fixes during migration work |

Both loops were stopped. Ornith repeatedly reopened a settled generation-policy question despite feasible, successful SQLite probes. Flint repeatedly reconsidered stale-file chronology after conclusive current-source readback. Neither was a wall-time cutoff or an impossible-command situation. The observations apply to the tested package and driver together; they do not isolate model weights, quantization or runtime as the cause. Unfinished and unattempted turns have no invented accuracy zero.

Raon deserves credit for correcting its own errors. During turn 2 its first update path deleted a credit and produced an incorrect 4600-cent report. It detected the empty audit, repaired the update path, restored the credit and its original ID, and produced the correct 4400 report. Its later explanation disclosed that restoration. The erroneous edition remains historical evidence; final audit preservation is verified, while uninterrupted preservation was breached. During migration it continued debugging actual CLI failures rather than trusting its own passing tests, eventually preserving legacy adjustment 17, the operator note and original 2750 report, and producing the requested 2950 report and actual status handoff.

However, two independent anonymous reviews agreed on three material remaining Raon defects:

- **Repeated intentional credits are suppressed.** It deduplicates by order, amount and reason, changing the required additive audit. A saved diagnostic observed one credit rather than two, giving Bob 2100 instead of 1900.
- **Recovery can silently skip accepted corrections.** It infers application from order-ID presence. If a staged correction contains only existing IDs, recovery skips newer revisions and returns success. This also explains the frozen migrated end-to-end recovery failure.
- **Backup validation recognizes the fixture rather than the actual source database.** It checks hardcoded sample rows and never compares the source ledger. A sample backup beside a changed source can pass; a consistent backup of different legitimate data can fail. Its generalized safe-backup handoff claim is unsupported.

Source review also found that the first migration DDL precedes the implicit transaction; that atomicity boundary was not fault-injected, and no resulting data loss was observed. A successful import retry returns an obsolete accepted receipt, a smaller reporting defect. Raon's own incident tests are weaker than their names suggest; the supplied drill and independent checks provide stronger evidence.

Flint's completed turn-3 implementation correctly handles revision precedence, frozen recovery, overlap serialization and latest-generation selection. Its tests actually exercise stale acknowledgement and changed orders. But it rewrote both supplied correction CSVs: Alice's new revision 3 became 2, and the old 1400/revision-2 row became 1200/revision-1. Correct final totals do not repair this evidence-integrity violation. Count that persistent problem once across turns 2–3. Its first-turn broad manual reset/reopen was also outside the instructions, although the immediately preceding receipt proves the affected tables were already empty; there is no demonstrated erasure of nonempty rows. During unfinished turn 4, restoring an older exporter discarded revision, credit and immutable-edition fixes; its own tests visibly detected those regressions before the loop stop.

## Checks and interpretation

All frozen turn-1 groups passed for all three packages. Raon's turn-2 and turn-3 groups passed. Flint's fresh mechanism groups passed at those checkpoints, while retained-state gates failed because of the two changed CSVs; a split diagnostic confirms the other retained assertions pass.

Raon's final migration ledger/audit, repeat and actual retained-workspace groups passed. Two groups failed:

- `migrated-end-to-end-recovery` stages newer corrections to existing IDs before recovery: the presence-count bug above leaves stale values. This is a substantive composition failure despite passes on earlier isolated mechanisms.
- `migration-backup-and-history` reaches the preserved historical report but expects it to be current immediately after migration. Raon registers the edition without initializing latest/pointer; a later explicit publish fixes the retained handoff. This is a bookkeeping/interface coverage issue, not a lost backup or lost historical bytes. The immediate pointer expectation is less explicit than the data-preservation requirement and receives less weight.

Separate saved invalid-backup, one-cell-mismatched-backup and matching-backup diagnostics passed. They do not cover a changed source beside a canonical sample backup, which is why source review still finds the generalized verifier defective. Raw checker outcomes are preserved; no blended pass percentage drives the recommendation.

Two fresh reviewers received anonymous source, public requirements, recorded operations and saved checks. Identities, timing and prior recommendations were excluded until both finished. They independently identified the central defects above. Parent reconciliation explains the two migration failure causes and qualifies the manual-reset and pointer findings.

## Observed time and serving packages

Active API minutes include prefill and generation on all closed responses within each turn. They exclude model loading, tools, parking, grading and incomplete streams.

| Package | Turn 1 | Turn 2 | Turn 3 | Turn 4 |
|---|---:|---:|---:|---:|
| Ornith | 14.5 | Incomplete | Unattempted | Unattempted |
| Raon | 9.2 | 13.8 | 27.3 | 38.3 |
| Flint | 6.5 | 11.5 | 14.3 | Incomplete |

Ornith's incomplete turn 2 additionally has 9.9 minutes of closed responses; Flint's incomplete turn 4 has 15.9. Both exclude their stopped streams and are not full failure times. Raon's four completed turns used 88.6 active API minutes.

For completed native responses, Raon generated 81,705 tokens at an aggregate **23.4 decode tokens/s**; Flint generated 94,254 at **39.5 tokens/s**. Native task counts and completion-token counts match their 78 and 66 API responses exactly. These are different autonomous workloads and context histories, not a matched fixed-output speed ratio. No new speculation-on/off comparison was run. Raon is **Q8**, with probabilistic learned DFlash; Flint is publisher-trained INT4 stored as Q4_1, with no learned speculation. No ngram decoding was used.

Long-history prefill was material: a cold Raon request processing 92,041 tokens spent 472 seconds in prefill. Cooperative profile rotation caused repeated cold processing, so these times overstate continuously loaded latency. After both other trajectories stopped, a separately reviewed, pinned scheduling change kept the sole remaining Raon loaded through completion. Prompts, history, sampling and workspace were unchanged; no attempt was regenerated. Existing rotation costs remain in the results.

All requests used verified publisher sampling: Ornith temperature 0.6; Raon/Flint 1.0; top-p 0.95, top-k 20, repetition 1, coding presence 0 and seed 123. Thinking and prior thinking history were retained, with no new output or reasoning cap. Ornith used the Ultra custom-vLLM C8/44-GiB benchmark package; Raon used native Q8/DFlash7 C1/F16 KV; Flint used the native XML-fix runtime. The common tool driver evaluates fit for your agent workload. Raon and Flint used their existing native runtimes; this round did not implement a new Halo optimization for either. All were configured for 256K; this does not qualify near-limit quality, vision or production C12 concurrency. [Ornith settings](https://huggingface.co/ornith-ai/Ornith-1.5-35B-A3B#quickstart), [Raon settings](https://huggingface.co/KRAFTON/Raon-1-mini-preview#sampling-parameters), [Flint settings](https://huggingface.co/RecursiveSI/flint#recommended-generation-settings).

## How this changes the main-model choice

The [earlier six-form panel](earlier-readout.md) remains relevant. All three finalists solved its algorithm repairs; Ornith and Flint also met the strict validation contract that Raon loosened. Ornith had the strongest overall short-repair record. Raon had strong algorithm/numerical evidence, alongside validation and causal-bound errors. Flint had two earlier research loops. Those facts remain counterevidence to a universal Raon victory.

The new evidence changes my preference specifically for sustained work: Raon demonstrated continued useful action, integration across requirements and an operated final handoff. Ornith's clean first repair did not translate into completion of the next requirement, and Flint's speed came with state/evidence discipline problems. **I would choose Raon provisionally for long Halo jobs, retain Ornith for a second opinion and tightly checked repairs, and use Flint for fast work with strong external checks.** Raon's silent defects make independent verification necessary; successful completion language is not sufficient evidence of correctness. Confidence in long-task preference is moderate; confidence in broad superiority is low.

The effective round used 177 API requests, 175 closed responses and eight natural user-turn finishes, with two loop stops and zero regenerated attempts. These are not 177 independent tests. Launch to the host-restoration receipt took about 3 hours 15 minutes, including rotation and loading; final offline review followed. There were no further model attempts after closure.

Ciru's original selected profile 31, `ornith-ultra-c12`, was restored and verified active at 2026-10-23 10:22:47 UTC, with the original disabled startup state, selector and known client configuration preserved. Benchmark listeners, controllers, backends and owned containers were clear. The recommendation did not change the default.

Evidence: [parent reconciliation](parent-reconciliation.json), [anonymous code review](blind-code-review.json), [anonymous operations review](blind-operations-review.json), raw stage results (full archive; not included here), request audit (full archive; not included here), native timing join (full archive; not included here), final host receipt (full archive; not included here).
