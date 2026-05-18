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
    if "qwen3-coder-next" in low:
        return "Qwen Coder Next"
    if "qwen3-coder-30b" in low or "qwen3-coder" in low:
        return "Qwen Coder"
    if "qwen2.5-coder" in low:
        return "Qwen2.5 Coder"
    if "qwen3.6" in low or "qwen36" in low:
        if "halostrix-dyn-mtp-v7" in low or "crown-dyn-mtp" in low:
            return "Qwen3.6 Crown MTP"
        if "dynamic" in low or "dyn" in low or "halostrix" in low or "crown-v7" in low:
            return "Qwen3.6 Strix"
        if "mtp" in low:
            return "Qwen3.6 MTP"
        return "Qwen3.6"
    if "gemma" in low:
        return "Gemma"
    if "qwopus" in low:
        return "Qwopus"
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
    if "hermes" in low:
        return "Hermes"
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

payload = {
    "meta": {
        "generatedAtUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sourceHost": "ciru",
        "database": DB,
        "ledger": LEDGER,
        "ledgerRows": ledger_rows,
        "storeOk": ledger_rows == counts["benchmark_rows"],
        "counts": counts,
        "latestTimestamp": max([r["timestamp"] for r in strict_rows + api_rows if r.get("timestamp")] or [None]),
    },
    "strictRows": strict_rows,
    "comparableRows": comparable_rows,
    "apiRows": api_rows,
    "mtpServer": summarize_mtp_server(),
    "auxEval": summarize_aux_eval(),
    "loadouts": summarize_loadouts(),
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

fs.mkdirSync(dataDir, { recursive: true });
const data = runRemote();
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
  auxCandidates: data.auxEval.candidateCount,
  loadouts: data.loadouts.rows,
  storeOk: data.meta.storeOk
}, null, 2));
