import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { edgePublicRequest, edgeRequest } from './edgeApi';

function mapUser(user, profile = {}) {
  return {
    uid: user.uid,
    email: user.email || '',
    fullName: profile.fullName || user.displayName || '',
    avatar: profile.avatar || null,
    avatarUrl: profile.avatar?.secureUrl || user.photoURL || null,
    phone: profile.phone || '',
    profile: profile.profile || {},
    timeZone: profile.timeZone || '',
  };
}

export function getLoginErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email hoặc mật khẩu không đúng.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị vô hiệu hóa.';
    case 'auth/too-many-requests':
      return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/network-request-failed':
      return 'Không thể kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
    default:
      return 'Đăng nhập không thành công. Vui lòng thử lại.';
  }
}

export function createFirebaseAuthApi(firebaseAuth, firestore, authFunctions, firestoreFunctions, edgeFunctions = {}) {
  const {
    reauthenticateWithCredential: reauthenticate,
    signInWithEmailAndPassword: signIn,
    signOut: signOutUser,
    updatePassword: changeFirebasePassword,
    updateProfile: updateFirebaseUserProfile,
    EmailAuthProvider: emailProvider,
  } = authFunctions;
  const { doc: document, getDoc: getDocument, serverTimestamp: timestamp, setDoc: setDocument, updateDoc: updateDocument } = firestoreFunctions;
  const publicRequest = edgeFunctions.publicRequest || edgePublicRequest;

  async function ensureProfile(user, preferredName = '') {
    const ref = document(firestore, 'users', user.uid);
    const snapshot = await getDocument(ref);
    if (snapshot.exists()) return mapUser(user, snapshot.data());

    const fullName = preferredName.trim() || user.displayName || user.email?.split('@')[0] || 'Shelfy user';
    const profile = {
      fullName,
      email: user.email || '',
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    try {
      await setDocument(ref, profile);
      return mapUser(user, profile);
    } catch (error) {
      // A second device may have created the profile between getDoc and setDoc.
      const latest = await getDocument(ref);
      if (latest.exists()) return mapUser(user, latest.data());
      throw error;
    }
  }

  return {
    async login({ email, password }) {
      try {
        const credential = await signIn(firebaseAuth, email.trim(), password);
        const user = await ensureProfile(credential.user);
        return { user };
      } catch (error) {
        const loginError = new Error(getLoginErrorMessage(error));
        loginError.code = error?.code;
        throw loginError;
      }
    },
    async requestRegistrationCode(email) {
      return publicRequest('/v1/auth/registration-codes', {
        body: { email: email.trim() },
      });
    },
    async register({ email, password, fullName, challengeId, code }) {
      const normalizedEmail = email.trim();
      const normalizedName = fullName.trim();
      const registration = await publicRequest('/v1/auth/registrations', {
        body: {
          email: normalizedEmail,
          password,
          fullName: normalizedName,
          challengeId,
          code,
        },
      });
      const credential = await signIn(firebaseAuth, normalizedEmail, password);
      if (registration?.uid && registration.uid !== credential.user.uid) {
        await signOutUser(firebaseAuth);
        throw new Error('Tài khoản vừa tạo không khớp với phiên đăng nhập.');
      }
      await updateFirebaseUserProfile(credential.user, { displayName: normalizedName });
      const user = await ensureProfile(credential.user, normalizedName);
      return { user };
    },
    async logout() {
      await signOutUser(firebaseAuth);
    },
    async getCurrentUser() {
      return firebaseAuth.currentUser ? ensureProfile(firebaseAuth.currentUser) : null;
    },
    async forgotPassword(email) {
      return publicRequest('/v1/auth/password-reset-codes', {
        body: { email: email.trim() },
      });
    },
    async resetPassword({ email, challengeId, code, newPassword }) {
      return publicRequest('/v1/auth/password-resets', {
        body: { email: email.trim(), challengeId, code, newPassword },
      });
    },
    async changePassword({ currentPassword, newPassword }) {
      const user = firebaseAuth.currentUser;
      if (!user?.email) throw new Error('Vui lòng đăng nhập lại để đổi mật khẩu.');
      const credential = emailProvider.credential(user.email, currentPassword);
      await reauthenticate(user, credential);
      await changeFirebasePassword(user, newPassword);
    },
    async updateProfile(updates) {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');
      const patch = {};
      if (typeof updates.fullName === 'string') {
        const fullName = updates.fullName.trim();
        await updateFirebaseUserProfile(user, { displayName: fullName });
        patch.fullName = fullName;
      }
      if (Object.hasOwn(updates, 'phone')) patch.phone = updates.phone;
      if (Object.hasOwn(updates, 'avatar')) {
        patch.avatar = updates.avatar;
        await updateFirebaseUserProfile(user, { photoURL: updates.avatar?.secureUrl || null });
      }
      if (Object.hasOwn(updates, 'profile')) patch.profile = updates.profile;
      if (Object.hasOwn(updates, 'timeZone')) patch.timeZone = updates.timeZone;
      const ref = document(firestore, 'users', user.uid);
      const before = await getDocument(ref);
      await updateDocument(ref, { ...patch, updatedAt: timestamp() });
      const snapshot = await getDocument(ref);
      const previousAvatarId = before.data()?.avatar?.publicId;
      if (Object.hasOwn(updates, 'avatar')
        && previousAvatarId && previousAvatarId !== updates.avatar?.publicId) {
        await edgeRequest('/v1/media', {
          method: 'DELETE',
          body: { publicIds: [previousAvatarId] },
        }).catch(() => {});
      }
      return mapUser(user, snapshot.data());
    },
  };
}

const authApi = createFirebaseAuthApi(auth, db, {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile: updateFirebaseProfile,
}, { doc, getDoc, serverTimestamp, setDoc, updateDoc }, { publicRequest: edgePublicRequest });

export const { login, requestRegistrationCode, register, logout, getCurrentUser, forgotPassword, resetPassword, changePassword, updateProfile } = authApi;
export const subscribeToAuthState = (listener, onError) => onAuthStateChanged(auth, listener, onError);

export async function deleteAccount(currentPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Vui lòng đăng nhập lại.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await user.getIdToken(true);
  await edgeRequest('/v1/account/anonymize-billing', { body: {} });

  const subcollections = [
    'wardrobe', 'dailyOutfits', 'suggestions', 'tryOns', 'weatherSnapshots',
    'calendarEvents', 'integrationStatus', 'mediaAssets',
  ];
  const snapshots = await Promise.all(subcollections.map((name) => getDocs(
    collection(db, 'users', user.uid, name),
  )));
  const profile = await getDoc(doc(db, 'users', user.uid));
  const publicIds = new Set();
  const addPublicId = (value) => {
    if (typeof value === 'string' && value.startsWith(`${user.uid}/`)) publicIds.add(value);
  };
  addPublicId(profile.data()?.avatar?.publicId);
  snapshots.forEach((snapshot) => snapshot.docs.forEach((entry) => {
    const data = entry.data();
    addPublicId(data.image?.publicId);
    addPublicId(data.thumbnail?.publicId);
    addPublicId(data.resultImage?.publicId);
    addPublicId(data.personImagePublicId);
    addPublicId(data.publicId);
    if (Array.isArray(data.mediaPublicIds)) data.mediaPublicIds.forEach(addPublicId);
  }));

  const ids = [...publicIds];
  for (let offset = 0; offset < ids.length; offset += 5) {
    await edgeRequest('/v1/media', {
      method: 'DELETE',
      body: { publicIds: ids.slice(offset, offset + 5) },
    });
  }

  for (const name of subcollections) {
    let page;
    do {
      page = await getDocs(query(collection(db, 'users', user.uid, name), limit(400)));
      if (!page.empty) {
        const batch = writeBatch(db);
        page.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
      }
    } while (!page.empty);
  }
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
  return { deleted: true };
}
