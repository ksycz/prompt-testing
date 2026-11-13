# prompt-testing

LLM evals with [promptfoo](https://promptfoo.dev). This repo checks whether the way a question is worded changes how well a model answers it.

## The question

Popular prompting tips say you should add an emotional stake, give the model an expert persona, or ask it to think step by step. Does any of that change the answers on a fixed set of questions? And does the tone of the system message (neutral, academic, informal) matter?

## Setup

| Part | What it is |
|---|---|
| Dataset | `questions.csv`: 10 multiple-choice questions about software-testing theory, each with one correct answer |
| Prompt techniques | baseline, emotional stimulus ("This is very important to my career!"), expert persona, zero-shot chain of thought ("Let's think step-by-step") |
| System-message tones | neutral, academic, informal (4 techniques × 3 tones = 12 prompts, `prompt*.yaml`) |
| Models under test | OpenAI GPT-5-mini, Google Gemini 3.8 Flash, Anthropic Claude Haiku 5.5: the small, fast tier of each vendor, so they are compared like for like |
| Grading | deterministic: every prompt asks the model to end with `Answer: (X)`, and a regex in `questions.csv` checks that final line. No AI judge needed |

## Configs

| File | Purpose |
|---|---|
| `promptfooconfig.yaml` | Main experiment: 12 prompts × 3 models × 10 questions = 360 tests |
| `summarize.py` | Turns a results file into the Markdown tables in the Results section |
| `promptfooconfig_strict.yaml` | One question with strict output checks: answer format (regex), no hedging, the explanation names the testing concept, and a confidence score. Judged by Gemini 3.8 Flash, so GPT-5-mini doesn't grade itself |

## How to run

```bash
# API keys go in .env (gitignored): OPENAI_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY
npx promptfoo@latest eval --no-cache                                  # main experiment
npx promptfoo@latest eval -c promptfooconfig_strict.yaml --no-cache   # strict checks
npx promptfoo@latest view                                             # open results in the browser
```

Useful flags:

```bash
--filter-first-n 1   # smoke test: only the first question (12 prompts × 3 models = 36 calls)
--no-table           # summary only; the terminal table is unreadable with many columns
-j 1                 # one request at a time, gentler on a busy API
```

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


## Results

First full run, 13 Nov 2026: 12 prompts × 10 questions × 2 models = 240 tests, one sample each. Gemini is not included yet, because its API was overloaded that day (see the finding about errors below).

| Model | Technique | Passed | Errors | Median latency | Avg output tokens | Cost |
|---|---|---|---|---|---|---|
| claude-haiku-5-5 | baseline | 30/30 | 0 | 1.6 s | 198 | n/a |
| claude-haiku-5-5 | chain of thought | 30/30 | 0 | 2.1 s | 349 | n/a |
| claude-haiku-5-5 | emotional | 30/30 | 0 | 1.9 s | 231 | n/a |
| claude-haiku-5-5 | persona | 30/30 | 0 | 1.7 s | 233 | n/a |
| gpt-5-mini | baseline | 30/30 | 0 | 3.6 s | 257 | $0.0162 |
| gpt-5-mini | chain of thought | 30/30 | 0 | 5.0 s | 402 | $0.0249 |
| gpt-5-mini | emotional | 30/30 | 0 | 3.7 s | 253 | $0.0160 |
| gpt-5-mini | persona | 30/30 | 0 | 3.7 s | 265 | $0.0167 |

| Model | Tone | Passed | Errors | Median latency | Avg output tokens | Cost |
|---|---|---|---|---|---|---|
| claude-haiku-5-5 | academic | 40/40 | 0 | 2.1 s | 347 | n/a |
| claude-haiku-5-5 | informal | 40/40 | 0 | 1.8 s | 241 | n/a |
| claude-haiku-5-5 | neutral | 40/40 | 0 | 1.3 s | 170 | n/a |
| gpt-5-mini | academic | 40/40 | 0 | 4.2 s | 332 | $0.0276 |
| gpt-5-mini | informal | 40/40 | 0 | 3.9 s | 333 | $0.0278 |
| gpt-5-mini | neutral | 40/40 | 0 | 3.3 s | 218 | $0.0184 |

Generate these tables from your own run with `python3 summarize.py results-*.json`. Cost shows `n/a` for Claude Haiku 5.5 because this promptfoo version has no price list for it.

**In short:** every prompt got every question right, on both models. The prompt didn't change *correctness*, but it changed *cost and speed*:

- **Chain of thought** costs about +55% output tokens and +35% latency on GPT-5-mini (+75% tokens on Haiku), for zero accuracy gain on these questions.
- **Tone** is not free either. The academic tone roughly doubles Haiku's output (170 → 347 tokens), and on GPT-5-mini both academic and informal cost about 50% more than neutral.
- **Emotional stimulus and expert persona** behave like the baseline: no gain and almost no cost.
- **Haiku answered about twice as fast** as GPT-5-mini (median 1.3–2.1 s vs 3.3–5.0 s). About two thirds of GPT-5-mini's output tokens are hidden reasoning.

## Findings so far

### The strict suite was 0% green, and the bug was in the test

The first runs of `promptfooconfig_strict.yaml` failed for all 4 prompts. The judge explained every failure the same way: the output had no `Confidence: N/10` line.

None of the prompts asks the model for a confidence score. The assertion checked a requirement that was never part of the spec, so no model could pass it. The models were fine, and the test oracle was wrong.

This is the same rule as in ordinary testing: an assertion has to trace back to a requirement. For LLM evals it's easy to break, because a rubric written in plain English *reads* like a reasonable expectation even when the prompt never states it.

### Code checks first, AI judge only where code can't decide

The first version graded multiple choice with an LLM judge, and that judge was GPT-5-mini, which is also one of the models under test. That had two problems:

- **Self-grading.** A model judging its own answers risks self-preference bias.
- **The wrong tool.** Whether the answer is `(B)` is a yes/no fact. A regex checks it for free, instantly and the same way every time. A judge costs money, adds latency and can itself be wrong.

Now every prompt states the output format (`End your reply with a final line in the form "Answer: (X)"`), and the regex checks exactly that, so the assertion traces back to the prompt (see the finding above). This also measures **format compliance**: a correct answer followed by extra chatter fails, because the final line isn't the answer. An app parsing the reply would break the same way.

An LLM judge is still used in the strict suite for things a regex can't decide, such as whether the explanation is relevant. That judge comes from a different vendor than the model under test.

### Errors are not failures: the provider is part of the system under test

The first smoke runs (1 question, 36 calls) passed every test that got an answer, but Gemini returned **12 errors** both times, for two different reasons:

1. **404**: `gemini-2.5-flash` had been retired for new users. A model ID is a dependency that can disappear, just like a pinned library version.
2. **503**: the replacement, `gemini-3.8-flash`, was overloaded ("high demand"). promptfoo retried every call, so the run took almost 2 minutes instead of 17 seconds, and then gave up.

Neither one is a bug in the prompts, the tests or the model's answers. promptfoo reports them as *errors*, not *failures*, so an outage doesn't show up as bad model quality. This is the same distinction as a flaky test caused by test infrastructure versus a real bug.

In a CI pipeline this would need:
- retries with backoff for 503 and 429, and lower concurrency for a busy vendor
- the build failing on assertion failures, while provider errors are reported as a separate signal (or retried) rather than counted as a quality regression
- optionally a fallback model, so one vendor's outage doesn't block the whole run
- model IDs treated as dependencies: check them on a schedule, because vendors retire models

### 100% everywhere: the dataset is too easy, so the eval measures cost, not quality

All 240 tests passed. That doesn't mean the prompt techniques don't matter. It means **this dataset can't show it**: textbook testing questions are too easy for current models (a ceiling effect). An eval set that never fails can't catch a regression either.

What the run *did* show is the price of each technique. If accuracy is equal, the cheapest and fastest prompt wins, and in production that's the neutral baseline, not chain of thought. Latency and token cost are real metrics to assert on, next to correctness.

Next: harder questions or a domain dataset where models actually make mistakes, and `--repeat` to get pass rates and spread instead of one sample.

## Known limitations / next steps

- **The questions are too easy.** Confirmed by the first run: 240/240 passed. A harder or domain-specific dataset is needed.
- **One sample per test.** At temperature 1.0 a single run is noise. Run with `--repeat` and compare pass rates.
- **Coverage.** Add hallucination, prompt-injection, output-format (JSON), latency and cost checks, and run the suite in CI.
