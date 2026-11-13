# prompt-testing

LLM evals with [promptfoo](https://promptfoo.dev). This repo checks whether the way a question is worded changes how well a model answers it.

## The question

Popular prompting tips say you should add an emotional stake, give the model an expert persona, or ask it to think step by step. Does any of that change the answers on a fixed set of questions? And does the tone of the system message (neutral, academic, informal) matter?

## Setup

| Part | What it is |
|---|---|
| Dataset | `questions.csv`: 25 multiple-choice questions about software-testing theory, each with one correct answer |
| Prompt techniques | baseline, emotional stimulus ("This is very important to my career!"), expert persona, zero-shot chain of thought ("Let's think step-by-step") |
| System-message tones | neutral, academic, informal (4 techniques × 3 tones = 12 prompts, `prompt*.yaml`) |
| Models under test | OpenAI GPT-5-mini, Google Gemini 2.0 Flash, Anthropic Claude Sonnet 4 |
| Grading | an LLM judge (`llm-rubric`, GPT-5-mini) checks that the expected answer was chosen |

## Configs

| File | Purpose |
|---|---|
| `promptfooconfig.yaml` | Main experiment: 12 prompts × 3 models × 25 questions |
| `promptfooconfig_strict.yaml` | One question with strict output checks: answer format (regex), no hedging, the explanation names the testing concept, and a confidence score |
| `promptfooconfig_conf.yaml` | Minimal config used to debug the confidence check on its own |

## How to run

```bash
# API keys go in .env (gitignored): OPENAI_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY
npx promptfoo@latest eval --no-cache                                  # main experiment
npx promptfoo@latest eval -c promptfooconfig_strict.yaml --no-cache   # strict checks
npx promptfoo@latest view                                             # open results in the browser
```

## Findings so far

### The strict suite was 0% green, and the bug was in the test

The first runs of `promptfooconfig_strict.yaml` failed for all 4 prompts. The judge explained every failure the same way: the output had no `Confidence: N/10` line.

None of the prompts asks the model for a confidence score. The assertion checked a requirement that was never part of the spec, so no model could pass it. The models were fine, and the test oracle was wrong.

This is the same rule as in ordinary testing: an assertion has to trace back to a requirement. For LLM evals it's easy to break, because a rubric written in plain English *reads* like a reasonable expectation even when the prompt never states it.

## Known limitations / next steps

- **Multiple choice doesn't need an LLM judge.** Whether the answer is `(B)` can be checked with a regex. That's free, fast and deterministic. The judge should be kept for things code can't check, like whether the explanation is correct.
- **The model grades itself.** GPT-5-mini is both under test and the judge, which risks self-preference bias. Use a different judge model.
- **The questions are too easy.** Textbook testing questions are likely to score near 100% for every model and prompt (a ceiling effect), so the experiment can't show differences.
- **One sample per test.** At temperature 1.0 a single run is noise. Run with `--repeat` and compare pass rates.
- **Coverage.** Add hallucination, prompt-injection, output-format (JSON), latency and cost checks, and run the suite in CI.
