# prompt-testing

[![Eval self-test](https://github.com/ksycz/prompt-testing/actions/workflows/selftest.yml/badge.svg)](https://github.com/ksycz/prompt-testing/actions/workflows/selftest.yml)

LLM evals with [promptfoo](https://promptfoo.dev), built the way I'd build a test suite: checks in code first, an AI judge only where code can't decide, and fake models that test the tests.

## Two suites

| Suite | Question | Details |
|---|---|---|
| **1. Prompt techniques** | Does emotional pressure, an expert persona, chain of thought or the tone of the system message change how well a model answers? | [docs/suite-1-prompt-techniques.md](docs/suite-1-prompt-techniques.md) |
| **2. Test-report assistant** | Can a model answer questions about a CI test report without hallucinating, obeying instructions hidden in the data, or breaking the output format? | [docs/suite-2-test-report-assistant.md](docs/suite-2-test-report-assistant.md) |

Models: GPT-5-mini, Gemini 3.8 Flash and Claude Haiku 5.5, the small, fast tier of each vendor. (Gemini's API was overloaded during the first runs, so the results below are for the other two.)

## Results in short

- **Suite 1: 240/240 correct.** The prompt technique didn't change correctness, only cost: chain of thought used about 55% more tokens and took about 35% longer, for no gain. The questions were too easy to show a difference.
- **Suite 2: 192/192 correct**, even with the protective lines removed from the prompt and with harder traps (a wrong summary block, an injection inside a test title, a buried test next to a decoy, a false premise). What separated the models was **latency**: with the 20 s limit applied, GPT-5-mini failed 8 of 192, mostly by spending 30 s and about 2,100 tokens summing 66 numbers. Haiku stayed under 5.5 s.

## What I learned

Each of these is a short story in [docs/findings.md](docs/findings.md):

1. **The strict suite was 0% green, and the bug was in the test**: it checked for a confidence score the prompt never asked for.
2. **Code checks first**: a regex grades multiple choice for free, and the first AI judge was grading its own vendor.
3. **Errors are not failures**: a retired model (404) and an overloaded API (503) are not bad answers.
4. **100% everywhere means the dataset is too easy**, so the eval measured cost, not quality.
5. **The guardrails weren't needed**, so the traps were too easy. The guardrails still earned their place through shorter, consistent answers.
6. **A one-letter typo (`defaultTests` vs `defaultTest`) silently switched off two checks**, and `promptfoo validate` said the config was fine. It was caught because a result looked too good; now the self-test proves every check can fail.

## Quick start

```bash
# API keys in .env (gitignored): OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
npx promptfoo@0.125.1 eval --no-cache --no-table                                # suite 1
npx promptfoo@0.125.1 eval -c promptfooconfig_report.yaml --no-cache --no-table  # suite 2
python3 summarize.py results*.json                                             # tables
npx promptfoo@0.125.1 view                                                     # browse results
```

Add `--filter-providers 'openai|anthropic'` to skip a model, and `--repeat 3` for pass rates instead of single results.

**Self-test without API keys**: every check must pass with an always-right fake model and fail with an always-wrong one:

```bash
npx promptfoo@0.125.1 eval -c promptfooconfig_report.yaml --providers file://report/fake-good.js --no-cache --no-write --no-table -o good.json
npx promptfoo@0.125.1 eval -c promptfooconfig_report.yaml --providers file://report/fake-bad.js --no-cache --no-write --no-table -o bad.json
python3 report/check_selftest.py good.json bad.json
```

CI runs this self-test on every PR for free. Real models run only when triggered by hand. More in [docs/running.md](docs/running.md): all files, flags, the two CI workflows, and troubleshooting.

## Docs

| | |
|---|---|
| [Suite 1: prompt techniques](docs/suite-1-prompt-techniques.md) | setup and results |
| [Suite 2: test-report assistant](docs/suite-2-test-report-assistant.md) | setup, the guardrail ablation, all 16 cases, testing the tests, results |
| [Findings](docs/findings.md) | the stories above in full, plus known limitations |
| [Running the evals](docs/running.md) | files, commands, CI, troubleshooting |
