import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pageDir = path.resolve(__dirname, "..");
const dataDir = path.join(pageDir, "data");

const sshHost = process.env.BENCHV2_SSH_HOST || "crown@192.168.0.238";
const sshKey = process.env.BENCHV2_SSH_KEY || path.join(process.env.USERPROFILE || "", ".ssh", "id_ed25519");

const remoteScript = String.raw`
import collections
import glob
import json
import math
import os
import re
import sqlite3
import statistics
import time
from datetime import datetime, timezone

DB = "/home/crown/bench-results/llama/results.sqlite3"
LEDGER = "/home/crown/bench-results/llama/results.ledger.jsonl"

def gib(value):
    if value is None:
        return None
    try:
        return round(float(value) / 1073741824.0, 3)
    except Exception:
        return None

def safe_json(text):
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        return {}

def mean(values):
    values = [v for v in values if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)]
    return round(statistics.mean(values), 3) if values else None

def p95(values):
    values = sorted(v for v in values if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v))
    if not values:
        return None
    idx = min(len(values) - 1, math.ceil(len(values) * 0.95) - 1)
    return round(values[idx], 3)

def compact_path(value):
    if not value:
        return None
    value = str(value)
    for marker in ("/srv/llm/models/", "/srv/llm/projects/", "/home/crown/bench-results/", "/srv/llm/runs/"):
        if marker in value:
            return value[value.index(marker):]
    return value

CANONICAL_MODEL_NAMES = {
    "Qwen3.6-35B-A3B-HaloStrix-Dyn-MTP-v7": "Qwen3.6-35B-A3B-Crown-Dyn-MTP",
}

def model_name(model):
    if not model:
        return "Unknown model"
    model = str(model)
    name = os.path.basename(model)
    if name.endswith(".gguf"):
        name = name[:-5]
    if re.search(r"-00001-of-\d+$", name):
        parent = os.path.basename(os.path.dirname(model))
        if parent:
            name = parent
    name = CANONICAL_MODEL_NAMES.get(name, name)
    return name.replace("_", " ")

def family_for(text):
    low = (text or "").lower()
    if "chadrock" in low or "ace-saber" in low or "ace_saber" in low:
        return "Chadrock"
    if "qwen3-coder-next" in low:
        return "Qwen Coder Next"
    if "qwen3-coder-30b" in low or "qwen3-coder" in low:
        return "Qwen Coder"
    if "qwen2.5-coder" in low:
        return "Qwen2.5 Coder"
    if "qwen3.6" in low or "qwen36" in low:
        if "halostrix-dyn-mtp-v7" in low or "crown-dyn-mtp" in low or "crown-halo-mtp-dynamic" in low:
            return "Qwen3.6 Crown MTP"
        if "dynamic" in low or "dyn" in low or "halostrix" in low or "crown-v7" in low:
            return "Qwen3.6 Strix"
        if "mtp" in low:
            return "Qwen3.6 MTP"
        return "Qwen3.6"
    if "lfm2.5" in low or "lfm25" in low:
        return "Liquid"
    if "nex-n2" in low:
        return "Nex"
    if "step-3.7" in low or "step3.7" in low or "step37" in low:
        return "StepFun"
    if "ornstein" in low:
        return "Ornstein"
    if "qwopus" in low:
        return "Qwopus"
    if "gemma" in low:
        return "Gemma"
    if "hermes" in low:
        return "Hermes Agent"
    if "carnice" in low:
        return "Carnice"
    if "mistral" in low or "devstral" in low:
        return "Mistral"
    if "nemotron" in low:
        return "Nemotron"
    if "glm" in low:
        return "GLM"
    if "llama" in low:
        return "Llama"
    if "deepseek" in low:
        return "DeepSeek"
    if "phi" in low:
        return "Phi"
    if "medpsy" in low:
        return "MedPsy"
    return "Other"

def tier_for(model, model_params):
    params = None
    if model_params:
        params = float(model_params) / 1_000_000_000.0
    else:
        m = re.search(r"(\d+(?:\.\d+)?)\s*[bB]", model or "")
        if m:
            params = float(m.group(1))
    if params is None:
        return "Unknown"
    if params <= 10:
        return "Compact"
    if params < 60:
        return "Large"
    return "Flagship"

def row_from_db(row):
    rj = safe_json(row["row_json"])
    sq = safe_json(row["settings_json"])
    model = row["model"]
    return {
        "seq": row["seq"],
        "timestamp": row["timestamp_utc"],
        "label": row["label"],
        "kind": row["kind"],
        "mode": row["mode"],
        "ctx": row["ctx"],
        "gen": row["gen"],
        "tps": round(row["avg_tps"], 3) if row["avg_tps"] is not None else None,
        "stddev": round(row["stddev_tps"], 3) if row["stddev_tps"] is not None else None,
        "ttfpMs": round(row["ttfp_ms"], 3) if row["ttfp_ms"] is not None else None,
        "model": compact_path(model),
        "modelName": model_name(model),
        "modelType": row["model_type"],
        "modelSizeGiB": gib(row["model_size_bytes"]),
        "modelParamsB": round(row["model_params"] / 1_000_000_000.0, 2) if row["model_params"] else None,
        "family": family_for((model or "") + " " + (row["label"] or "")),
        "tier": tier_for(model or row["label"] or "", row["model_params"]),
        "backend": row["backend"],
        "kv": "/".join([v for v in [row["type_k"], row["type_v"]] if v]) or None,
        "batch": row["batch"],
        "ubatch": row["ubatch"],
        "threads": row["threads"],
        "ngl": row["ngl"],
        "splitMode": row["split_mode"],
        "flashAttn": row["flash_attn"],
        "repetitions": row["repetitions"],
        "buildNumber": row["build_number"],
        "buildCommit": row["build_commit"],
        "vramGiB": gib(row["peak_vram_used_bytes"] or row["peak_gpu_used_bytes"]),
        "gttGiB": gib(row["peak_gtt_used_bytes"]),
        "sysGiB": gib(row["peak_sys_used_bytes"]),
        "sourcePath": compact_path(row["source_path"] or row["raw_output"]),
        "rawOutput": compact_path(row["raw_output"]),
        "samples": compact_path(row["samples"]),
        "metadataQuality": rj.get("metadata_quality"),
        "matrix": sq.get("matrix") or rj.get("matrix"),
    }

def fetch_rows(cur, view):
    sql = f"""
    SELECT b.seq,b.timestamp_utc,b.label,b.kind,b.mode,b.ctx,b.gen,b.avg_tps,b.stddev_tps,b.ttfp_ms,
           b.model,b.model_type,b.model_size_bytes,b.model_params,b.backend,b.type_k,b.type_v,
           b.batch,b.ubatch,b.threads,b.ngl,b.split_mode,b.flash_attn,b.repetitions,
           b.build_number,b.build_commit,b.peak_vram_used_bytes,b.peak_gtt_used_bytes,
           b.peak_gpu_used_bytes,b.peak_sys_used_bytes,b.source_path,b.raw_output,b.samples,
           b.settings_json,b.row_json
    FROM benchmark_rows b
    WHERE b.seq IN (SELECT seq FROM {view})
    ORDER BY b.seq
    """
    return [row_from_db(row) for row in cur.execute(sql)]

def parse_metric_text(text):
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
            except Exception:
                pass
    return out

def read_jsonl(path):
    rows = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    except FileNotFoundError:
        pass
    return rows

def summarize_api_rows(cur):
    rows = []
    sql = """
    SELECT seq,timestamp_utc,label,kind,gen,ttfp_ms,peak_vram_used_bytes,peak_gtt_used_bytes,
           peak_sys_used_bytes,row_json,raw_output,samples
    FROM benchmark_rows
    WHERE kind='llama-server-api'
    ORDER BY seq
    """
    for row in cur.execute(sql):
        rj = safe_json(row["row_json"])
        mem = rj.get("memory") or {}
        timings = rj.get("timings") or {}
        rows.append({
            "seq": row["seq"],
            "timestamp": row["timestamp_utc"],
            "label": row["label"],
            "gen": row["gen"] or rj.get("gen"),
            "totalMs": round(rj.get("total_ms"), 3) if isinstance(rj.get("total_ms"), (int, float)) else None,
            "ttfpMs": round(row["ttfp_ms"], 3) if row["ttfp_ms"] is not None else None,
            "promptBytes": rj.get("prompt_bytes"),
            "promptFile": compact_path(rj.get("prompt_file")),
            "responseChars": rj.get("response_chars"),
            "tokensPredicted": rj.get("tokens_predicted") or timings.get("predicted_n"),
            "vramGiB": gib(row["peak_vram_used_bytes"] or mem.get("peak_vram_used_bytes")),
            "gttGiB": gib(row["peak_gtt_used_bytes"] or mem.get("peak_gtt_used_bytes")),
            "sysGiB": gib(row["peak_sys_used_bytes"] or mem.get("peak_ram_used_bytes")),
            "rawOutput": compact_path(row["raw_output"] or rj.get("raw_output")),
            "samples": compact_path(row["samples"] or rj.get("samples")),
        })
    return rows

def summarize_mtp_server():
    entries = []
    files = sorted(glob.glob("/home/crown/bench-results/llama/mtp-server/*/results.jsonl"))
    for file_path in files:
        rows = read_jsonl(file_path)
        grouped = collections.defaultdict(list)
        for row in rows:
            grouped[(row.get("label"), row.get("config_id"))].append(row)
        for (label, config), group in grouped.items():
            accept = [((r.get("acceptance") or {}).get("accept_rate")) for r in group]
            prompt_tps = []
            decode_tps = []
            prompt_tokens = []
            predicted_tokens = []
            for r in group:
                metrics = parse_metric_text(r.get("after_metrics"))
                pt = metrics.get("llamacpp:prompt_tokens_total") or r.get("tokens_evaluated")
                ps = metrics.get("llamacpp:prompt_seconds_total")
                gt = metrics.get("llamacpp:tokens_predicted_total") or r.get("tokens_predicted")
                gs = metrics.get("llamacpp:tokens_predicted_seconds_total")
                if pt:
                    prompt_tokens.append(pt)
                if gt:
                    predicted_tokens.append(gt)
                if pt and ps:
                    prompt_tps.append(pt / ps)
                if gt and gs:
                    decode_tps.append(gt / gs)
            sample = group[0] if group else {}
            settings = sample.get("settings") or {}
            mem = sample.get("memory") or {}
            entries.append({
                "label": label,
                "configId": config,
                "file": compact_path(file_path),
                "rows": len(group),
                "avgTotalMs": mean([r.get("total_ms") for r in group]),
                "p95TotalMs": p95([r.get("total_ms") for r in group]),
                "acceptRate": mean(accept),
                "promptTokens": round(mean(prompt_tokens), 1) if prompt_tokens else None,
                "predictedTokens": round(mean(predicted_tokens), 1) if predicted_tokens else None,
                "promptTps": mean(prompt_tps),
                "decodeTps": mean(decode_tps),
                "draftN": (sample.get("acceptance") or {}).get("draft_n"),
                "draftAccepted": (sample.get("acceptance") or {}).get("draft_n_accepted"),
                "ctx": settings.get("ctx") or settings.get("ctx_size") or sample.get("ctx"),
                "model": compact_path(sample.get("model")),
                "modelName": model_name(sample.get("model")),
                "vramGiB": gib(mem.get("peak_vram_used_bytes")),
                "gttGiB": gib(mem.get("peak_gtt_used_bytes")),
                "sysGiB": gib(mem.get("peak_ram_used_bytes")),
                "errorCount": sum(1 for r in group if r.get("error")),
            })
    return entries

def summarize_aux_eval():
    path = "/home/crown/bench-results/hermes-aux-eval/results.jsonl"
    rows = read_jsonl(path)
    by_candidate = collections.defaultdict(list)
    by_run = collections.defaultdict(int)
    for row in rows:
        by_candidate[row.get("candidate") or "unknown"].append(row)
        by_run[row.get("run_id") or "unknown"] += 1
    candidates = []
    categories = []
    def infrastructure_invalid(row):
        error = str(row.get("error") or "").lower()
        failures = " ".join(str(x).lower() for x in (row.get("failures") or []))
        text = f"{error} {failures}"
        infra_needles = (
            "timed out", "timeout", "server", "harness", "config", "launch",
            "connection", "refused", "oom", "out of memory", "no slot",
            "failed to load", "not loaded", "vulkan device", "compiled without"
        )
        if any(needle in text for needle in infra_needles):
            return True
        if row.get("error") and (row.get("total_ms") is None or row.get("ttfp_ms") is None or row.get("output_chars") in (None, 0)):
            return True
        return False

    def invalid_reason(row):
        if row.get("error"):
            return str(row.get("error"))
        for failure in row.get("failures") or []:
            low = str(failure).lower()
            if "timed out" in low or "timeout" in low:
                return "timed out"
            if "config" in low:
                return "config"
            if "harness" in low:
                return "harness"
        return "infrastructure"

    for candidate, group in sorted(by_candidate.items()):
        scores = [r.get("score") for r in group]
        total_ms = [r.get("total_ms") for r in group]
        ttfp_ms = [r.get("ttfp_ms") for r in group]
        cats = collections.defaultdict(list)
        failures = collections.Counter()
        for r in group:
            cats[r.get("category") or "uncategorized"].append(r)
            for failure in r.get("failures") or []:
                failures[str(failure).split(":")[0]] += 1
        cat_summary = {}
        for cat, crs in cats.items():
            invalid = [r for r in crs if infrastructure_invalid(r)]
            scored = [r for r in crs if not infrastructure_invalid(r)]
            invalid_reasons = collections.Counter(invalid_reason(r) for r in invalid)
            cat_summary[cat] = {
                "rows": len(crs),
                "passRate": round(sum(1 for r in crs if r.get("pass")) / len(crs), 3) if crs else None,
                "avgScore": mean([r.get("score") for r in crs]),
                "avgTotalMs": mean([r.get("total_ms") for r in crs]),
                "scoredRows": len(scored),
                "invalidRows": len(invalid),
                "adjustedPassRate": round(sum(1 for r in scored if r.get("pass")) / len(scored), 3) if scored else None,
                "adjustedAvgScore": mean([r.get("score") for r in scored]),
                "adjustedAvgTotalMs": mean([r.get("total_ms") for r in scored]),
                "invalidReasons": [{"reason": k, "count": v} for k, v in invalid_reasons.most_common(5)],
            }
            categories.append({
                "candidate": candidate,
                "category": cat,
                **cat_summary[cat],
            })
        sample = group[0] if group else {}
        candidates.append({
            "candidate": candidate,
            "rows": len(group),
            "passRate": round(sum(1 for r in group if r.get("pass")) / len(group), 3) if group else None,
            "avgScore": mean(scores),
            "avgTotalMs": mean(total_ms),
            "p95TotalMs": p95(total_ms),
            "avgTtfpMs": mean(ttfp_ms),
            "p95TtfpMs": p95(ttfp_ms),
            "ctx": sample.get("ctx"),
            "kv": "/".join([v for v in [sample.get("cache_k"), sample.get("cache_v")] if v]) or None,
            "parallel": sample.get("parallel"),
            "model": compact_path(sample.get("model")),
            "modelName": model_name(sample.get("model")),
            "sizeClass": sample.get("size_class"),
            "categories": cat_summary,
            "topFailures": [{"failure": k, "count": v} for k, v in failures.most_common(5)],
        })
    return {
        "path": compact_path(path),
        "rows": len(rows),
        "runCount": len(by_run),
        "candidateCount": len(by_candidate),
        "candidates": candidates,
        "categories": categories,
        "runs": [{"runId": k, "rows": v} for k, v in sorted(by_run.items())],
    }

def summarize_loadouts():
    path = "/home/crown/bench-results/hermes-aux-loadout/loadout-results.jsonl"
    rows = read_jsonl(path)
    out = []
    for row in rows:
        servers = []
        for server in row.get("servers") or []:
            servers.append({
                "role": server.get("role"),
                "candidate": server.get("candidate"),
                "parallel": server.get("parallel"),
                "ctx": server.get("slot_ctx") or server.get("total_ctx"),
                "kv": "/".join([v for v in [server.get("cache_k"), server.get("cache_v")] if v]) or None,
                "model": compact_path(server.get("model")),
            })
        out.append({
            "runId": row.get("run_id"),
            "loadout": row.get("loadout"),
            "description": row.get("description"),
            "rows": row.get("rows"),
            "mainRows": row.get("main_rows"),
            "auxRows": row.get("aux_rows"),
            "mainPassRate": row.get("main_pass_rate"),
            "auxPassRate": row.get("aux_pass_rate"),
            "mainAvgScore": row.get("main_avg_score"),
            "auxAvgScore": row.get("aux_avg_score"),
            "mainAvgTotalMs": row.get("main_avg_total_ms"),
            "auxAvgTotalMs": row.get("aux_avg_total_ms"),
            "mainAvgTtfpMs": row.get("main_avg_ttfp_ms"),
            "auxAvgTtfpMs": row.get("aux_avg_ttfp_ms"),
            "p95TotalMs": row.get("p95_total_ms"),
            "peakVramGiB": gib(row.get("peak_vram_used_bytes")),
            "servers": servers,
        })
    return {"path": compact_path(path), "rows": len(rows), "loadouts": out}

CODING_LAB_ROOT = "/srv/ssd/p3700ba/data/llm-benchmarking-lab/runs"
QUALITY_DB = "/srv/ssd/p3700ba/data/llm-benchmarking-lab/quality-results.sqlite3"

PROFILE_LABELS = {
    "qwen3-coder-next-q4-k-l": "Qwen3 Coder Next Q4_K_L",
    "qwen3-coder-next-q6-k-l": "Qwen3 Coder Next Q6_K_L",
    "qwen3.6-27b-ud-q8-k-xl": "Qwen3.6 27B UD Q8_K_XL",
    "qwen3.6-35b-a3b-crown-halo-mtp-dynamic": "Qwen3.6 35B A3B Crown Dyn MTP",
    "qwen36-35b-a3b-crown-halo-mtp-dynamic": "Qwen3.6 35B A3B Crown Dyn MTP",
    "nemotron3-nano-omni-30b-a3b-reasoning-ud-q6-k-xl": "Nemotron 3 Nano Omni 30B A3B UD Q6_K_XL",
    "gemma4-26b-a4b-it-q4-km-mtp": "Gemma 4 26B A4B Q4_K_M MTP",
    "gemma4-31b-it-q4-km-mtp": "Gemma 4 31B IT Q4_K_M MTP",
    "gemma4-31b-q4-dflash-q8": "Gemma 4 31B DFlash Q8",
    "gemma4-31b-q4-dflash-q8-full-ctx32768": "Gemma 4 31B DFlash Q8 32k",
    "qwopus3.6-27b-v2-q5-k-m": "Qwopus3.6 27B v2 Q5_K_M",
    "qwopus3.6-35b-a3b-v1-q5-k-m": "Qwopus3.6 35B A3B v1 Q5_K_M",
    "chadrock-qwen36-27b-mtp-rocmfp4-strix-lean": "Chadrock Qwen3.6 27B MTP ROCmFP4",
    "chadrock-qwen36-35b-ace-saber-rocmfp4-rebuilt-reasonoff": "Chadrock 35B ACE/SABER ROCmFP4",
    "chadrock-qwen36-35b-ace-saber-rocmfp4-qwen-nonthinking-docsampler": "Chadrock 35B ACE/SABER ROCmFP4 Docsampler",
    "CHADROCK3.6-35B-UNCENSORED-MTP-STRIX-LEAN": "Chadrock3.6 35B Uncensored MTP",
    "qwopus3.6-27b-v2-chadrock-strix-lean-mtp": "Qwopus3.6 27B v2 Chadrock Lean MTP",
    "lfm25-8b-a1b-q8": "LFM2.5 8B A1B Q8",
    "step3.7-flash-q3kl": "Step-3.7 Flash Q3_K_L",
    "nex-n2-mini-q4-k-xl": "Nex N2 Mini Q4_K_XL",
    "nex-n2-mini-q5-k-xl": "Nex N2 Mini Q5_K_XL",
    "nex-n2-mini-q6-k-xl": "Nex N2 Mini Q6_K_XL",
}

SUITE_LABELS = {
    "humaneval": "HumanEval+",
    "mbpp": "MBPP+",
    "bigcodebench_hard": "BigCodeBench-Hard",
    "bigcodebench-hard-instruct": "BigCodeBench-Hard",
    "release_latest-codegeneration-2025-01-01": "LiveCodeBench 2025-01",
    "swebench-lite-dev": "SWE-bench Lite Dev",
    "official-20": "HermesAgent-20",
    "aggregate": "Aggregate",
    "bfcl-v4-all_scoring": "BFCL v4 all scoring",
    "bfcl-v4-non_live": "BFCL v4 non-live",
    "bfcl-v4-non_live_irrelevance": "BFCL irrelevance",
    "bfcl-v4-non_live_multiple": "BFCL multiple",
    "bfcl-v4-non_live_parallel": "BFCL parallel",
    "bfcl-v4-non_live_parallel_multiple": "BFCL parallel multiple",
    "bfcl-v4-non_live_simple": "BFCL simple",
    "bfcl-v4-non_live_simple_java": "BFCL simple Java",
    "bfcl-v4-non_live_simple_javascript": "BFCL simple JavaScript",
    "bfcl-v4-non_live_simple_python": "BFCL simple Python",
}

def title_from_slug(value):
    words = re.sub(r"^\d{8}T\d{6}Z-", "", str(value or "")).replace("-", " ").split()
    return " ".join(word.upper() if word in ("mtp", "q8", "q6", "q5", "q4") else word.capitalize() for word in words)

def run_created_utc(run_id):
    m = re.match(r"(\d{8})T(\d{6})Z", str(run_id or ""))
    if not m:
        return None
    date, tm = m.groups()
    return f"{date[:4]}-{date[4:6]}-{date[6:8]}T{tm[:2]}:{tm[2:4]}:{tm[4:6]}Z"

def suite_from_summary_file(value):
    parts = str(value or "").split("/")
    for part in reversed(parts):
        if part in SUITE_LABELS:
            return part
    return "unknown"

def parse_elapsed_seconds(text):
    if not text:
        return None
    matches = re.findall(r"(\d+):(\d{2}):(\d{2})", text)
    if not matches:
        return None
    hours, minutes, seconds = [int(v) for v in matches[-1]]
    elapsed = hours * 3600 + minutes * 60 + seconds
    if elapsed == 0 and "resuming" in text.lower():
        return None
    return elapsed

def public_profile_label(profile_id):
    return PROFILE_LABELS.get(profile_id, title_from_slug(profile_id))

def profile_quant(profile_id):
    text = str(profile_id or "").lower()
    patterns = [
        ("q4-k-l", "Q4_K_L"), ("q6-k-l", "Q6_K_L"), ("q8-k-xl", "Q8_K_XL"),
        ("q6-k-xl", "Q6_K_XL"), ("q5-k-xl", "Q5_K_XL"), ("q4-k-xl", "Q4_K_XL"),
        ("q5-k-m", "Q5_K_M"), ("q4-km", "Q4_K_M"),
        ("q4-k-m", "Q4_K_M"), ("iq3", "IQ3"), ("bf16", "BF16")
    ]
    for needle, label in patterns:
        if needle in text:
            return label
    return None

def profile_size_class(profile_id):
    m = re.search(r"(\d+(?:\.\d+)?)b", str(profile_id or ""), re.I)
    if not m:
        return None
    params = float(m.group(1))
    if params <= 10:
        return "Compact"
    if params < 60:
        return "Large"
    return "Flagship"

def score_label(score_name):
    return {
        "pass@1_plus": "pass@1+",
        "pass@1": "pass@1",
        "non_live_overall_acc": "overall accuracy",
        "irrelevance_detection_acc": "irrelevance",
        "multiple_ast_acc": "multiple AST",
        "parallel_ast_acc": "parallel AST",
        "parallel_multiple_ast_acc": "parallel multiple AST",
        "simple_ast_acc": "simple AST",
        "java_simple_ast_acc": "Java simple AST",
        "javascript_simple_ast_acc": "JavaScript simple AST",
        "python_simple_ast_acc": "Python simple AST",
        "accuracy": "accuracy",
        "resolved": "resolved",
        "avg_score": "average score",
        "category_score": "category score",
        "scenario_score": "scenario score",
    }.get(score_name, title_from_slug(score_name))

HERMES_AGENT_SCENARIOS = {
    "HA-01": {"title": "Replace Contradictory Memory", "category": "Memory & Recall"},
    "HA-02": {"title": "Memory Near Capacity", "category": "Memory & Recall"},
    "HA-03": {"title": "Reject Malicious Memory Injection", "category": "Memory & Recall"},
    "HA-04": {"title": "Recall A Prior Fix And Reuse It", "category": "Memory & Recall"},
    "HA-05": {"title": "Fix A Real Failing Test", "category": "Workspace Orchestration"},
    "HA-06": {"title": "Background Process Management", "category": "Workspace Orchestration"},
    "HA-07": {"title": "Programmatic Tool Chaining With execute_code", "category": "Workspace Orchestration"},
    "HA-08": {"title": "Browser Automation On A Local Fixture Site", "category": "Workspace Orchestration"},
    "HA-09": {"title": "Create A Skill From Completed Work", "category": "Skills & Procedural Memory"},
    "HA-10": {"title": "Discover And Apply An Existing Skill", "category": "Skills & Procedural Memory"},
    "HA-11": {"title": "Patch A Skill, Don't Rewrite It", "category": "Skills & Procedural Memory"},
    "HA-12": {"title": "Manage Skill Supporting Files", "category": "Skills & Procedural Memory"},
    "HA-13": {"title": "Create A Cron Job", "category": "Scheduling & Delivery"},
    "HA-14": {"title": "Update An Existing Cron Job", "category": "Scheduling & Delivery"},
    "HA-15": {"title": "Trigger A Cron Run And Verify Delivery", "category": "Scheduling & Delivery"},
    "HA-16": {"title": "Send A Cross-Platform Message To A Specific Target", "category": "Scheduling & Delivery"},
    "HA-17": {"title": "Parallel Delegation", "category": "Delegation, Recovery & Boundaries"},
    "HA-18": {"title": "Approval-Gated Destructive Command", "category": "Delegation, Recovery & Boundaries"},
    "HA-19": {"title": "Recover From A Tool Failure And Retry Correctly", "category": "Delegation, Recovery & Boundaries"},
    "HA-20": {"title": "Clarify An Ambiguous Destructive Request", "category": "Delegation, Recovery & Boundaries"},
}

def hermes_score_parts(details):
    details = details if isinstance(details, dict) else {}
    return {
        "outcomeScore": details.get("outcomeScore"),
        "nativeUseScore": details.get("nativeUseScore"),
        "safetyScore": details.get("safetyScore"),
    }

def summarize_hermes_agent_scenarios(agent_rows):
    rows = []
    category_rows = []
    for agent_row in agent_rows:
        source_path = agent_row.get("sourcePath")
        if not source_path or not os.path.exists(source_path):
            continue
        try:
            with open(source_path, "r", encoding="utf-8") as f:
                summary = json.load(f)
        except Exception:
            continue
        result_map = summary.get("resultsByModel") or {}
        results = result_map.get(agent_row["profileId"])
        if results is None and len(result_map) == 1:
            results = next(iter(result_map.values()))
        if not isinstance(results, list):
            continue
        score_data = (summary.get("scores") or {}).get(agent_row["profileId"]) or {}
        for category in score_data.get("categories") or []:
            if not isinstance(category, dict):
                continue
            category_rows.append({
                "runId": agent_row["runId"],
                "profileId": agent_row["profileId"],
                "profile": agent_row["profile"],
                "categoryId": category.get("id"),
                "category": category.get("label") or title_from_slug(category.get("id")),
                "score": round(float(category.get("score")) / 100.0, 6) if isinstance(category.get("score"), (int, float)) else None,
                "weight": category.get("weight"),
            })
        for item in results:
            if not isinstance(item, dict):
                continue
            scenario_id = item.get("scenarioId")
            scenario = HERMES_AGENT_SCENARIOS.get(scenario_id, {})
            verifier = item.get("verifier") if isinstance(item.get("verifier"), dict) else {}
            details = verifier.get("details") if isinstance(verifier.get("details"), dict) else {}
            timings = item.get("timings") if isinstance(item.get("timings"), dict) else {}
            duration_ms = timings.get("durationMs")
            score = item.get("score")
            rows.append({
                "runId": agent_row["runId"],
                "createdUtc": agent_row["createdUtc"],
                "profileId": agent_row["profileId"],
                "profile": agent_row["profile"],
                "scenarioId": scenario_id,
                "scenarioTitle": scenario.get("title") or title_from_slug(scenario_id),
                "category": scenario.get("category") or "HermesAgent-20",
                "status": item.get("status"),
                "verifierStatus": verifier.get("status"),
                "score": round(float(score) / 100.0, 6) if isinstance(score, (int, float)) else None,
                "scoreRaw": score,
                "summary": item.get("summary"),
                "verifierSummary": verifier.get("summary"),
                "durationS": round(float(duration_ms) / 1000.0, 3) if isinstance(duration_ms, (int, float)) else None,
                **hermes_score_parts(details),
            })
    return sorted(rows, key=lambda row: (row["scenarioId"] or "", row["profile"] or "")), sorted(category_rows, key=lambda row: (row["category"] or "", row["profile"] or ""))

def completed_quality_score(row):
    invalid_run_ids = {
        # First HermesAgent-20 local sweep used the backend without the required
        # local bearer token. Hermes exited after HTTP 401, producing uniform
        # harness failures rather than model-quality results.
        "20260605T043425Z-hermesagent20-chadrock3-6-35b-uncensored-mtp-strix-lean",
        "20260605T043456Z-hermesagent20-lfm25-8b-a1b-q8",
        "20260605T043526Z-hermesagent20-q36-27b-chadrock-heretic",
        "20260605T043559Z-hermesagent20-qwen3-5-9b-q4-km",
        "20260605T043629Z-hermesagent20-qwen3-6-27b-mtp-chadrock-rocmfp4-strix-lean",
        "20260605T043704Z-hermesagent20-qwen3-6-35b-a3b-ace-saber-rocmfp4-vulkan-d2",
        "20260605T043743Z-hermesagent20-qwen3-6-35b-a3b-crown-halo-mtp-dynamic",
        "20260605T043818Z-hermesagent20-qwen3-6-35b-a3b-dynamic-strix",
        "20260605T043925Z-hermesagent20-qwen3-6-35b-a3b-mtp-chadrock-rocmfp4-strix-lean",
        "20260605T044001Z-hermesagent20-qwopus3-6-27b-v2-chadrock-strix-lean-mtp",
        "20260605T044103Z-hermesagent20-chadrock3-6-35b-uncensored-mtp-rocm-q4fast",
        # Superseded HA-07 repair used diagnostic max_tokens=4096. Keep it out
        # of public official rows; the official-settings repair is 20260609T035738Z.
        "20260609T024454Z-hermesagent20-qwen3-6-35b-a3b-mtp-chadrock-rocmfp4-strix-lean-repaired-official20",
    }
    if row["run_id"] in invalid_run_ids:
        return False
    try:
        score = float(row["score_value"])
    except Exception:
        return False
    if not math.isfinite(score):
        return False
    if row["benchmark_family"] == "run_manifest":
        return False
    if row["benchmark_family"] == "evalplus":
        if row["row_kind"] not in ("dataset", "aggregate"):
            return False
        if not row["tasks"] or int(row["tasks"] or 0) < 100 or row["plus_pass"] is None or row["base_pass"] is None:
            return False
    if row["benchmark_family"] in ("bigcodebench", "livecodebench"):
        if row["tasks"] is None or int(row["tasks"] or 0) < 100:
            return False
    if row["benchmark_family"] == "mini-swe-agent":
        if row["tasks"] is None or int(row["tasks"] or 0) <= 0:
            return False
    if row["benchmark_family"] == "hermesagent-20":
        if row["row_kind"] != "aggregate" or row["suite"] != "official-20":
            return False
        if row["tasks"] is None or int(row["tasks"] or 0) < 20:
            return False
        source_path = row["source_path"]
        try:
            summary = json.load(open(source_path, "r", encoding="utf-8")) if source_path else {}
            result_lists = (summary.get("resultsByModel") or {}).values()
        except Exception:
            result_lists = []
        for results in result_lists:
            if not isinstance(results, list):
                continue
            for result in results:
                if (
                    isinstance(result, dict)
                    and result.get("summary") == "Scenario execution failed."
                    and "fetch failed" in str(result.get("note") or "")
                ):
                    return False
    return True

def quality_row_public(row):
    score = float(row["score_value"])
    profile_id = row["profile_id"]
    suite = row["suite"]
    return {
        "seq": row["seq"],
        "runId": row["run_id"],
        "createdUtc": run_created_utc(row["run_id"]) or row["timestamp_utc"],
        "timestamp": row["timestamp_utc"],
        "benchmarkFamily": row["benchmark_family"],
        "suite": suite,
        "suiteLabel": SUITE_LABELS.get(suite, title_from_slug(suite)),
        "rowKind": row["row_kind"],
        "profileId": profile_id,
        "profile": public_profile_label(profile_id),
        "family": family_for(profile_id),
        "quant": profile_quant(profile_id),
        "sizeClass": profile_size_class(profile_id),
        "tasks": row["tasks"],
        "scoreName": row["score_name"],
        "scoreLabel": score_label(row["score_name"]),
        "score": round(score, 6),
        "basePass": row["base_pass"],
        "plusPass": row["plus_pass"],
        "baseRate": round(row["base_rate"], 6) if row["base_rate"] is not None else None,
        "plusRate": round(row["plus_rate"], 6) if row["plus_rate"] is not None else None,
        "prefillTokS": round(row["prefill_tok_s"], 3) if row["prefill_tok_s"] is not None else None,
        "generationSeconds": round(row["generation_seconds"], 3) if row["generation_seconds"] is not None else None,
        "generationTokS": round(row["generation_tok_s"], 3) if row["generation_tok_s"] is not None else None,
        "totalRuntimeS": round(row["total_runtime_s"], 3) if row["total_runtime_s"] is not None else None,
        "activeSamples": row["active_samples"],
        "peakPromptTps": round(row["peak_prompt_tps"], 3) if row["peak_prompt_tps"] is not None else None,
        "peakPredictedTps": round(row["peak_predicted_tps"], 3) if row["peak_predicted_tps"] is not None else None,
        "model": compact_path(row["model_path"]),
        "sourcePath": compact_path(row["source_path"]),
    }

def quality_rows_from_db():
    if not os.path.exists(QUALITY_DB):
        return [], 0
    conn = sqlite3.connect(QUALITY_DB)
    conn.row_factory = sqlite3.Row
    try:
        all_rows = list(conn.execute("""
            SELECT seq, run_id, timestamp_utc, benchmark_family, suite, row_kind, profile_id,
                   tasks, score_name, score_value, base_pass, plus_pass, base_rate, plus_rate,
                   prefill_tok_s, generation_tok_s, total_runtime_s, generation_seconds,
                   active_samples, peak_prompt_tps, peak_predicted_tps, model_path, source_path, row_json
            FROM quality_result_rows
            ORDER BY seq
        """))
    finally:
        conn.close()

    deduped = {}
    excluded = 0
    for row in all_rows:
        if not completed_quality_score(row):
            excluded += 1
            continue
        key = (
            row["run_id"], row["profile_id"], row["benchmark_family"], row["suite"],
            row["row_kind"], row["score_name"], row["source_path"] or "",
        )
        if key not in deduped or (row["seq"] or 0) > (deduped[key]["seq"] or 0):
            deduped[key] = row
    return [quality_row_public(row) for row in sorted(deduped.values(), key=lambda item: item["seq"] or 0)], excluded

def summarize_quality_suites():
    rows, excluded = quality_rows_from_db()
    if not rows:
        return {
            "meta": {
                "sourcePath": compact_path(QUALITY_DB),
                "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "rowCount": 0,
                "profileCount": 0,
                "runCount": 0,
                "excludedRows": excluded,
                "latestTimestamp": None,
            },
            "rows": [],
            "codingRows": [],
            "bfclRows": [],
            "agentRows": [],
            "leaderRows": [],
        }

    speed_metric_rows = {}
    for row in rows:
        suite = row.get("suite") or ""
        if row["benchmarkFamily"] == "bigcodebench-manifest" and suite.endswith("-metrics"):
            speed_metric_rows[(row["profileId"], suite[:-8])] = row

    coding_families = {"evalplus", "bigcodebench", "livecodebench", "mini-swe-agent"}
    coding_rows = [
        dict(row) for row in rows
        if row["benchmarkFamily"] in coding_families
        and not (row["benchmarkFamily"] == "evalplus" and row["suite"] not in ("aggregate", "humaneval", "mbpp"))
    ]
    for row in coding_rows:
        metrics = speed_metric_rows.get((row["profileId"], row["suite"]))
        if not metrics:
            continue
        for key in ("prefillTokS", "generationTokS", "peakPromptTps", "peakPredictedTps"):
            if row.get(key) is None and metrics.get(key) is not None:
                row[key] = metrics[key]
    bfcl_rows = [row for row in rows if row["benchmarkFamily"] == "bfcl"]
    agent_rows = [
        row for row in rows
        if row["benchmarkFamily"] == "hermesagent-20"
        and row["rowKind"] == "aggregate"
        and row["suite"] == "official-20"
    ]
    agent_scenario_rows, agent_category_rows = summarize_hermes_agent_scenarios(agent_rows)

    latest_by_profile_suite = {}
    for row in coding_rows:
        key = (row["profileId"], row["benchmarkFamily"], row["suite"], row["scoreName"])
        if key not in latest_by_profile_suite or (row.get("createdUtc") or "") >= (latest_by_profile_suite[key].get("createdUtc") or ""):
            latest_by_profile_suite[key] = row

    headline_priority = {
        ("evalplus", "aggregate"): 0,
        ("evalplus", "humaneval"): 1,
        ("evalplus", "mbpp"): 2,
        ("livecodebench", "release_latest-codegeneration-2025-01-01"): 3,
        ("bigcodebench", "bigcodebench-hard-instruct"): 4,
        ("mini-swe-agent", "swebench-lite-dev"): 5,
    }
    leader_rows = sorted(latest_by_profile_suite.values(), key=lambda row: (
        headline_priority.get((row["benchmarkFamily"], row["suite"]), 99),
        -(row["score"] if row["score"] is not None else -1),
        row["profile"],
    ))

    return {
        "meta": {
            "sourcePath": compact_path(QUALITY_DB),
            "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "rowCount": len(coding_rows),
            "allCompletedRowCount": len(rows),
            "profileCount": len({row["profileId"] for row in rows}),
            "runCount": len({row["runId"] for row in rows}),
            "excludedRows": excluded,
            "latestTimestamp": max([row.get("timestamp") or row.get("createdUtc") for row in rows if row.get("timestamp") or row.get("createdUtc")] or [None]),
        },
        "rows": coding_rows,
        "codingRows": coding_rows,
        "bfclRows": sorted(bfcl_rows, key=lambda row: (row["profile"], row["suite"])),
        "agentRows": sorted(agent_rows, key=lambda row: (row["profile"], row["suite"])),
        "agentScenarioRows": agent_scenario_rows,
        "agentCategoryRows": agent_category_rows,
        "leaderRows": leader_rows,
    }

def summarize_coding_lab_from_quality_db():
    rows, _excluded = quality_rows_from_db()
    if not rows:
        return None

    coding_rows = []
    for row in rows:
        if row["benchmarkFamily"] == "evalplus" and row["rowKind"] == "dataset" and row["suite"] in ("humaneval", "mbpp"):
            pass
        elif row["benchmarkFamily"] == "bigcodebench" and row["suite"] == "bigcodebench-hard-instruct":
            row = dict(row)
            row["suite"] = "bigcodebench_hard"
            row["suiteLabel"] = SUITE_LABELS["bigcodebench_hard"]
        else:
            continue
        if not row.get("tasks") or row.get("plusPass") is None:
            continue
        coding_rows.append({
            "runId": row["runId"],
            "runLabel": title_from_slug(row["runId"]),
            "createdUtc": row["createdUtc"],
            "profileId": row["profileId"],
            "profile": row["profile"],
            "family": row["family"],
            "suite": row["suite"],
            "suiteLabel": row["suiteLabel"],
            "tasks": row["tasks"],
            "basePass": row["basePass"],
            "plusPass": row["plusPass"],
            "baseRate": round(row["baseRate"], 4) if row["baseRate"] is not None else row["score"],
            "plusRate": round(row["plusRate"], 4) if row["plusRate"] is not None else row["score"],
            "elapsedSeconds": row["generationSeconds"],
            "samplesPerMinute": round(row["tasks"] * 60 / row["generationSeconds"], 3) if row.get("tasks") and row.get("generationSeconds") else None,
        })

    if not coding_rows:
        return None

    runs_by_id = {}
    for row in coding_rows:
        run = runs_by_id.setdefault(row["runId"], {
            "runId": row["runId"],
            "label": title_from_slug(row["runId"]),
            "createdUtc": row["createdUtc"],
            "profiles": set(),
            "rows": 0,
            "tasks": 0,
            "hasLiveMetrics": False,
        })
        run["profiles"].add(row["profileId"])
        run["rows"] += 1
        run["tasks"] += row["tasks"] or 0

    runs = []
    for run in runs_by_id.values():
        runs.append({
            **run,
            "profiles": len(run["profiles"]),
        })

    profiles_by_key = {}
    for row in coding_rows:
        key = (row["runId"], row["profileId"])
        profile = profiles_by_key.setdefault(key, {
            "runId": row["runId"],
            "runLabel": row["runLabel"],
            "createdUtc": row["createdUtc"],
            "profileId": row["profileId"],
            "profile": row["profile"],
            "family": row["family"],
            "quant": profile_quant(row["profileId"]),
            "sizeClass": profile_size_class(row["profileId"]),
            "tasks": 0,
            "basePass": 0,
            "plusPass": 0,
            "suites": [],
            "speedTasks": 0,
            "codegenSeconds": 0,
            "speedCoverage": 0,
            "liveMetrics": None,
        })
        profile["tasks"] += row["tasks"] or 0
        profile["basePass"] += row["basePass"] or 0
        profile["plusPass"] += row["plusPass"] or 0
        profile["suites"].append({
            "suite": row["suite"],
            "suiteLabel": row["suiteLabel"],
            "tasks": row["tasks"],
            "basePass": row["basePass"],
            "plusPass": row["plusPass"],
            "baseRate": row["baseRate"],
            "plusRate": row["plusRate"],
            "elapsedSeconds": row["elapsedSeconds"],
            "samplesPerMinute": row["samplesPerMinute"],
        })
        if row["elapsedSeconds"]:
            profile["speedTasks"] += row["tasks"] or 0
            profile["codegenSeconds"] += row["elapsedSeconds"]
            profile["speedCoverage"] += 1

    profile_runs = []
    for profile in profiles_by_key.values():
        tasks = profile["tasks"]
        profile["baseRate"] = round(profile["basePass"] / tasks, 4) if tasks else None
        profile["plusRate"] = round(profile["plusPass"] / tasks, 4) if tasks else None
        profile["samplesPerMinute"] = round(profile["speedTasks"] * 60 / profile["codegenSeconds"], 3) if profile["speedTasks"] and profile["codegenSeconds"] else None
        profile_runs.append(profile)

    latest_row_by_profile_suite = {}
    for row in sorted(coding_rows, key=lambda item: (item.get("createdUtc") or "", item.get("tasks") or 0)):
        latest_row_by_profile_suite[(row["profileId"], row["suite"])] = row

    profiles_by_profile = {}
    for row in latest_row_by_profile_suite.values():
        profile = profiles_by_profile.setdefault(row["profileId"], {
            "runId": row["runId"],
            "runLabel": row["runLabel"],
            "createdUtc": row["createdUtc"],
            "profileId": row["profileId"],
            "profile": row["profile"],
            "family": row["family"],
            "quant": profile_quant(row["profileId"]),
            "sizeClass": profile_size_class(row["profileId"]),
            "tasks": 0,
            "basePass": 0,
            "plusPass": 0,
            "suites": [],
            "speedTasks": 0,
            "codegenSeconds": 0,
            "speedCoverage": 0,
            "liveMetrics": None,
        })
        if (row.get("createdUtc") or "") >= (profile.get("createdUtc") or ""):
            profile["runId"] = row["runId"]
            profile["runLabel"] = row["runLabel"]
            profile["createdUtc"] = row["createdUtc"]
        profile["tasks"] += row["tasks"] or 0
        profile["basePass"] += row["basePass"] or 0
        profile["plusPass"] += row["plusPass"] or 0
        profile["suites"].append({
            "suite": row["suite"],
            "suiteLabel": row["suiteLabel"],
            "tasks": row["tasks"],
            "basePass": row["basePass"],
            "plusPass": row["plusPass"],
            "baseRate": row["baseRate"],
            "plusRate": row["plusRate"],
            "elapsedSeconds": row["elapsedSeconds"],
            "samplesPerMinute": row["samplesPerMinute"],
        })
        if row["elapsedSeconds"]:
            profile["speedTasks"] += row["tasks"] or 0
            profile["codegenSeconds"] += row["elapsedSeconds"]
            profile["speedCoverage"] += 1

    for profile in profiles_by_profile.values():
        tasks = profile["tasks"]
        profile["baseRate"] = round(profile["basePass"] / tasks, 4) if tasks else None
        profile["plusRate"] = round(profile["plusPass"] / tasks, 4) if tasks else None
        profile["samplesPerMinute"] = round(profile["speedTasks"] * 60 / profile["codegenSeconds"], 3) if profile["speedTasks"] and profile["codegenSeconds"] else None

    profiles = sorted(profiles_by_profile.values(), key=lambda item: (
        item.get("plusRate") if item.get("plusRate") is not None else -1,
        item.get("baseRate") if item.get("baseRate") is not None else -1,
        item.get("samplesPerMinute") if item.get("samplesPerMinute") is not None else -1,
    ), reverse=True)

    return {
        "meta": {
            "sourceHost": "ciru",
            "sourcePath": compact_path(QUALITY_DB),
            "suite": "Completed EvalPlus HumanEval+, MBPP+, and BigCodeBench-Hard rows",
            "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "runCount": len(runs),
            "profileCount": len(profiles),
            "rowCount": len(coding_rows),
            "latestRunUtc": max([r["createdUtc"] for r in runs if r.get("createdUtc")] or [None]),
        },
        "runs": sorted(runs, key=lambda item: item.get("createdUtc") or ""),
        "profiles": profiles,
        "profileRuns": sorted(profile_runs, key=lambda item: (item.get("createdUtc") or "", item.get("profile") or "")),
        "rows": coding_rows,
    }

def summarize_coding_lab():
    quality_summary = summarize_coding_lab_from_quality_db()
    if quality_summary:
        return quality_summary

    run_dirs = sorted(glob.glob(os.path.join(CODING_LAB_ROOT, "*")))
    rows = []
    runs = []
    metrics_by_run_profile = {}
    min_representative_tasks = 100

    for run_dir in run_dirs:
        if not os.path.isdir(run_dir):
            continue
        run_id = os.path.basename(run_dir)
        summary_path = os.path.join(run_dir, "outputs", "evalplus", "summary.json")
        run_rows = []

        if os.path.exists(summary_path):
            try:
                summary_rows = json.load(open(summary_path, "r", encoding="utf-8"))
            except Exception:
                summary_rows = []
        else:
            summary_rows = []

        metrics_path = os.path.join(run_dir, "outputs", "metrics", "summary.json")
        if os.path.exists(metrics_path):
            try:
                for metric in json.load(open(metrics_path, "r", encoding="utf-8")):
                    metrics_by_run_profile[(run_id, metric.get("profile_id"))] = metric
            except Exception:
                pass

        for row in summary_rows:
            profile_id = row.get("profile_id")
            suite = suite_from_summary_file(row.get("file"))
            log_path = os.path.join(run_dir, "logs", "evalplus", profile_id or "", f"{suite}-codegen.log")
            elapsed = None
            if os.path.exists(log_path):
                try:
                    elapsed = parse_elapsed_seconds(open(log_path, "r", encoding="utf-8", errors="replace").read())
                except Exception:
                    elapsed = None
            tasks = row.get("tasks") or 0
            if tasks < min_representative_tasks:
                continue
            if not isinstance(row.get("base_pass"), (int, float)) or not isinstance(row.get("plus_pass"), (int, float)):
                continue
            run_rows.append({
                "runId": run_id,
                "runLabel": title_from_slug(run_id),
                "createdUtc": run_created_utc(run_id),
                "profileId": profile_id,
                "profile": public_profile_label(profile_id),
                "family": family_for(profile_id),
                "suite": suite,
                "suiteLabel": SUITE_LABELS.get(suite, title_from_slug(suite)),
                "tasks": tasks,
                "basePass": row.get("base_pass"),
                "plusPass": row.get("plus_pass"),
                "baseRate": round(row.get("base_rate"), 4) if isinstance(row.get("base_rate"), (int, float)) else None,
                "plusRate": round(row.get("plus_rate"), 4) if isinstance(row.get("plus_rate"), (int, float)) else None,
                "elapsedSeconds": elapsed,
                "samplesPerMinute": round(tasks * 60 / elapsed, 3) if tasks and elapsed else None,
            })

        for score_path in sorted(glob.glob(os.path.join(run_dir, "outputs", "bigcodebench", "*_pass_at_k.json"))):
            try:
                score = json.load(open(score_path, "r", encoding="utf-8"))
            except Exception:
                continue
            model_id = score.get("model") or os.path.basename(score_path).split("--")[0]
            profile_id = str(model_id).split("--")[0]
            eval_path = score_path.replace("_pass_at_k.json", "_eval_results.json")
            tasks = 0
            if os.path.exists(eval_path):
                try:
                    eval_payload = json.load(open(eval_path, "r", encoding="utf-8"))
                    tasks = len((eval_payload.get("eval") or {}).keys())
                except Exception:
                    tasks = 0
            if not tasks:
                tasks = 148 if score.get("subset") == "hard" else 0
            if tasks < min_representative_tasks or not isinstance(score.get("pass@1"), (int, float)):
                continue
            passed = int(round(score.get("pass@1") * tasks))
            suite = "bigcodebench_hard"
            run_rows.append({
                "runId": run_id,
                "runLabel": title_from_slug(run_id),
                "createdUtc": run_created_utc(run_id),
                "profileId": profile_id,
                "profile": public_profile_label(profile_id),
                "family": family_for(profile_id),
                "suite": suite,
                "suiteLabel": SUITE_LABELS.get(suite, "BigCodeBench-Hard"),
                "tasks": tasks,
                "basePass": passed,
                "plusPass": passed,
                "baseRate": round(score.get("pass@1"), 4),
                "plusRate": round(score.get("pass@1"), 4),
                "elapsedSeconds": None,
                "samplesPerMinute": None,
            })

        if not run_rows:
            continue

        profile_ids = sorted({row.get("profileId") for row in run_rows if row.get("profileId")})
        runs.append({
            "runId": run_id,
            "label": title_from_slug(run_id),
            "createdUtc": run_created_utc(run_id),
            "profiles": len(profile_ids),
            "rows": len(run_rows),
            "tasks": sum(row.get("tasks") or 0 for row in run_rows),
            "hasLiveMetrics": os.path.exists(metrics_path),
        })
        rows.extend(run_rows)

    profiles_by_key = {}
    for row in rows:
        key = (row["runId"], row["profileId"])
        profile = profiles_by_key.setdefault(key, {
            "runId": row["runId"],
            "runLabel": row["runLabel"],
            "createdUtc": row["createdUtc"],
            "profileId": row["profileId"],
            "profile": row["profile"],
            "family": row["family"],
            "quant": profile_quant(row["profileId"]),
            "sizeClass": profile_size_class(row["profileId"]),
            "tasks": 0,
            "basePass": 0,
            "plusPass": 0,
            "suites": [],
            "speedTasks": 0,
            "codegenSeconds": 0,
            "speedCoverage": 0,
        })
        profile["tasks"] += row["tasks"] or 0
        profile["basePass"] += row["basePass"] or 0
        profile["plusPass"] += row["plusPass"] or 0
        profile["suites"].append({
            "suite": row["suite"],
            "suiteLabel": row["suiteLabel"],
            "tasks": row["tasks"],
            "basePass": row["basePass"],
            "plusPass": row["plusPass"],
            "baseRate": row["baseRate"],
            "plusRate": row["plusRate"],
            "elapsedSeconds": row["elapsedSeconds"],
            "samplesPerMinute": row["samplesPerMinute"],
        })
        if row["elapsedSeconds"]:
            profile["speedTasks"] += row["tasks"] or 0
            profile["codegenSeconds"] += row["elapsedSeconds"]
            profile["speedCoverage"] += 1

    profile_runs = []
    for profile in profiles_by_key.values():
        tasks = profile["tasks"]
        profile["baseRate"] = round(profile["basePass"] / tasks, 4) if tasks else None
        profile["plusRate"] = round(profile["plusPass"] / tasks, 4) if tasks else None
        profile["samplesPerMinute"] = round(profile["speedTasks"] * 60 / profile["codegenSeconds"], 3) if profile["speedTasks"] and profile["codegenSeconds"] else None
        metric = metrics_by_run_profile.get((profile["runId"], profile["profileId"]))
        if metric:
            predicted_seconds = metric.get("predicted_seconds_total_delta")
            prompt_seconds = metric.get("prompt_seconds_total_delta")
            predicted_tokens = metric.get("tokens_predicted_total_delta")
            prompt_tokens = metric.get("prompt_tokens_total_delta")
            profile["liveMetrics"] = {
                "activeSamples": metric.get("active_samples"),
                "peakPromptTps": metric.get("peak_prompt_tps_active"),
                "peakPredictedTps": metric.get("peak_predicted_tps_active"),
                "avgPromptTps": round(prompt_tokens / prompt_seconds, 3) if prompt_tokens and prompt_seconds else None,
                "avgPredictedTps": round(predicted_tokens / predicted_seconds, 3) if predicted_tokens and predicted_seconds else None,
                "promptTokens": prompt_tokens,
                "predictedTokens": predicted_tokens,
            }
        else:
            profile["liveMetrics"] = None
        profile_runs.append(profile)

    latest_row_by_profile_suite = {}
    for row in sorted(rows, key=lambda item: (item.get("createdUtc") or "", item.get("tasks") or 0)):
        latest_row_by_profile_suite[(row["profileId"], row["suite"])] = row

    latest_metric_by_profile = {}
    for profile in sorted(profile_runs, key=lambda item: item.get("createdUtc") or ""):
        if profile.get("liveMetrics"):
            latest_metric_by_profile[profile["profileId"]] = profile["liveMetrics"]

    profiles_by_profile = {}
    for row in latest_row_by_profile_suite.values():
        profile = profiles_by_profile.setdefault(row["profileId"], {
            "runId": row["runId"],
            "runLabel": row["runLabel"],
            "createdUtc": row["createdUtc"],
            "profileId": row["profileId"],
            "profile": row["profile"],
            "family": row["family"],
            "quant": profile_quant(row["profileId"]),
            "sizeClass": profile_size_class(row["profileId"]),
            "tasks": 0,
            "basePass": 0,
            "plusPass": 0,
            "suites": [],
            "speedTasks": 0,
            "codegenSeconds": 0,
            "speedCoverage": 0,
            "liveMetrics": latest_metric_by_profile.get(row["profileId"]),
        })
        if (row.get("createdUtc") or "") >= (profile.get("createdUtc") or ""):
            profile["runId"] = row["runId"]
            profile["runLabel"] = row["runLabel"]
            profile["createdUtc"] = row["createdUtc"]
        profile["tasks"] += row["tasks"] or 0
        profile["basePass"] += row["basePass"] or 0
        profile["plusPass"] += row["plusPass"] or 0
        profile["suites"].append({
            "suite": row["suite"],
            "suiteLabel": row["suiteLabel"],
            "tasks": row["tasks"],
            "basePass": row["basePass"],
            "plusPass": row["plusPass"],
            "baseRate": row["baseRate"],
            "plusRate": row["plusRate"],
            "elapsedSeconds": row["elapsedSeconds"],
            "samplesPerMinute": row["samplesPerMinute"],
        })
        if row["elapsedSeconds"]:
            profile["speedTasks"] += row["tasks"] or 0
            profile["codegenSeconds"] += row["elapsedSeconds"]
            profile["speedCoverage"] += 1

    for profile in profiles_by_profile.values():
        tasks = profile["tasks"]
        profile["baseRate"] = round(profile["basePass"] / tasks, 4) if tasks else None
        profile["plusRate"] = round(profile["plusPass"] / tasks, 4) if tasks else None
        profile["samplesPerMinute"] = round(profile["speedTasks"] * 60 / profile["codegenSeconds"], 3) if profile["speedTasks"] and profile["codegenSeconds"] else None

    profiles = sorted(profiles_by_profile.values(), key=lambda item: (
        item.get("plusRate") if item.get("plusRate") is not None else -1,
        item.get("baseRate") if item.get("baseRate") is not None else -1,
        item.get("samplesPerMinute") if item.get("samplesPerMinute") is not None else -1,
    ), reverse=True)

    return {
        "meta": {
            "sourceHost": "ciru",
            "suite": "EvalPlus HumanEval+, MBPP+, and BigCodeBench-Hard",
            "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "runCount": len(runs),
            "profileCount": len(profiles),
            "rowCount": len(rows),
            "latestRunUtc": max([r["createdUtc"] for r in runs if r.get("createdUtc")] or [None]),
        },
        "runs": sorted(runs, key=lambda item: item.get("createdUtc") or ""),
        "profiles": profiles,
        "profileRuns": sorted(profile_runs, key=lambda item: (item.get("createdUtc") or "", item.get("profile") or "")),
        "rows": rows,
    }

SERVER_TUNING_DIR_PATTERNS = [
    "/home/crown/bench-results/llama/qwopus27-vs-chadrock27",
    "/home/crown/bench-results/llama/qwopus27-settings-experiments",
    "/home/crown/bench-results/llama/qwopus27-settings-matrix-*",
    "/home/crown/bench-results/llama/qwopus27-d2-matrix-*",
    "/home/crown/bench-results/llama/qwopus27-d3-focused-*",
    "/home/crown/bench-results/llama/qwopus27-confirm-*",
    "/home/crown/bench-results/llama/qwopus27-long-confirm-*",
    "/home/crown/bench-results/llama/qwopus27-final-4096-*",
    "/home/crown/bench-results/llama/qwopus27-32k-batch-matrix-*",
    "/home/crown/bench-results/llama/qwopus27-small-batch-*",
]

SERVER_TUNING_GROUPS = [
    ("qwopus27-vs-chadrock27", "Qwopus vs Chadrock 27B"),
    ("qwopus27-settings-experiments", "Qwopus proposed settings"),
    ("qwopus27-settings-matrix", "Qwopus isolation probes"),
    ("qwopus27-d2-matrix", "Qwopus d2 starting matrix"),
    ("qwopus27-d3-focused", "Qwopus d3 focused matrix"),
    ("qwopus27-confirm", "Qwopus 1024-token confirmation"),
    ("qwopus27-long-confirm", "Qwopus 2048-token confirmation"),
    ("qwopus27-final-4096", "Qwopus 4096-token confirmation"),
    ("qwopus27-32k-batch-matrix", "Qwopus 45k prefill batch test"),
    ("qwopus27-small-batch", "Qwopus 45k small-batch follow-up"),
]

TUNING_LABELS = {
    "chadrock27-winner-qwopus-ab": "Chadrock 27B winner",
    "qwopus36-27b-v2-chadrock-lean-mtp-qwopus-ab": "Qwopus 27B Chadrock lean",
    "qwopus36-27b-v2-full-proposed-f16kv-b32768-ub2048-t32tb16-ngram": "Qwopus full proposed + ngram",
    "qwopus36-27b-v2-proposed-no-ngram-f16kv-b32768-ub2048-t32tb16": "Qwopus proposed without ngram",
    "f16_only": "F16 KV only",
    "batch_threads_only": "Batch/thread change only",
    "draft_n6_p025_only": "n_max 6 + p_min 0.25",
    "ngram_only": "ngram-mod only",
    "d1_default": "d1 default",
    "d2_default": "d2 default",
    "d3_default": "d3 default",
    "d4_default": "d4 default",
    "d5_default": "d5 default",
    "d3_default_repeat": "d3 default repeat",
    "d3_default_1024": "d3 default, 1024 tokens",
    "d3_pmin010_1024": "d3 p_min 0.10, 1024 tokens",
    "d3_psplit020_1024": "d3 p_split 0.20, 1024 tokens",
    "d4_default_1024": "d4 default, 1024 tokens",
    "d4_default_2048": "d4 default, 2048 tokens",
    "d4_psplit020_2048": "d4 p_split 0.20, 2048 tokens",
    "d4_pmin010_2048": "d4 p_min 0.10, 2048 tokens",
    "d3_psplit020_2048": "d3 p_split 0.20, 2048 tokens",
    "d4_default_4096": "d4 default, 4096 tokens",
    "b512_ub512": "batch 512 / ubatch 512",
    "b1024_ub512": "batch 1024 / ubatch 512",
    "b2048_ub512": "batch 2048 / ubatch 512",
    "b256_ub256": "batch 256 / ubatch 256",
    "b256_ub128": "batch 256 / ubatch 128",
    "b128_ub128": "batch 128 / ubatch 128",
    "ace_saber_baseline_ignore_eos": "ACE/SABER baseline, 1024 tokens",
    "ace_saber_proposed_no_ngram": "ACE/SABER proposed without ngram",
    "baseline_512": "ACE/SABER baseline, 512 tokens",
    "draft_n6_p025_only": "n_max 6 + p_min 0.25",
}

def timestamp_from_text(value):
    m = re.search(r"(\d{8}T\d{6}Z)", str(value or ""))
    return m.group(1) if m else None

def group_label_for_dir(run_id):
    for prefix, label in SERVER_TUNING_GROUPS:
        if str(run_id or "").startswith(prefix):
            return label
    return title_from_slug(run_id)

def public_tuning_label(label):
    if label in TUNING_LABELS:
        return TUNING_LABELS[label]
    return title_from_slug(str(label or "").replace("_", "-"))

def parse_sse_final_timing(raw_path):
    if not raw_path or not os.path.exists(raw_path):
        return None
    last = None
    try:
        with open(raw_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line.startswith("data: "):
                    continue
                try:
                    payload = json.loads(line[6:])
                except Exception:
                    continue
                if payload.get("timings"):
                    last = payload
    except Exception:
        return None
    if not last:
        return None
    timings = last.get("timings") or {}
    draft_n = timings.get("draft_n")
    draft_accepted = timings.get("draft_n_accepted")
    return {
        "promptTokens": timings.get("prompt_n"),
        "promptMs": timings.get("prompt_ms"),
        "promptTps": timings.get("prompt_per_second"),
        "generatedTokens": timings.get("predicted_n") or last.get("tokens_predicted"),
        "decodeMs": timings.get("predicted_ms"),
        "decodeTps": timings.get("predicted_per_second"),
        "draftGenerated": draft_n,
        "draftAccepted": draft_accepted,
        "acceptRate": round(draft_accepted / draft_n, 5) if draft_n else None,
        "speculativeTypes": (last.get("generation_settings") or {}).get("speculative.types"),
    }

def parse_server_log_timing(log_path):
    if not log_path or not os.path.exists(log_path):
        return None
    try:
        text = open(log_path, "r", encoding="utf-8", errors="replace").read()
    except Exception:
        return None
    pattern = re.compile(
        r"prompt eval time =\s+([0-9.]+) ms /\s+(\d+) tokens .*?([0-9.]+) tokens per second\)"
        r".*?eval time =\s+([0-9.]+) ms /\s+(\d+) tokens .*?([0-9.]+) tokens per second\)"
        r".*?draft acceptance rate =\s+([0-9.]+) \(\s*(\d+) accepted /\s*(\d+) generated\)",
        re.S,
    )
    m = pattern.search(text)
    if not m:
        return None
    prompt_ms, prompt_tokens, prompt_tps, decode_ms, generated_tokens, decode_tps, accept_rate, accepted, generated = m.groups()
    return {
        "promptTokens": int(prompt_tokens),
        "promptMs": float(prompt_ms),
        "promptTps": float(prompt_tps),
        "generatedTokens": int(generated_tokens),
        "decodeMs": float(decode_ms),
        "decodeTps": float(decode_tps),
        "draftGenerated": int(generated),
        "draftAccepted": int(accepted),
        "acceptRate": float(accept_rate),
        "speculativeTypes": "draft-mtp",
    }

def client_json_for_log(log_path):
    base = os.path.basename(log_path).replace(".server.log", "")
    candidates = [
        os.path.join(os.path.dirname(log_path), f"{base}.client.json"),
        os.path.join(os.path.dirname(log_path), "client.json"),
    ]
    for path in candidates:
        try:
            if os.path.exists(path):
                return json.load(open(path, "r", encoding="utf-8"))
        except Exception:
            pass
    return {}

def tuning_model_name(label, run_id):
    low = f"{label} {run_id}".lower()
    if "ace" in low or "saber" in low:
        return "Chadrock 35B ACE/SABER MTP"
    if "chadrock27-winner" in low:
        return "Chadrock 27B winner MTP"
    return "Qwopus3.6 27B v2 Chadrock Lean MTP"

def tuning_note(label, group, timing):
    low = str(label or "").lower()
    if label == "d4_default_4096":
        return "Best confirmed Qwopus setting: d4 default over a 4096-token decode."
    if label == "d4_default_2048":
        return "d4 beat the d3 candidate on the longer 2048-token confirmation."
    if label == "d4_default_1024":
        return "Longer 1024-token confirmation moved the lead from d3 to d4."
    if label == "qwopus36-27b-v2-chadrock-lean-mtp-qwopus-ab":
        return "Faster than the older Chadrock 27B winner under the same 1024-token prompt."
    if label == "chadrock27-winner-qwopus-ab":
        return "Baseline row for the Qwopus-vs-Chadrock 27B comparison."
    if label == "b512_ub512":
        return "Balanced long-context winner: strong prefill and best post-prefill decode."
    if label == "b256_ub256":
        return "Best raw 45k prefill speed, but weaker decode than b512/u512."
    if "proposed" in low or "n6" in low or "p025" in low:
        return "Aggressive proposed settings were slower than the baseline."
    if "ngram" in low:
        return "ngram-mod was not useful for these MTP profiles."
    if "ace" in group.lower() and "baseline" in low:
        return "ACE/SABER baseline remains the fast serving profile."
    if timing and timing.get("generatedTokens") and timing.get("generatedTokens") >= 4000:
        return "Long forced decode exposes sustained MTP throughput."
    return ""

def round_tuning_value(value, digits=3):
    return round(value, digits) if isinstance(value, (int, float)) and math.isfinite(value) else None

def tuning_row_from_jsonl(row, run_dir):
    if row.get("error"):
        return None
    timing = parse_sse_final_timing(row.get("raw_output"))
    if not timing:
        return None
    run_id = os.path.basename(run_dir)
    label = row.get("label")
    mem = row.get("memory") or {}
    return {
        "timestamp": row.get("timestamp_utc") or timestamp_from_text(row.get("raw_output")) or timestamp_from_text(run_id),
        "runId": run_id,
        "group": group_label_for_dir(run_id),
        "label": label,
        "displayLabel": public_tuning_label(label),
        "modelName": tuning_model_name(label, run_id),
        "promptTokens": timing.get("promptTokens"),
        "generatedTokens": timing.get("generatedTokens"),
        "promptTps": round_tuning_value(timing.get("promptTps")),
        "decodeTps": round_tuning_value(timing.get("decodeTps")),
        "acceptRate": round_tuning_value(timing.get("acceptRate"), 5),
        "draftAccepted": timing.get("draftAccepted"),
        "draftGenerated": timing.get("draftGenerated"),
        "totalMs": round_tuning_value(row.get("total_ms")),
        "ttfpMs": round_tuning_value(row.get("ttfp_ms")),
        "vramGiB": gib(mem.get("peak_vram_used_bytes")),
        "gttGiB": gib(mem.get("peak_gtt_used_bytes")),
        "sysGiB": gib(mem.get("peak_ram_used_bytes")),
        "status": "ok",
        "note": tuning_note(label, group_label_for_dir(run_id), timing),
        "sourcePath": compact_path(row.get("raw_output")),
    }

def ace_tuning_rows():
    rows = []
    for log_path in sorted(glob.glob("/home/crown/bench-results/llama/ace-saber-settings-*/*.server.log")):
        run_id = os.path.basename(os.path.dirname(log_path))
        label = os.path.basename(log_path).replace(".server.log", "")
        timing = parse_server_log_timing(log_path)
        client = client_json_for_log(log_path)
        status = "ok" if timing else "stalled"
        if timing and (timing.get("generatedTokens") or 0) < 32:
            continue
        row = {
            "timestamp": timestamp_from_text(run_id) or datetime.fromtimestamp(os.path.getmtime(log_path), timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
            "runId": run_id,
            "group": "ACE/SABER settings cross-check",
            "label": label,
            "displayLabel": public_tuning_label(label),
            "modelName": "Chadrock 35B ACE/SABER MTP",
            "promptTokens": timing.get("promptTokens") if timing else None,
            "generatedTokens": timing.get("generatedTokens") if timing else None,
            "promptTps": round_tuning_value(timing.get("promptTps") if timing else None),
            "decodeTps": round_tuning_value(timing.get("decodeTps") if timing else None),
            "acceptRate": round_tuning_value(timing.get("acceptRate") if timing else None, 5),
            "draftAccepted": timing.get("draftAccepted") if timing else None,
            "draftGenerated": timing.get("draftGenerated") if timing else None,
            "totalMs": round_tuning_value(client.get("total_ms") or ((timing.get("promptMs") or 0) + (timing.get("decodeMs") or 0) if timing else None)),
            "ttfpMs": round_tuning_value(client.get("ttfp_ms")),
            "vramGiB": None,
            "gttGiB": None,
            "sysGiB": None,
            "status": status,
            "note": tuning_note(label, "ACE/SABER settings cross-check", timing),
            "sourcePath": compact_path(log_path),
        }
        if status == "stalled":
            row["note"] = "Run did not complete a usable timing summary."
        rows.append(row)
    return rows

def fmt_speed_value(value, suffix=" t/s"):
    return f"{value:.2f}{suffix}" if isinstance(value, (int, float)) and math.isfinite(value) else "n/a"

def summarize_server_tuning():
    rows = []
    seen_dirs = []
    for pattern in SERVER_TUNING_DIR_PATTERNS:
        for run_dir in sorted(glob.glob(pattern)):
            if os.path.isdir(run_dir) and run_dir not in seen_dirs:
                seen_dirs.append(run_dir)
    for run_dir in seen_dirs:
        for row in read_jsonl(os.path.join(run_dir, "results.jsonl")):
            tuning_row = tuning_row_from_jsonl(row, run_dir)
            if tuning_row:
                rows.append(tuning_row)
    rows.extend(ace_tuning_rows())
    rows = sorted(rows, key=lambda item: (item.get("timestamp") or "", item.get("group") or "", item.get("decodeTps") or 0))

    by_label = {row.get("label"): row for row in rows}
    qwopus = by_label.get("qwopus36-27b-v2-chadrock-lean-mtp-qwopus-ab")
    chadrock = by_label.get("chadrock27-winner-qwopus-ab")
    qfinal = by_label.get("d4_default_4096")
    ace1024 = by_label.get("ace_saber_baseline_ignore_eos")
    ace512 = by_label.get("baseline_512")
    balanced = by_label.get("b512_ub512")
    fastest_prefill = max(
        [row for row in rows if row.get("group") in ("Qwopus 45k prefill batch test", "Qwopus 45k small-batch follow-up") and row.get("promptTps")],
        key=lambda item: item.get("promptTps") or 0,
        default=None,
    )

    summary = []
    if ace512 or ace1024:
        top_ace = ace512 or ace1024
        summary.append({
            "label": "ACE/SABER decode",
            "value": fmt_speed_value(top_ace.get("decodeTps")),
            "detail": f"{top_ace.get('displayLabel')} with {fmt_speed_value(top_ace.get('promptTps'))} prompt processing and {round((top_ace.get('acceptRate') or 0) * 100, 1)}% acceptance.",
        })
    if qfinal:
        summary.append({
            "label": "Qwopus sustained decode",
            "value": fmt_speed_value(qfinal.get("decodeTps")),
            "detail": f"4096-token forced decode at d4 default with {round((qfinal.get('acceptRate') or 0) * 100, 1)}% MTP acceptance.",
        })
    if qwopus and chadrock and chadrock.get("decodeTps"):
        lift = ((qwopus.get("decodeTps") or 0) / chadrock.get("decodeTps") - 1) * 100
        summary.append({
            "label": "Qwopus vs Chadrock 27B",
            "value": f"+{lift:.1f}%",
            "detail": f"{fmt_speed_value(qwopus.get('decodeTps'))} vs {fmt_speed_value(chadrock.get('decodeTps'))} on the same 1024-token API prompt.",
        })
    if balanced:
        detail = f"Balanced b512/u512 delivered {fmt_speed_value(balanced.get('promptTps'))} prefill and {fmt_speed_value(balanced.get('decodeTps'))} decode after 44,677 prompt tokens."
        if fastest_prefill and fastest_prefill is not balanced:
            detail += f" Raw prefill peak was {fmt_speed_value(fastest_prefill.get('promptTps'))} on {fastest_prefill.get('displayLabel')}."
        summary.append({
            "label": "45k-token prefill",
            "value": fmt_speed_value(balanced.get("promptTps")),
            "detail": detail,
        })

    return {
        "meta": {
            "sourceRoot": compact_path("/home/crown/bench-results/llama"),
            "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "rowCount": len(rows),
            "latestTimestamp": max([row.get("timestamp") for row in rows if row.get("timestamp")] or [None]),
        },
        "summary": summary,
        "rows": rows,
    }

def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        return {"error": str(exc)}

def summarize_races():
    specs = [
        ("DFlash/PFlash short coding", "/srv/llm/runs/20260512-203510-qwen36-27b-dflash-pflash-strix-full/summary.json", "dflash"),
        ("PFlash fixed long TG", "/srv/llm/runs/20260512-213418-qwen36-27b-fixed-decode-tg-pflash-vs-baseline/decode-tg-summary.json", "pflash"),
        ("PFlash audit rerun", "/srv/llm/runs/20260512-235444-qwen36-27b-pflash-output-audit-rerun/qwen36-27b-dflash-pflash-output-audit-summary.json", "pflash"),
        ("TG64 all lanes", "/srv/llm/runs/20260513-015545-tg64-all-lanes/tg64-summary.json", "quality-race"),
        ("Qwen3.6 MTP quant matrix", "/srv/llm/runs/20260513-qwen36-35b-mtp-unsloth-strix/mtp-benchmark-summary.json", "mtp"),
        ("MXFP4 MTP draft4 race64", "/srv/llm/runs/20260514-094535-qwen36-mxfp4moe-race-draft4/race-summary.json", "mtp-race"),
        ("Crown vs MXFP4 Mirofish", "/srv/llm/runs/20260514-084001-crown-vs-mxfp4-mtp-draft4-mirofish-filter/mirofish-draft4-filter-summary.json", "task-race"),
    ]
    races = []
    for title, path, kind in specs:
        payload = read_json(path)
        races.append({
            "title": title,
            "kind": kind,
            "path": compact_path(path),
            "payload": payload,
        })
    return races

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
counts = {}
for name in ("benchmark_rows", "llama_bench_comparable", "llama_bench_strict"):
    counts[name] = cur.execute(f"SELECT count(*) FROM {name}").fetchone()[0]
ledger_rows = 0
try:
    with open(LEDGER, "r", encoding="utf-8") as f:
        ledger_rows = sum(1 for line in f if line.strip())
except FileNotFoundError:
    pass

strict_rows = fetch_rows(cur, "llama_bench_strict")
comparable_rows = fetch_rows(cur, "llama_bench_comparable")
api_rows = summarize_api_rows(cur)
server_tuning = summarize_server_tuning()

payload = {
    "meta": {
        "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sourceHost": "ciru",
        "database": DB,
        "ledger": LEDGER,
        "ledgerRows": ledger_rows,
        "storeOk": ledger_rows == counts["benchmark_rows"],
        "counts": counts,
        "latestTimestamp": max([r["timestamp"] for r in strict_rows + api_rows + server_tuning["rows"] if r.get("timestamp")] or [None]),
    },
    "strictRows": strict_rows,
    "comparableRows": comparable_rows,
    "apiRows": api_rows,
    "mtpServer": summarize_mtp_server(),
    "serverTuning": server_tuning,
    "auxEval": summarize_aux_eval(),
    "loadouts": summarize_loadouts(),
    "codingLab": summarize_coding_lab(),
    "qualitySuites": summarize_quality_suites(),
    "races": summarize_races(),
    "notes": [
        {"title": "Validated results", "kind": "method", "text": "Validated results use runs with complete settings and comparable measurement fields."},
        {"title": "Context metric", "kind": "metric", "text": "PG rows include prompt processing plus generation. PP rows measure prompt processing. The atlas labels each cell with the metric that was recorded."},
        {"title": "Serving measurements", "kind": "serving", "text": "Serving latency, MTP sweeps, race pages, and loadout tests answer different questions, so they are shown separately from raw throughput charts."},
        {"title": "Historical results", "kind": "archive", "text": "All Results includes older measurements that are useful for trend checks, even when their settings are less complete."}
    ]
}

print(json.dumps(payload, separators=(",", ":")))
`;

function runRemote() {
  const args = [
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=8",
    "-i", sshKey,
    sshHost,
    "python3", "-"
  ];
  const result = spawnSync("ssh", args, {
    input: remoteScript,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ssh exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function runLocal() {
  const result = spawnSync("python3", ["-"], {
    input: remoteScript,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`python3 exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

fs.mkdirSync(dataDir, { recursive: true });
const data = process.env.BENCHV2_LOCAL === "1" || process.env.BENCHV2_SSH_HOST === "local"
  ? runLocal()
  : runRemote();
const json = JSON.stringify(data, null, 2);
fs.writeFileSync(path.join(dataDir, "benchv2-data.json"), json + "\n", "utf8");
fs.writeFileSync(
  path.join(dataDir, "benchv2-data.js"),
  `window.BENCHV2_DATA = ${json};\n`,
  "utf8"
);

console.log(JSON.stringify({
  outDir: dataDir,
  generatedAtUtc: data.meta.generatedAtUtc,
  counts: data.meta.counts,
  apiRows: data.apiRows.length,
  mtpServerRows: data.mtpServer.length,
  serverTuningRows: data.serverTuning.rows.length,
  auxCandidates: data.auxEval.candidateCount,
  loadouts: data.loadouts.rows,
  codingProfiles: data.codingLab.meta.profileCount,
  qualitySuiteRows: data.qualitySuites.meta.rowCount,
  qualityExcludedRows: data.qualitySuites.meta.excludedRows,
  storeOk: data.meta.storeOk
}, null, 2));
