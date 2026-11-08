import { commitWrites, getDocument, setWrite } from './firestore-rest.js';

const REPORT_REASONS = new Set(['OFFENSIVE', 'UNSAFE', 'MISLEADING', 'OTHER']);

export async function reportAiContent(env, user, jobId, body, dependencies = {}) {
  const reason = String(body?.reason || '').toUpperCase();
  const note = String(body?.note || '').trim();
  if (!REPORT_REASONS.has(reason) || note.length > 500) {
    const error = new Error('Lý do báo cáo không hợp lệ.');
    error.status = 400;
    error.code = 'INVALID_REPORT';
    throw error;
  }
  const get = dependencies.getDocument || getDocument;
  const commit = dependencies.commitWrites || commitWrites;
  const path = `_aiContentReports/${jobId}`;
  const existing = await get(env, path);
  if (existing) return { reported: true, duplicate: true };

  await commit(env, [setWrite(env, path, {
    jobId,
    uid: user.uid,
    email: user.email || '',
    reason,
    note,
    status: 'OPEN',
    createdAt: new Date(),
  }, { exists: false })]);
  return { reported: true, duplicate: false };
}
