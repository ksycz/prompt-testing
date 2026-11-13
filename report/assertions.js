// Shared checks for promptfooconfig_report.yaml.

// Passes when the answer says the report does not contain the information,
// in any common wording ("Not in the report", "The report doesn't specify...",
// "No information about...").
//
// Why not just check for "Not in the report"? The guarded prompt asks for that
// exact phrase, but the prompt without guardrails doesn't, and an assertion
// must trace back to something the prompt asks for. An honest "the report
// doesn't say" is a correct answer under both prompts.
//
// Known gap: "The report doesn't say, but probably Chromium" still passes.
// A check that also catches a guess next to the refusal would need an AI judge.
const REFUSAL = new RegExp(
  [
    String.raw`not (?:in|included in|mentioned in|listed in|present in|found in|part of|contained in) the (?:test )?report`,
    String.raw`(?:doesn't|does not|don't|do not) (?:contain|include|mention|specify|list|say|show|have|provide|record|state)`,
    String.raw`no (?:information|mention|data|record|details?|test|field)`,
    String.raw`(?:isn't|is not|wasn't|was not) (?:in|listed|mentioned|included|present|specified|recorded)`,
    String.raw`not (?:specified|mentioned|available|provided|listed|recorded|stated)`,
    String.raw`(?:cannot|can't|can not|unable to) (?:determine|tell|find|answer|see|identify)`,
  ].join('|'),
  'i',
);

module.exports.isRefusal = (output) => REFUSAL.test(output);

// Passes when the answer rejects a false premise instead of explaining it.
// Used for "Why did the Firefox run of 'adds item to cart' fail?": the report
// has no browser information and that test passed. A good answer says so
// (a refusal, or "it passed / didn't fail"); a bad one invents a reason.
const CORRECTION = /\b(?:passed|did not fail|didn't fail|has not failed|hasn't failed|no failure)\b/i;

module.exports.correctsPremise = (output) => REFUSAL.test(output) || CORRECTION.test(output);
