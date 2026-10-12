# Tom Turney Expert Optimization saves ROCmFPX

Separate Ciru research page based on the original Strix Showdown's measured task replay. The new page uses Tom Turney's supplied portrait, links to his X profile, and compares the saved original HC-Q8 build, October 12 Tom-configured build, Ciru IU4 v5, Gufo, and Halogen's newest 0.17.1 stock run.

Serve this directory over HTTP. All comparison data and ECharts are local. Google Fonts is optional; system fallbacks remain usable. `data/comparison.json` is the frozen page input, `data/measurements.csv` exports plotted metrics, and `data/source-manifest.json` records source hashes. `build_data.py` rebuilds it within the benchmark workspace from preserved receipts, without inference.

The race reuses the original requestAnimationFrame approach, task-duration interpolation, checkpoint buttons, play/pause, restart, finish, scrub and playback speed controls. Its default is TC70–84 first-pass replay. Hermes replays the first preserved pass for four measured stacks; the newest Halogen Hermes panel stays unmeasured. Individual tool calls have no interpolated timestamps.

These are historical stack observations, not a strict controlled ranking. Halogen's newest stock 84-case hard subset has a different protocol and history from the standalone 15-case test. Its five-pass native PP/TG timings are kept separate from cold-prefill and HE0–9. Runtime/version, sampling mode, run dates, coverage, preserved failures and harness corrections are visible on the page. No results or model inference were repeated to create this site.

Portrait: user-supplied original, byte-preserved. Existing publisher marks: copied from the original dashboard. Snake motif: custom SVG inspired by the public handle. This is a Ciru research page honoring Tom's work.
