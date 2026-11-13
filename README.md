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

## Known limitations / next steps

- **The questions are too easy.** Textbook testing questions are likely to score near 100% for every model and prompt (a ceiling effect), so the experiment can't show differences.
- **One sample per test.** At temperature 1.0 a single run is noise. Run with `--repeat` and compare pass rates.
- **Coverage.** Add hallucination, prompt-injection, output-format (JSON), latency and cost checks, and run the suite in CI.
