const crypto = require('node:crypto');

function createAccountLifecycle({ database, auth, cloudinary, tryOn, calendar, serverTimestamp, now = Date.now, HttpsError }) {
  function fail(code, message) {
    throw HttpsError ? new HttpsError(code, message) : Object.assign(new Error(message), { code });
  }
  function validUid(uid) {
    if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) fail('invalid-argument', 'UID không hợp lệ.');
  }
  async function requestDeletion(uid, actor) {
    validUid(uid);
    const job = database.doc(`_accountDeletionJobs/${uid}`);
    await database.runTransaction(async (tx) => {
      const existing = await tx.get(job);
      if (existing.exists) return;
      tx.set(database.doc(`_accountAccess/${uid}`), { status: 'deleting', updatedAt: serverTimestamp() });
      tx.create(job, { uid, phase: 'tryOns', cursor: null, nextAttemptMillis: now() + 120_000,
        mediaAfterMillis: now() + 65 * 60_000, requestedAt: serverTimestamp() });
      tx.create(database.collection('_adminAudit').doc(), { action: 'request-account-deletion', uid, actor, createdAt: serverTimestamp() });
    });
    return { accepted: true };
  }
  async function requestSelfDeletion(request) {
    const uid = request.auth?.uid;
    if (!uid) fail('unauthenticated', 'Vui lòng đăng nhập.');
    const authTime = Number(request.auth.token?.auth_time) * 1000;
    if (!Number.isFinite(authTime) || now() - authTime > 5 * 60_000 || authTime > now() + 60_000) {
      fail('failed-precondition', 'Vui lòng xác thực lại mật khẩu trước khi xóa tài khoản.');
    }
    return requestDeletion(uid, `user:${uid}`);
  }
  async function setDisabled(uid, disabled, actor) {
    validUid(uid);
    const access = database.doc(`_accountAccess/${uid}`);
    await database.runTransaction(async (tx) => {
      const current = await tx.get(access);
      if (['deleting', 'deleted'].includes(current.data()?.status)) fail('failed-precondition', 'Tài khoản đang được xóa.');
      if (disabled) tx.set(access, { status: 'disabled', updatedAt: serverTimestamp() });
    });
    // Deny data before revoking Auth; enable Auth before granting data access.
    await auth.updateUser(uid, { disabled });
    await auth.revokeRefreshTokens(uid);
    if (!disabled) await database.runTransaction(async (tx) => {
      const current = await tx.get(access);
      if (['deleting', 'deleted'].includes(current.data()?.status)) fail('failed-precondition', 'Tài khoản đang được xóa.');
      tx.set(access, { status: 'active', updatedAt: serverTimestamp() });
    });
    await database.collection('_adminAudit').add({ action: disabled ? 'disable-account' : 'enable-account', uid, actor, createdAt: serverTimestamp() });
  }
  async function processDeletion(uid) {
    validUid(uid);
    const jobRef = database.doc(`_accountDeletionJobs/${uid}`);
    const lease = crypto.randomUUID();
    let job;
    await database.runTransaction(async (tx) => {
      job = null;
      const snap = await tx.get(jobRef);
      if (!snap.exists || snap.data().phase === 'complete' || Number(snap.data().leaseUntilMillis) > now()) return;
      job = snap.data();
      tx.update(jobRef, { lease, leaseUntilMillis: now() + 9 * 60_000, nextAttemptMillis: now() + 10 * 60_000 });
    });
    if (!job) return;
    try {
      try { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); }
      catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
      const userRef = database.doc(`users/${uid}`);
      let phase = job.phase;
      let cursor = job.cursor;
      if (phase === 'tryOns') {
        let query = userRef.collection('tryOns').orderBy('__name__').limit(10);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        for (const snap of page.docs) {
          await tryOn.deleteHistory(uid, snap.id);
          const [publicJob, privateJob] = await Promise.all([snap.ref.get(), database.doc(`_tryOnJobs/${snap.id}`).get()]);
          if (publicJob.data()?.resultCleanupPending || privateJob.data()?.inputCleanupPending || privateJob.data()?.cancellationPending) {
            throw new Error('Provider cleanup pending');
          }
          await database.doc(`_tryOnJobs/${snap.id}`).delete();
        }
        if (page.size === 10) cursor = page.docs.at(-1).id;
        else { phase = 'media'; cursor = null; }
      } else if (phase === 'media') {
        // Previously issued upload signatures remain valid for an hour. Wait
        // before deleting their registry, so a late upload cannot become orphaned.
        if (Number(job.mediaAfterMillis) > now()) {
          await jobRef.update({ leaseUntilMillis: 0, nextAttemptMillis: job.mediaAfterMillis });
          return;
        }
        const page = await userRef.collection('mediaAssets').limit(20).get();
        for (const asset of page.docs) {
          const data = asset.data();
          if (!data.publicId?.startsWith(`${uid}/`)) fail('data-loss', 'Asset ownership mismatch');
          await cloudinary.deleteImage(data.publicId, data.deliveryType);
          await asset.ref.delete();
        }
        if (page.empty) phase = 'records';
      } else if (phase === 'records') {
        await calendar.disconnect(uid);
        // Provider transaction ledger is private and retained for reconciliation.
        await database.recursiveDelete(userRef);
        for (const name of ['_calendarOAuthStates', '_suggestionReceipts', '_wearEventReceipts', '_tryOnReceipts']) {
          const records = await database.collection(name).where('uid', '==', uid).get();
          for (const doc of records.docs) await doc.ref.delete();
        }
        for (const name of ['_wardrobeCounters', '_uploadRateLimits', '_pendingPaymentByUser', '_googleCalendarConnections']) {
          await database.doc(`${name}/${uid}`).delete();
        }
        await database.doc(`_tryOnUsage/${crypto.createHash('sha256').update(uid).digest('hex')}`).delete();
        try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
        await database.doc(`_accountAccess/${uid}`).set({ status: 'deleted', updatedAt: serverTimestamp() });
        phase = 'complete';
      }
      await jobRef.update({ phase, cursor, leaseUntilMillis: 0, nextAttemptMillis: phase === 'complete' ? Number.MAX_SAFE_INTEGER : now(), updatedAt: serverTimestamp() });
    } catch (error) {
      await jobRef.update({ leaseUntilMillis: 0, nextAttemptMillis: now() + 5 * 60_000, lastErrorCode: String(error.code || 'cleanup-pending').slice(0, 80) });
      throw error;
    }
  }
  async function processQueue() {
    const due = await database.collection('_accountDeletionJobs').where('nextAttemptMillis', '<=', now()).orderBy('nextAttemptMillis').limit(10).get();
    for (const snap of due.docs) {
      try { await processDeletion(snap.id); } catch { /* Persisted retry; private status is available to operators. */ }
    }
    return { examined: due.size };
  }
  return { requestDeletion, requestSelfDeletion, setDisabled, processDeletion, processQueue };
}
module.exports = { createAccountLifecycle };
