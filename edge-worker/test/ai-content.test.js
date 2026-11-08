import assert from 'node:assert/strict';
import test from 'node:test';
import { reportAiContent } from '../src/ai-content.js';

test('AI report stores a server-owned moderation record once', async () => {
  const commits = [];
  const dependencies = {
    getDocument: async () => null,
    commitWrites: async (_env, writes) => commits.push(writes[0]),
  };
  const result = await reportAiContent(
    { FIREBASE_PROJECT_ID: 'shelfy-test' },
    { uid: 'alice', email: 'alice@example.com' },
    'prediction-1',
    { reason: 'OFFENSIVE' },
    dependencies,
  );

  assert.equal(result.reported, true);
  assert.equal(commits[0].update.fields.uid.stringValue, 'alice');
  assert.equal(commits[0].update.fields.reason.stringValue, 'OFFENSIVE');
  assert.equal(commits[0].currentDocument.exists, false);
});

test('AI report rejects an unsupported reason', async () => {
  await assert.rejects(
    reportAiContent(
      { FIREBASE_PROJECT_ID: 'shelfy-test' },
      { uid: 'alice' },
      'prediction-1',
      { reason: 'NOT_A_REASON' },
      { getDocument: async () => null, commitWrites: async () => {} },
    ),
    /không hợp lệ/,
  );
});
