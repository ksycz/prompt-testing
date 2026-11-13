"""Check the results of the fake-model self-test (used by CI).

Usage:
    python3 report/check_selftest.py good.json bad.json

Fails (exit 1) unless:
- every test passed with fake-good.js (no check is too strict)
- every test failed with fake-bad.js (no check is too weak)
- every result was graded by the latency check too (the check is switched
  on; a config typo once switched it off silently)
"""

import json
import sys


def results(path):
    with open(path) as f:
        return json.load(f)["results"]["results"]


def has_latency_check(result):
    components = (result.get("gradingResult") or {}).get("componentResults") or []
    return any(c.get("assertion", {}).get("type") == "latency" for c in components)


def main(good_path, bad_path):
    problems = []
    good, bad = results(good_path), results(bad_path)

    for r in good:
        if not r.get("success"):
            problems.append(f"fake-good FAILED {r['vars']['case']} ({r['prompt']['label']}): the check is too strict or wrong")
    for r in bad:
        if r.get("success"):
            problems.append(f"fake-bad PASSED {r['vars']['case']} ({r['prompt']['label']}): the check is too weak")
    for r in good + bad:
        if not has_latency_check(r):
            problems.append(f"no latency check on {r['vars']['case']} ({r['prompt']['label']}): is defaultTest set?")

    print(f"fake-good: {sum(r['success'] for r in good)}/{len(good)} passed (expected all)")
    print(f"fake-bad:  {sum(r['success'] for r in bad)}/{len(bad)} passed (expected none)")
    print(f"latency check present: {sum(has_latency_check(r) for r in good + bad)}/{len(good + bad)}")

    if not good or not bad:
        problems.append("a results file is empty")
    if problems:
        print("\nSelf-test FAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("\nSelf-test passed: every check can pass, can fail, and the latency limit is on.")


if __name__ == "__main__":
    main(*sys.argv[1:3])
