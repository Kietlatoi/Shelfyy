import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserSessionPersistence, getAuth, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
if (missing.length) throw new Error(`Thiếu cấu hình Firebase: ${missing.join(', ')}`);

const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);

export async function adminSignIn(email, password) {
  await setPersistence(auth, browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function adminSignOut() {
  return signOut(auth);
}
