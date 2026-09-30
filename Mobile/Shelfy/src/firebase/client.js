import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { resolveEmulatorHost, resolveFirebaseConfig } from './config';

const emulatorEnabled = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
  || (__DEV__ && !process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
const defaultProjectId = emulatorEnabled ? 'demo-shelfy' : undefined;
const firebaseConfig = resolveFirebaseConfig({
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: defaultProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || (emulatorEnabled ? '1:1234567890:android:demo' : undefined),
  EXPO_PUBLIC_USE_FIREBASE_EMULATOR: String(emulatorEnabled),
});

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error?.code !== 'auth/already-initialized') throw error;
  auth = getAuth(app);
}

const db = getFirestore(app);

if (emulatorEnabled) {
  const host = resolveEmulatorHost(
    { EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST },
    Platform.OS
  );

  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}

export { app, auth, db, firebaseConfig };
