import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/client';

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

export function createFirebaseAuthApi(firebaseAuth, firestore, authFunctions, firestoreFunctions) {
  const {
    createUserWithEmailAndPassword: createAccount,
    reauthenticateWithCredential: reauthenticate,
    sendPasswordResetEmail: sendResetEmail,
    signInWithEmailAndPassword: signIn,
    signOut: signOutUser,
    updatePassword: changeFirebasePassword,
    updateProfile: updateFirebaseUserProfile,
    verifyPasswordResetCode: verifyResetCode,
    confirmPasswordReset: confirmReset,
    EmailAuthProvider: emailProvider,
  } = authFunctions;
  const { doc: document, getDoc: getDocument, serverTimestamp: timestamp, setDoc: setDocument, updateDoc: updateDocument } = firestoreFunctions;

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

  function passwordResetActionSettings() {
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim()
      || firebaseAuth.app?.options?.projectId;
    const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim()
      || firebaseAuth.app?.options?.authDomain
      || (projectId ? `${projectId}.firebaseapp.com` : '');
    const continueUrl = process.env.EXPO_PUBLIC_FIREBASE_PASSWORD_RESET_CONTINUE_URL?.trim()
      || (authDomain ? `https://${authDomain}` : '');
    if (!continueUrl.startsWith('https://')) {
      throw new Error('Thiếu domain HTTPS của Firebase để gửi link đặt lại mật khẩu.');
    }
    const settings = {
      url: continueUrl,
      android: { packageName: 'com.shelfy.app', installApp: false },
      handleCodeInApp: true,
    };
    const linkDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN?.trim();
    if (linkDomain) settings.linkDomain = linkDomain.replace(/^https?:\/\//, '').split('/')[0];
    return settings;
  }

  return {
    async login({ email, password }) {
      const credential = await signIn(firebaseAuth, email.trim(), password);
      const user = await ensureProfile(credential.user);
      return { user };
    },
    async register({ email, password, fullName }) {
      const credential = await createAccount(firebaseAuth, email.trim(), password);
      const normalizedName = fullName.trim();
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
      await sendResetEmail(firebaseAuth, email.trim(), passwordResetActionSettings());
    },
    async resetPassword({ token, oobCode, newPassword }) {
      const code = oobCode || token;
      await verifyResetCode(firebaseAuth, code);
      await confirmReset(firebaseAuth, code, newPassword);
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
        await httpsCallable(functions, 'setProfileAvatar')({ avatar: updates.avatar });
      }
      if (Object.hasOwn(updates, 'profile')) patch.profile = updates.profile;
      if (Object.hasOwn(updates, 'timeZone')) patch.timeZone = updates.timeZone;
      const ref = document(firestore, 'users', user.uid);
      await updateDocument(ref, { ...patch, updatedAt: timestamp() });
      const snapshot = await getDocument(ref);
      return mapUser(user, snapshot.data());
    },
  };
}

const authApi = createFirebaseAuthApi(auth, db, {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile: updateFirebaseProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
}, { doc, getDoc, serverTimestamp, setDoc, updateDoc });

export const { login, register, logout, getCurrentUser, forgotPassword, resetPassword, changePassword, updateProfile } = authApi;
export const subscribeToAuthState = (listener, onError) => onAuthStateChanged(auth, listener, onError);

export async function deleteAccount(currentPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Vui lòng đăng nhập lại.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await user.getIdToken(true);
  const result = await httpsCallable(functions, 'requestAccountDeletion')({});
  await signOut(auth);
  return result.data;
}
