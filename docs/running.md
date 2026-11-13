# Running the evals

[← back to README](../README.md)

## Files

| File | Purpose |
|---|---|
| `promptfooconfig.yaml` | Suite 1: 12 prompts × 3 models × 10 questions = 360 tests |
| `promptfooconfig_report.yaml` | Suite 2: 16 cases × 2 prompt variants × 3 models = 96 tests. Inputs, prompts, shared checks, fake models and the long-report generator are in `report/` |
| `summarize.py` | Turns result files into the Markdown tables in the Results section (by technique and tone for suite 1, by case for suite 2) |
| `promptfooconfig_strict.yaml` | One question with strict output checks: answer format (regex), no hedging, the explanation names the testing concept, and a confidence score. Judged by Gemini 3.8 Flash, so GPT-5-mini doesn't grade itself. (Before 13 Nov 2026 a config typo meant promptfoo's default OpenAI grader judged instead; see [the findings](findings.md#a-one-letter-typo-switched-off-two-checks-and-validate-said-the-config-was-fine)) |

## How to run

```bash
# API keys go in .env (gitignored): OPENAI_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY
npx promptfoo@latest eval --no-cache                                  # main experiment
npx promptfoo@latest eval -c promptfooconfig_strict.yaml --no-cache   # strict checks
npx promptfoo@latest eval -c promptfooconfig_report.yaml --no-cache   # suite 2 (writes results-report.json)
python3 summarize.py results-report.json                              # tables for the README
npx promptfoo@latest view                                             # open results in the browser
```

Useful flags:

```bash
--filter-first-n 1   # smoke test: only the first question (12 prompts × 3 models = 36 calls)
--no-table           # summary only; the terminal table is unreadable with many columns
-j 1                 # one request at a time, gentler on a busy API
--repeat 3           # run every test 3 times: pass rates instead of single results
--filter-pattern X   # only tests whose description matches X, e.g. "Long report"
--filter-providers X # only models whose id matches X, e.g. 'openai|anthropic'
```

Suite 2 with the harder cases, 3 samples each, without Gemini (16 cases × 2 prompts × 2 models × 3 = 192 calls, a few cents):

```bash
npx promptfoo@latest eval -c promptfooconfig_report.yaml --no-cache --no-table --filter-providers 'openai|anthropic' --repeat 3
python3 summarize.py results-report.json
```

## CI

Two GitHub Actions workflows, split by cost:

| Workflow | When | What it does | Cost |
|---|---|---|---|
| `selftest.yml` | every PR and push to `main`, except changes to only Markdown or `docs/` | validates all three configs, runs suite 2 against `fake-good.js` and `fake-bad.js`, then `report/check_selftest.py` checks that every test passed with the good fake, every test failed with the bad fake, and the latency check ran on every result | free: no API keys, no model calls, about 1 minute |
| `eval-real.yml` | manually only (Actions → "Eval with real models" → Run workflow) | runs a suite against real models; you choose the suite, the providers and `--repeat`. The `summarize.py` tables appear on the run's summary page, and `results.json` is uploaded as an artifact | a few cents per run; needs repository secrets `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` (`GOOGLE_API_KEY` for Gemini) |

Why real models never run on every PR:
- **Cost:** every push would spend money.
- **Flakiness from outside:** a vendor outage (the 503s in "Errors are not failures") would block unrelated changes.
- **Noise:** with one sample at temperature 1.0, a single failure isn't a regression.

What *should* gate a PR is that the eval itself is correct, and that's exactly what the self-test checks.

Both workflows pin promptfoo (`0.125.1`), so a new promptfoo release changes the results only when someone bumps the version on purpose. The `defaultTest` typo is a reminder that config behaviour can shift silently.

In the real-model workflow, failed tests (promptfoo exit code 100) don't fail the job: they are the result, reported in the summary. Any other exit code (bad config, missing key) does fail it.

## Troubleshooting

promptfoo counts **failed** (the model answered, and the assertion said no) separately from **errors** (no usable answer came back). An error says nothing about the model's quality. Find the error text with:

```bash
jq -r '[.results.results[] | select(.error) | .error] | unique[] | .[0:500]' results.json
```

| Error | What it means | What to do |
|---|---|---|
| `404 NOT_FOUND` "model ... is no longer available" | The vendor retired the model ID | Update the ID in the config. The error usually names the replacement |
| `503 UNAVAILABLE` "high demand" | The vendor's servers are overloaded; temporary | Wait and re-run, ideally with `-j 1`. No config change |
| `429` / `RESOURCE_EXHAUSTED` | Rate limit or quota of your API key | Lower concurrency (`-j 1`) or check billing |
| `401` / `403` | Missing or wrong API key | Check `.env` |
| Warning "Using unknown Anthropic model" | Your promptfoo version doesn't list the model yet | Harmless if the requests go through |
