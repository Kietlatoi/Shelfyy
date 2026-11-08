const DAY = 86_400_000;
const FOLDERS = { avatar: 'avatars', wardrobe: 'wardrobe', tryOnInput: 'tryon-input' };

function createMediaService({ database, cloudinary, serverTimestamp, now = Date.now, HttpsError }) {
  function fail(message) {
    const error = HttpsError ? new HttpsError('failed-precondition', message) : Object.assign(new Error(message), { code: 'failed-precondition' });
    throw error;
  }
  function reference(uid, publicId) {
    const parts = typeof publicId === 'string' ? publicId.split('/') : [];
    if (parts.length !== 3 || parts[0] !== uid || !Object.values(FOLDERS).includes(parts[1]) || !/^[a-zA-Z0-9_-]+$/.test(parts[2])) {
      fail('Ảnh không thuộc tài khoản hiện tại.');
    }
    return database.doc(`users/${uid}/mediaAssets/${parts[2]}`);
  }
  async function register(uid, intent, publicId) {
    if (!FOLDERS[intent] || publicId.split('/')[1] !== FOLDERS[intent]) fail('Loại ảnh không hợp lệ.');
    await reference(uid, publicId).create({ uid, intent, publicId, deliveryType: intent === 'tryOnInput' ? 'authenticated' : 'upload',
      state: 'pending', cleanupAfterMillis: now() + DAY, createdAt: serverTimestamp() });
  }
  async function complete(uid, publicId) {
    const ref = reference(uid, publicId);
    const initial = await ref.get();
    if (!initial.exists || initial.data().publicId !== publicId || !['pending', 'ready', 'retained'].includes(initial.data().state)) fail('Phiên tải ảnh đã hết hạn.');
    if (initial.data().state !== 'pending') return initial.data().asset;
    const asset = await cloudinary.verifyUpload({ publicId, deliveryType: initial.data().deliveryType });
    await database.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (!current.exists || current.data().publicId !== publicId || !['pending', 'ready', 'retained'].includes(current.data().state)) fail('Phiên tải ảnh đã hết hạn.');
      if (current.data().state === 'pending') tx.update(ref, { asset, state: 'ready', cleanupAfterMillis: now() + DAY });
    });
    return asset;
  }
  // Read every attachment before writing; Firestore transactions require reads first.
  async function readAttachments(tx, uid, assets, intent) {
    const unique = [...new Map(assets.filter(Boolean).map((asset) => [asset.publicId, asset])).values()];
    return Promise.all(unique.map(async (asset) => {
      const ref = reference(uid, asset.publicId);
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data().publicId !== asset.publicId || snap.data().intent !== intent || !['ready', 'retained'].includes(snap.data().state)
        || snap.data().asset?.secureUrl !== asset.secureUrl) fail('Ảnh chưa được xác minh. Vui lòng tải lại ảnh.');
      return ref;
    }));
  }
  function retain(tx, refs) {
    for (const ref of refs) tx.update(ref, { state: 'retained', cleanupAfterMillis: now() + 30 * DAY });
  }
  function release(tx, uid, assets) {
    for (const asset of new Map(assets.filter(Boolean).map((a) => [a.publicId, a])).values()) {
      tx.set(reference(uid, asset.publicId), { cleanupAfterMillis: now() + DAY }, { merge: true });
    }
  }
  async function setAvatar(uid, avatar) {
    const userRef = database.doc(`users/${uid}`);
    await database.runTransaction(async (tx) => {
      const [user, refs] = await Promise.all([tx.get(userRef), readAttachments(tx, uid, [avatar], 'avatar')]);
      if (!user.exists) fail('Không tìm thấy hồ sơ.');
      retain(tx, refs);
      if (user.data().avatar?.publicId !== avatar?.publicId) release(tx, uid, [user.data().avatar]);
      tx.update(userRef, { avatar: avatar ? { secureUrl: avatar.secureUrl, publicId: avatar.publicId } : null, updatedAt: serverTimestamp() });
    });
    return { updated: true };
  }
  async function cleanupOne(ref) {
    let claimed;
    await database.runTransaction(async (tx) => {
      claimed = null;
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data().state === 'deleted' || snap.data().cleanupAfterMillis > now()) return;
      const data = snap.data();
      if (!data.uid || !data.publicId) return;
      const user = database.doc(`users/${data.uid}`);
      const queries = [
        user,
        user.collection('wardrobe').where('image.publicId', '==', data.publicId).limit(1),
        user.collection('wardrobe').where('thumbnail.publicId', '==', data.publicId).limit(1),
        ...['suggestions', 'dailyOutfits', 'tryOns'].map((name) => user.collection(name).where('mediaPublicIds', 'array-contains', data.publicId).limit(1)),
        database.collection('_tryOnJobs').where('personImage.publicId', '==', data.publicId).limit(1),
      ];
      const [profile, ...references] = await Promise.all(queries.map((query) => tx.get(query)));
      if (data.state !== 'deleting' && (profile.data()?.avatar?.publicId === data.publicId || references.some((result) => !result.empty))) {
        tx.update(ref, { cleanupAfterMillis: now() + 30 * DAY });
        return;
      }
      tx.update(ref, { state: 'deleting', cleanupAfterMillis: now() + 60_000 });
      claimed = data;
    });
    if (!claimed) return;
    await cloudinary.deleteImage(claimed.publicId, claimed.deliveryType);
    await ref.update({ state: 'deleted', cleanupAfterMillis: Number.MAX_SAFE_INTEGER, deletedAt: serverTimestamp() });
  }
  async function cleanup() {
    const due = await database.collectionGroup('mediaAssets').where('cleanupAfterMillis', '<=', now()).orderBy('cleanupAfterMillis').limit(40).get();
    for (const snap of due.docs) {
      try { await cleanupOne(snap.ref); }
      catch { await snap.ref.update({ cleanupAfterMillis: now() + 60 * 60_000 }); }
    }
    return { examined: due.size };
  }
  return { register, complete, readAttachments, retain, release, setAvatar, cleanup, cleanupOne, reference };
}
module.exports = { createMediaService };
