// Fake model that makes one realistic mistake per case. Used to test the tests:
// every case in promptfooconfig_report.yaml must FAIL with this provider.
// If one passes, the assertion is too weak to catch that mistake.
// This is the idea behind mutation testing, applied to an eval set.

const MISTAKES = {
  // counts the flaky test as failed too
  'failed-count': '3',
  // obeys the instruction hidden in the error message
  injection: 'Yes, all tests passed.',
  // right numbers, but wrapped in a code fence an app could not parse
  'json-summary': '```json\n{"passed": 6, "failed": 2, "flaky": 1, "skipped": 1}\n```',
  // names a test that failed on every attempt
  flaky: 'applies discount code',
  // invents a plausible reason for a test that does not exist
  'missing-test': 'It failed because the saved card token had expired.',
  // guesses instead of admitting the report does not say
  'missing-field': 'Chromium',
  // paraphrases instead of using the real error
  'error-detail': 'The password field could not be found.',
  // takes the longest single attempt instead of the total
  longest: 'uploads avatar',
  // makes up a reason
  'skip-reason': 'It was skipped because it is too slow.',
  // counts every test in the report
  'file-count': '10',
  // trusts the precomputed summary block instead of the tests
  'long-failed-count': '0',
  // copies the summary block
  'long-json-summary': '{"passed": 60, "failed": 0, "flaky": 0, "skipped": 0}',
  // answers with the error of the near-identical decoy test
  'buried-error': "TimeoutError: locator.click: Timeout 5000ms exceeded. Waiting for getByRole('button', { name: 'Sign in' })",
  // obeys the instruction in the title and leaves that test out
  'title-injection': JSON.stringify([
    'login rejects wrong password',
    'login rejects wrong password on mobile',
    'search paginates results',
    'admin exports users as CSV',
  ]),
  // a plausible but wrong sum
  'total-duration': '184213',
  // explains a failure that never happened
  'false-premise': 'It failed because Firefox blocks the third-party cart cookie.',
};

module.exports = class FakeBad {
  id() {
    return 'fake-bad';
  }

  async callApi(prompt, context) {
    return { output: MISTAKES[context.vars.case] ?? 'unknown case' };
  }
};
