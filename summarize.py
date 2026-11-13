"""Summarize a promptfoo results file into Markdown tables for the README.

Usage:
    python3 summarize.py results-openai-anthropic.json [results-gemini.json ...]

Multiple-choice suite: groups by model x prompt technique and model x tone.
Test-report suite (tests with a `case` var): groups by model x prompt variant,
and by model x case x variant.
Prints pass rate, errors, median latency, average output tokens and cost.
Standard library only.
"""

import json
import re
import statistics
import sys
from collections import defaultdict

TECHNIQUES = {"1": "baseline", "2": "emotional", "3": "persona", "4": "chain of thought"}


def technique_and_tone(label):
    """'prompt3_academic.yaml: [...]' -> ('persona', 'academic')"""
    m = re.match(r"prompt(\d)(?:_(\w+))?\.yaml", label)
    if not m:
        return None, None
    return TECHNIQUES[m.group(1)], m.group(2) or "neutral"


def variant(label):
    """Short prompt-variant name. Runs from before the prompts had labels
    show the file path plus the whole prompt text, e.g. 'report/prompt.json: [...]'."""
    name = label.split(":")[0].strip()
    return {"report/prompt.json": "guarded"}.get(name, name)


def load(paths):
    rows = []
    for path in paths:
        with open(path) as f:
            for r in json.load(f)["results"]["results"]:
                technique, tone = technique_and_tone(r["prompt"]["label"])
                usage = (r.get("response") or {}).get("tokenUsage") or {}
                rows.append({
                    "model": r["provider"]["id"].split(":")[-1],
                    "technique": technique,
                    "tone": tone,
                    "case": (r.get("vars") or {}).get("case"),
                    "variant": variant(r["prompt"].get("label", "")),
                    "passed": bool(r.get("success")),
                    "error": bool(r.get("error")) and not r.get("gradingResult"),
                    "latency": r.get("latencyMs") or 0,
                    "tokens": usage.get("completion") or 0,
                    "cost": r.get("cost") or 0.0,
                })
    return rows


def table(rows, by):
    groups = defaultdict(list)
    for r in rows:
        groups[(r["model"], r[by])].append(r)
    print(f"| Model | {by[0].upper() + by[1:]} | Passed | Errors | Median latency | Avg output tokens | Cost |")
    print("|---|---|---|---|---|---|---|")
    for (model, value), g in sorted(groups.items()):
        passed = sum(r["passed"] for r in g)
        errors = sum(r["error"] for r in g)
        latency = statistics.median(r["latency"] for r in g) / 1000
        tokens = statistics.mean(r["tokens"] for r in g)
        cost = sum(r["cost"] for r in g)
        cost_text = f"${cost:.4f}" if cost else "n/a"  # promptfoo has no price for unknown models
        print(f"| {model} | {value} | {passed}/{len(g)} | {errors} | {latency:.1f} s | {tokens:.0f} | {cost_text} |")
    print()


if __name__ == "__main__":
    rows = load(sys.argv[1:])
    if any(r["technique"] for r in rows):
        table([r for r in rows if r["technique"]], "technique")
        table([r for r in rows if r["tone"]], "tone")
    if any(r["case"] for r in rows):
        report_rows = [r for r in rows if r["case"]]
        table(report_rows, "variant")
        for r in report_rows:
            r["case / variant"] = f'{r["case"]} / {r["variant"]}'
        table(report_rows, "case / variant")
