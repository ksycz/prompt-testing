# Findings

[← back to README](../README.md)

What building and running these evals taught, in the order it happened. Each finding is a short story: what happened, why, and what changed.

## The strict suite was 0% green, and the bug was in the test

The first runs of `promptfooconfig_strict.yaml` failed for all 4 prompts. The judge explained every failure the same way: the output had no `Confidence: N/10` line.

None of the prompts asks the model for a confidence score. The assertion checked a requirement that was never part of the spec, so no model could pass it. The models were fine, and the test oracle was wrong.

This is the same rule as in ordinary testing: an assertion has to trace back to a requirement. For LLM evals it's easy to break, because a rubric written in plain English *reads* like a reasonable expectation even when the prompt never states it.

## Code checks first, AI judge only where code can't decide

The first version graded multiple choice with an LLM judge. The config named GPT-5-mini as the judge, which is also one of the models under test. (Because of the `defaultTest` typo, promptfoo actually used its default OpenAI grader instead, so still the same vendor as the model under test.) That had two problems:

- **Self-grading.** A model judging its own answers risks self-preference bias.
- **The wrong tool.** Whether the answer is `(B)` is a yes/no fact. A regex checks it for free, instantly and the same way every time. A judge costs money, adds latency and can itself be wrong.

Now every prompt states the output format (`End your reply with a final line in the form "Answer: (X)"`), and the regex checks exactly that, so the assertion traces back to the prompt (see the finding above). This also measures **format compliance**: a correct answer followed by extra chatter fails, because the final line isn't the answer. An app parsing the reply would break the same way.

An LLM judge is still used in the strict suite for things a regex can't decide, such as whether the explanation is relevant. That judge comes from a different vendor than the model under test.

## Errors are not failures: the provider is part of the system under test

The first smoke runs (1 question, 36 calls) passed every test that got an answer, but Gemini returned **12 errors** both times, for two different reasons:

1. **404**: `gemini-2.5-flash` had been retired for new users. A model ID is a dependency that can disappear, just like a pinned library version.
2. **503**: the replacement, `gemini-3.8-flash`, was overloaded ("high demand"). promptfoo retried every call, so the run took almost 2 minutes instead of 17 seconds, and then gave up.

Neither one is a bug in the prompts, the tests or the model's answers. promptfoo reports them as *errors*, not *failures*, so an outage doesn't show up as bad model quality. This is the same distinction as a flaky test caused by test infrastructure versus a real bug.

In a CI pipeline this would need:
- retries with backoff for 503 and 429, and lower concurrency for a busy vendor
- the build failing on assertion failures, while provider errors are reported as a separate signal (or retried) rather than counted as a quality regression
- optionally a fallback model, so one vendor's outage doesn't block the whole run
- model IDs treated as dependencies: check them on a schedule, because vendors retire models

## 100% everywhere: the dataset is too easy, so the eval measures cost, not quality

All 240 tests passed. That doesn't mean the prompt techniques don't matter. It means **this dataset can't show it**: textbook testing questions are too easy for current models (a ceiling effect). An eval set that never fails can't catch a regression either.

What the run *did* show is the price of each technique. If accuracy is equal, the cheapest and fastest prompt wins, and in production that's the neutral baseline, not chain of thought. Latency and token cost are real metrics to assert on, next to correctness.

Next: harder questions or a domain dataset where models actually make mistakes, and `--repeat` to get pass rates and spread instead of one sample.

## Suite 2 passed too, but with the guardrails written into the prompt

All 20 tests passed, including the injection and both hallucination traps. That's a real result, but it comes with a condition: the system prompt in `report/prompt.json` *tells* the model the rules. It defines flaky, says to answer `Not in the report`, and says report text is data, not instructions. The result shows that **these guardrails work for these two models on this report**. It doesn't show that the models would resist without them.

The next experiment, now in the suite, is a guardrail ablation: the same cases with a prompt that keeps the spec and the answer format but drops the three defensive lines (see [the two prompt variants](suite-2-test-report-assistant.md#the-two-prompt-variants-guardrail-ablation)). The difference between the two runs is what the guardrails are actually worth. For production, the useful question isn't "is the model safe?" but "which line in the prompt is doing the work, and what breaks if someone deletes it?"

## The guardrails weren't needed, which means the traps are too easy

The ablation passed 40/40: these models resisted the injection and the hallucination bait even with the defensive lines removed. Two honest readings:

1. **Current small models handle naive attacks.** An instruction in an error message that says "ignore all previous instructions" is the textbook injection, and models are trained against exactly that.
2. **The eval is still too easy to measure the guardrails.** Like suite 1, a suite where everything passes can't show what a change is worth. The finding is about the test set as much as the models.

The guardrails still earned their place, just not on accuracy. They made answers about a third shorter, cheaper and consistently formatted, and in production a predictable format is what keeps the parser downstream working.

Next: harder adversarial cases where the models might actually fail. Six are now in the suite (see [Harder cases](suite-2-test-report-assistant.md#harder-cases)): a wrong summary block, an injection inside a test title, a buried test next to a decoy, a false premise, and a long sum. Run them with `--repeat 3` to get rates instead of single results.

## A one-letter typo switched off two checks, and `validate` said the config was fine

promptfoo's key for settings shared by all tests is `defaultTest`, singular. Two configs here used `defaultTests`. promptfoo ignores unknown keys without a warning, and `promptfoo validate` printed "Configuration is valid". The consequences:

1. **Suite 2's 20 s latency limit never ran.** It went unnoticed until GPT-5-mini answered in 34 s and still "passed".
2. **The strict suite's independent judge was never used.** The judge was meant to be Gemini, so that GPT-5-mini wouldn't be graded by its own vendor. In reality promptfoo used its default OpenAI grader, exactly the self-grading problem the setting was supposed to prevent. This was confirmed by running the strict suite without API keys: with `defaultTests` it asks for `OPENAI_API_KEY`, with `defaultTest` for `GOOGLE_API_KEY`.
3. **A wrong diagnosis.** Variables set in that block "came out empty", which was blamed on promptfoo and worked around with YAML anchors. It was the same typo; the workaround is gone now.

Why the self-test didn't catch it: the fake models answer instantly, so a missing latency check and a passing one look identical. Every mutation in `fake-bad.js` was a *wrong answer*; none was a *slow right answer*. Now one is: `file-count` waits 21 s and must fail. With the old key, that case passes, so the self-test catches this bug.

Lessons:
- **A check that never fails might not be running.** For each assertion, have at least one case that proves it can fail. That's the mutation idea again, but for every kind of check, not just answer content.
- **Schema validation is not behaviour validation.** "Config is valid" meant "no syntax errors", not "does what you meant".
- **Verify config effects, not just config text.** The quickest proof that the judge was wrong came from the error message about which API key was missing.

## Known limitations / next steps

- **The questions are too easy.** Confirmed by the first run: 240/240 passed. A harder or domain-specific dataset is needed.
- **One sample per test.** At temperature 1.0 a single run is noise. Run with `--repeat` and compare pass rates.
- **Suite 2 is still too easy on content**: 16 cases, 192/192 correct even without guardrails. What separated the models was latency, not accuracy. Next ideas: much longer reports (thousands of tests), several conflicting sources, or multi-turn conversations where the injection arrives later.
- **No cost assertion.** promptfoo can't price every model (Claude Haiku 5.5 in 0.125.1) and the `cost` assert errors out then. Cost is tracked in `summarize.py` instead.
- **CI covers suite 2 only.** Suite 1 is only validated, not self-tested; a fake model that always answers `(B)` should pass exactly the `(B)` questions, which would be a cheap addition.
