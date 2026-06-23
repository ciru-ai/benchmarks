#!/usr/bin/env python3
"""Convert MTP serving lab JSONL summaries into benchmark-store rows.

The benchv2 site already renders /home/crown/bench-results/llama/mtp-server
as a separate serving lab, but those rows also represent real served MTP
throughput. This script emits aggregate pp/tg rows that can be imported through
the llama benchmark hash-chain store.
"""

from __future__ import annotations

import argparse
import collections
import json
import math
import os
import re
import statistics
import subprocess
import sys
from pathlib import Path


DEFAULT_ROOT = Path("/home/crown/bench-results/llama/mtp-server")
DEFAULT_OUT_DIR = Path("/home/crown/bench-results/llama")
DEFAULT_JSONL = DEFAULT_OUT_DIR / "mtp-server-derived-benchmark-rows.jsonl"
LLAMA_BENCHMARK = Path("/home/crown/.codex/skills/llama-benchmark/scripts/llama_benchmark.py")


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def parse_metric_text(text: str | None) -> dict[str, float]:
    out = {}
    if not text:
        return out
    for line in str(text).splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 2:
            try:
                out[parts[0]] = float(parts[1])
            except ValueError:
                pass
    return out


def compact_stddev(values: list[float]) -> float | None:
    vals = [float(v) for v in values if isinstance(v, (int, float)) and math.isfinite(float(v))]
    if len(vals) < 2:
        return None
    return statistics.stdev(vals)


def mean(values: list[float]) -> float | None:
    vals = [float(v) for v in values if isinstance(v, (int, float)) and math.isfinite(float(v))]
    if not vals:
        return None
    return statistics.mean(vals)


def first_int(*values) -> int | None:
    for value in values:
        if value is None:
            continue
        try:
            return int(float(value))
        except (TypeError, ValueError):
            continue
    return None


def timestamp_from_path(path: Path) -> str | None:
    match = re.search(r"(\d{8}T\d{6}Z)", str(path))
    return match.group(1) if match else None


def command_arg(command: list, *names: str) -> str | None:
    for index, value in enumerate(command):
        if value in names and index + 1 < len(command):
            return str(command[index + 1])
    return None


def command_flag(command: list, *names: str) -> bool:
    return any(value in names for value in command)


def numeric_bytes(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def aggregate_group(file_path: Path, label: str, config_id: str | None, group: list[dict]) -> list[dict]:
    prompt_tps = []
    decode_tps = []
    prompt_tokens = []
    predicted_tokens = []
    total_ms = []
    ttfp_ms = []
    acceptance = []

    for row in group:
        if row.get("error"):
            continue
        metrics = parse_metric_text(row.get("after_metrics"))
        pt = metrics.get("llamacpp:prompt_tokens_total") or row.get("tokens_evaluated")
        ps = metrics.get("llamacpp:prompt_seconds_total")
        gt = metrics.get("llamacpp:tokens_predicted_total") or row.get("tokens_predicted")
        gs = metrics.get("llamacpp:tokens_predicted_seconds_total")
        if pt:
            prompt_tokens.append(float(pt))
        if gt:
            predicted_tokens.append(float(gt))
        if pt and ps:
            prompt_tps.append(float(pt) / float(ps))
        if gt and gs:
            decode_tps.append(float(gt) / float(gs))
        if row.get("total_ms") is not None:
            total_ms.append(float(row["total_ms"]))
        if row.get("ttfp_ms") is not None:
            ttfp_ms.append(float(row["ttfp_ms"]))
        acc = (row.get("acceptance") or {}).get("accept_rate")
        if isinstance(acc, (int, float)) and math.isfinite(float(acc)):
            acceptance.append(float(acc))

    if not prompt_tps and not decode_tps:
        return []

    sample = group[0]
    settings = sample.get("settings") or {}
    memory = sample.get("memory") or {}
    command = sample.get("cmd") or []
    ctx = first_int(settings.get("target_prompt_tokens"), settings.get("prompt_token_estimate"), sample.get("ctx"))
    gen = first_int(mean(predicted_tokens), settings.get("gen"), sample.get("tokens_predicted"))
    timestamp = max([r.get("timestamp_utc") for r in group if r.get("timestamp_utc")] or [timestamp_from_path(file_path)])
    config_suffix = config_id or "none"
    base_label = f"mtp-server-{label}-{config_suffix}"
    command_text = " ".join(str(part) for part in command) if command else None
    model = sample.get("model") or command_arg(command, "-m", "--model")
    server_bin = sample.get("server_bin") or (command[0] if command else None)
    split_mode = command_arg(command, "-sm", "--split-mode")
    ngl = command_arg(command, "-ngl", "--gpu-layers", "--n-gpu-layers")
    try:
        ngl = int(ngl) if ngl and str(ngl).isdigit() else None
    except ValueError:
        ngl = None

    common = {
        "kind": "llama-server-api",
        "timestamp_utc": timestamp,
        "ctx": ctx,
        "gen": gen,
        "model": model,
        "model_size_bytes": sample.get("model_size_bytes"),
        "backend": "Vulkan" if "vulkan" in str(server_bin or "").lower() or "Vulkan0" in command else ("ROCm" if "ROCm0" in command else None),
        "type_k": settings.get("cache_k"),
        "type_v": settings.get("cache_v"),
        "batch": settings.get("batch"),
        "ubatch": settings.get("ubatch"),
        "threads": settings.get("threads"),
        "ngl": ngl,
        "split_mode": split_mode,
        "flash_attn": command_flag(command, "-fa", "--flash-attn"),
        "repetitions": len(group),
        "peak_vram_used_bytes": numeric_bytes(memory.get("peak_vram_used_bytes")),
        "peak_gtt_used_bytes": numeric_bytes(memory.get("peak_gtt_used_bytes")),
        "peak_sys_used_bytes": numeric_bytes(memory.get("peak_ram_used_bytes")),
        "source_path": str(file_path),
        "raw_output": str(file_path),
        "samples": str(file_path),
        "bench_bin": server_bin,
        "command": command_text,
        "metadata_quality": "full",
        "matrix": "mtp-server-derived",
        "source_kind": "mtp-server-results-jsonl",
        "source_label": label,
        "config_id": config_id,
        "settings": settings,
        "acceptance": {
            "accept_rate": mean(acceptance),
            "draft_n": (sample.get("acceptance") or {}).get("draft_n"),
            "draft_n_accepted": (sample.get("acceptance") or {}).get("draft_n_accepted"),
        },
        "total_ms_mean": mean(total_ms),
        "ttfp_ms_mean": mean(ttfp_ms),
        "prompt_tokens_mean": mean(prompt_tokens),
        "predicted_tokens_mean": mean(predicted_tokens),
    }

    out = []
    if prompt_tps:
        row = dict(common)
        row.update({
            "label": f"{base_label}-pp",
            "mode": "pp",
            "avg_tps": mean(prompt_tps),
            "stddev_tps": compact_stddev(prompt_tps),
            "metric_source": "llamacpp:prompt_tokens_total / llamacpp:prompt_seconds_total",
        })
        out.append(row)
    if decode_tps:
        row = dict(common)
        row.update({
            "label": f"{base_label}-tg",
            "mode": "tg",
            "avg_tps": mean(decode_tps),
            "stddev_tps": compact_stddev(decode_tps),
            "ttfp_ms": mean(ttfp_ms),
            "metric_source": "llamacpp:tokens_predicted_total / llamacpp:tokens_predicted_seconds_total",
        })
        out.append(row)
    return out


def build_rows(root: Path) -> list[dict]:
    out = []
    for file_path in sorted(root.glob("*/results.jsonl")):
        rows = read_jsonl(file_path)
        grouped = collections.defaultdict(list)
        for row in rows:
            grouped[(row.get("label"), row.get("config_id"))].append(row)
        for (label, config_id), group in sorted(grouped.items()):
            if label:
                out.extend(aggregate_group(file_path, label, config_id, group))
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--jsonl", type=Path, default=DEFAULT_JSONL)
    parser.add_argument("--no-import", action="store_true")
    args = parser.parse_args()

    rows = build_rows(args.root)
    args.jsonl.parent.mkdir(parents=True, exist_ok=True)
    with args.jsonl.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, sort_keys=True) + "\n")

    result = {"jsonl": str(args.jsonl), "rows": len(rows)}
    if not args.no_import:
        proc = subprocess.run(
            [sys.executable, str(LLAMA_BENCHMARK), "import-jsonl", "--jsonl", str(args.jsonl), "--out-dir", str(args.out_dir)],
            check=False,
            text=True,
            capture_output=True,
        )
        result["import_returncode"] = proc.returncode
        result["import_stdout"] = proc.stdout
        result["import_stderr"] = proc.stderr
        print(json.dumps(result, indent=2, sort_keys=True))
        return proc.returncode

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
