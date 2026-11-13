// All prompts for promptfooconfig.yaml, generated from two lists:
// 4 prompting techniques x 3 system-message tones = 12 prompts.
//
// Each combination is exported as a named function, e.g. `persona_academic`.
// promptfoo needs every function listed by name in promptfooconfig.yaml
// (`file://prompts.js:persona_academic`); a bare `file://prompts.js` does not
// pick up multiple exports. The name also becomes the label in the results.
//
// To add a technique or a tone: add one entry below, then list the new
// combinations in promptfooconfig.yaml.

// How the question is asked (the user message)
const TECHNIQUES = {
  baseline: 'Answer the following question: ',
  emotional: 'Answer the following question. This is very important to my career!: ',
  persona: 'You are an expert Software Tester. Answer the following question: ',
  cot: "Answer the following question. Let's think step-by-step: ", // zero-shot chain of thought
};

// How the model should sound (the system message)
const TONES = {
  neutral: 'You are a helpful assistant',
  academic:
    'Respond in a formal and academic tone. Use complex sentence structures and advanced vocabulary',
  informal:
    "Respond in a casual, friendly tone as if you're talking to a close friend. Use simple language and include emojis where appropriate",
};

// The output format the regex in questions.csv checks. It is part of the
// prompt on purpose: an assertion must trace back to something the prompt asks for.
const ANSWER_FORMAT =
  '\n\nEnd your reply with a final line in the form "Answer: (X)", where X is the letter of your choice.';

for (const [technique, instruction] of Object.entries(TECHNIQUES)) {
  for (const [tone, system] of Object.entries(TONES)) {
    module.exports[`${technique}_${tone}`] = ({ vars }) =>
      JSON.stringify([
        { role: 'system', content: system },
        { role: 'user', content: instruction + vars.question + ANSWER_FORMAT },
      ]);
  }
}
