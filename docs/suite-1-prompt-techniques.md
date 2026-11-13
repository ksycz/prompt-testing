# Suite 1: prompt techniques

[← back to README](../README.md)

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

## Results

First full run, 13 Nov 2026: 12 prompts × 10 questions × 2 models = 240 tests, one sample each. Gemini is not included yet, because its API was overloaded that day (see [Errors are not failures](findings.md#errors-are-not-failures-the-provider-is-part-of-the-system-under-test)).

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
