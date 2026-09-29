# Google Calendar with Firebase Functions

The mobile app asks an authenticated callable for an authorization URL. Google
returns to the HTTPS Function callback, which consumes a single-use state and
PKCE verifier, exchanges the code, and stores tokens in the server-only
`_googleCalendarConnections/{uid}` collection. Mobile reads only the sanitized
`users/{uid}/integrationStatus/googleCalendar` status and its own event records.

After the Firebase project exists:

1. Enable the Google Calendar API, configure the OAuth consent screen, and add
   internal testers while the consent screen is in Testing mode.
2. Create a Google OAuth client of type **Web application**.
3. Copy `functions/.env.example` to `functions/.env.<firebase-project-id>` and
   set the OAuth client ID plus the exact callback URL. For project `shelfy-test`
   in `asia-southeast1`, the callback is:
   `https://asia-southeast1-shelfy-test.cloudfunctions.net/googleCalendarCallback`.
4. Register that same HTTPS callback under the OAuth client's authorized
   redirect URIs.
5. Add the client secret to Firebase Secret Manager with
   `firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET`.
6. Deploy the Functions, confirm the callback URL, then complete the Google
   consent flow from a signed-in APK test account.

Do not put the OAuth secret or provider tokens in the mobile environment file,
landing page, or any collection readable by a Firebase client. Disconnect
revokes the Google token best-effort, deletes the server credential, and clears
the cached event records. Event descriptions are sanitized and retained for up
to 30 days.

Local OAuth Emulator tests use mocked Google responses. A real connect/sync flow
cannot be validated until the project ID, OAuth client, consent screen, and
callback URI are configured.

## Official references

- [Google OAuth 2.0 web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Google Calendar events.list](https://developers.google.com/calendar/api/v3/reference/events/list)
- [Firebase Functions environment configuration](https://firebase.google.com/docs/functions/config-env)
