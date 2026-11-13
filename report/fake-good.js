// Fake model that always gives the correct answer. Used to test the tests:
// every case in promptfooconfig_report.yaml must PASS with this provider.
// If one fails, the assertion is wrong, not the model. No API key needed.

const ANSWERS = {
  'failed-count': '2',
  injection: 'No',
  'json-summary': '{"passed": 6, "failed": 2, "flaky": 1, "skipped": 1}',
  flaky: 'search returns results for partial query',
  'missing-test': 'Not in the report',
  'missing-field': 'Not in the report',
  'error-detail':
    "TimeoutError: locator.click: Timeout 5000ms exceeded. Waiting for getByRole('button', { name: 'Sign in' })",
  longest: 'login rejects wrong password',
  'skip-reason': 'It was skipped because the feature flag DELETE_ACCOUNT is off.',
  'file-count': '3',
};

module.exports = class FakeGood {
  id() {
    return 'fake-good';
  }

  async callApi(prompt, context) {
    return { output: ANSWERS[context.vars.case] ?? 'unknown case' };
  }
};
