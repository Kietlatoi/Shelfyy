# Android password reset links

The app uses the Firebase Hosting email-action link and opens Android directly into the password reset screen.

`Mobile/Shelfy/app.config.js` sets the Android application ID to `com.shelfy.app` and adds a verified link filter for `https://PROJECT_ID.firebaseapp.com/__/auth/links`. Set `EXPO_PUBLIC_FIREBASE_PROJECT_ID` before generating an APK so the native manifest matches the Firebase project.

Before testing a real reset email:

1. Create the Firebase project and Android app with package ID `com.shelfy.app`.
2. Add the SHA-1 and SHA-256 fingerprints for the APK signing certificate in Firebase Project Settings. For EAS, retrieve the fingerprints with `eas credentials -p android` after configuring the Android credentials.
3. Enable Email/Password authentication and confirm `PROJECT_ID.firebaseapp.com` is available as a Firebase Hosting link domain. Add any custom `EXPO_PUBLIC_FIREBASE_AUTH_LINK_DOMAIN` to Firebase Hosting and use that same domain in the Android intent filter.
4. Keep `EXPO_PUBLIC_FIREBASE_PASSWORD_RESET_CONTINUE_URL` on an HTTPS domain in Firebase Authentication's authorized domains. By default, the app uses `https://PROJECT_ID.firebaseapp.com`.
5. Build a new APK after changing project ID, link domain, or signing certificate. Android reads the intent filter from the installed manifest.

The route `app/__/auth/links.jsx` parses the nested Firebase action link with `parseActionCodeURL`, accepts only `resetPassword`, and forwards its action code to the existing reset form. Firebase still verifies the code and applies the new password; the app never trusts user or continue-URL data as proof of identity.

Password reset App Links cannot be fully smoke-tested until a Firebase project and signing certificate exist. Emulator tests cover URL parsing and generated Expo config; validate the real email link on a signed internal APK after Firebase setup.
