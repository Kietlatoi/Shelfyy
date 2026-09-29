# Shelfy Firestore model and access rules

Status: implementation contract draft based on the checked-in code and SQL migrations. Do not import production data or deploy production Rules from this draft until the open decisions in `firebase-mobile-migration-plan.md` are closed and the Rules tests pass in the emulator.

## 1. Principles

- Firebase Auth UID is the owner key. Every personal path is scoped under `users/{uid}`. A Firebase ID token establishes the caller; a client supplied `uid`, email or role never establishes authority.
- Personal content uses documents and subcollections. Do not store an unbounded wardrobe, history, calendar or try-on list in one profile document.
- Generate string document IDs for new records. There is no legacy ID mapping because the owner confirmed old records/accounts do not need migration.
- Server controlled business state (status/ban, role, Premium, expiry, payment result, AI quota, job status, counters, OAuth credentials) is writable only by trusted Functions/Admin operations.
- Rules are deny-by-default. A nested path must check `request.auth.uid == uid`; Rules do not filter broad queries into safe subsets. Callable/HTTP Functions must verify the Firebase ID token and authorization themselves because Admin SDK operations bypass Firestore Rules.
- Keep external provider responses and raw OAuth/payment payloads out of documents readable by the client. Keep secrets in Functions secret configuration, never in `EXPO_PUBLIC_*`, Firestore client documents, or landing config.
- Use server timestamps for authoritative actions. Store the user's explicit IANA timezone when applicable. Store `dateKey` (`YYYY-MM-DD`) alongside a Timestamp for date based queries; do not compare formatted client strings as instants.

## 2. Paths and document contracts

Illustrative shape, not a literal migration export. Only fields called out in the write contract may be client written.

```text
users/{uid}
  users/{uid}/wardrobe/{itemId}
  users/{uid}/dailyOutfits/{outfitRecordId}
  users/{uid}/suggestions/{suggestionId}
  users/{uid}/tryOns/{jobId}
  users/{uid}/weatherSnapshots/{snapshotId}
  users/{uid}/calendarEvents/{eventKey}
  users/{uid}/integrationStatus/googleCalendar
  users/{uid}/entitlements/current
  users/{uid}/payments/{paymentId}
  users/{uid}/auditEvents/{eventId}        # server only

plans/{planId}                             # public read, server writes
  _oauthCredentials/{uid}                    # server only
  _oauthStates/{stateId}                     # server only
  _googleCalendarConnections/{uid}           # server only
  _calendarOAuthStates/{stateHash}           # server only
  _webhookReceipts/{receiptId}               # server only
  _uploadIntents/{intentId}                  # server only
  _uploadRateLimits/{uid}                    # server only
  _wardrobeCounters/{uid}                    # server only: transactional capacity counter
  _wearEventReceipts/{uid_requestId}         # server only
  _tryOnJobs/{jobId}                         # server only: Replicate ID, input photo, leases
  _tryOnUsage/{uidHash}                      # server only: quota reservation counter
  _tryOnReceipts/{requestHash}               # server only: retry idempotency
  _paymentTransactions/{transactionCode}     # server only: provider order-to-user mapping
  _pendingPaymentByUser/{uid}                # server only: at most one live checkout per user
  _adminAudit/{eventId}                      # server only
```

| Path | Suggested fields | Mobile access |
|---|---|---|
| `users/{uid}` | `fullName`, `email` (display/cache only), `phone`, `avatar` `{secureUrl, publicId}`, `profile` `{gender, heightCm, weightKg, bodyShape, skinTone, stylePreference, favoriteColors, privacyAiTrainingConsent}`, `timeZone`, `createdAt`, `updatedAt`; optional server owned `accountStatus` | Owner reads; owner creates minimal profile and updates profile allowlist. Owner cannot set UID, account status, role, plan, quota or counters. Auth email/verification comes from Firebase Auth, not a trusted duplicate field. |
| `wardrobe/{itemId}` | `name`, `category`, `subCategory`, `brand`, `size`, `material`, `color`, `colorHex`, `season`, `pattern`, bounded `tags`, `image` / `thumbnail` refs, `backgroundRemovedUrl`, `wearCount`, `lastWornAt`, `favorite`, `status`, optional purchase metadata/source, `createdAt`, `updatedAt` | Owner reads and edits allowlisted descriptive/preference fields. Functions create/delete items and transactionally enforce Free 100-item capacity with `_wardrobeCounters/{uid}`; Functions alone set counters and wear history. A paid active entitlement with `wardrobeLimit: -1` has no item cap. |
| `dailyOutfits/{dateKey}` | One confirmed outfit per user's local day: `dateKey`, `timeZone`, `confirmedAt`, `itemIds[]`, `itemSnapshots[]`, `name`, `description`, `occasion`, `source`, `notes`, optional `weatherSnapshotId`, `calendarEventId`, `createdAt`, `updatedAt` | Owner reads. `confirmTodayDailyOutfit` validates same-user wardrobe refs, snapshots items, updates wear counters only for changes, and marks a linked suggestion confirmed in one retry-safe transaction. Client must not write counters or records directly. |
| `suggestions/{suggestionId}` | `dateKey`, `title`, `occasion`, `summary`, `reason`, `confidence`, `tips[]`, `items[]` `{itemId, slot, reason, order, itemSnapshot?}`, `context` (bounded snapshot), `modelName`, `status`, `confirmedDailyOutfitId`, `createdAt`, `updatedAt` | Owner reads. Function creates/updates status and confirmation. The current default is rule based; never persist private model chain-of-thought or unfiltered provider response. |
| `tryOns/{jobId}` | `status`, `resultImage` ref, `clothingItemId`, bounded `itemSnapshot`, `isSaved`, `savedAt`, `isDeleted`, `errorCode` (safe public enum), `createdAt`, `completedAt`, bounded result metadata | Owner reads. Functions alone create/update status, output refs and quota. Replicate ID, temporary person-image ref, garment provider input and lease fields live in `_tryOnJobs/{jobId}` and are denied to clients. Terminal jobs delete the temporary input photo from Cloudinary best-effort. A callable save operation validates completion; deletion hides history and deletes assets. |
| `weatherSnapshots/{snapshotId}` | `latitude`, `longitude`, `timeZone`, coarse/display `locationLabel`, `temperatureCelsius`, `apparentTemperatureCelsius`, `relativeHumidity`, `precipitationMm`, `rainMm`, `weatherCode`, `conditionText`, `cloudCover`, wind values, `isDay`, `provider`, `observedAt`, `createdAt` | Owner reads; Function writes/cache manages. Do not retain exact location/raw API payload longer than the product needs. Retention/precision is a product decision. |
| `calendarEvents/{eventKey}` | SHA-256 event key, Google event ID, sanitized `title`, `startAtMillis`, `endAtMillis`, `timeZone`, approved `location`/`description`, `context`, `lastSyncedAt`, `dateKey`; remove records older than 30 days or on disconnect | Owner reads only. Function sync writes sanitized events and enforces retention. OAuth access/refresh tokens and raw OAuth state are never stored in this client readable path. |
| `integrationStatus/googleCalendar` | `connected`, `providerEmail`, sanitized `scope`, `connectedAt`, `lastSyncedAt`, `lastSyncedDate`, `lastSyncedAtMillis`, `lastErrorCode` | Owner reads; Function writes. No credential or OAuth state fields. |
| `entitlements/current` | `planId`, `status`, `startsAt`, `expiresAt`, `tryOnLimit`, `quotaPeriod`, `wardrobeLimit`, `source`, `autoRenew`, `updatedAt` | Owner reads. Server only writes. Quota enforcement and idempotency happen in Functions; do not treat client cached entitlement as authority. One-time VNPay checkout has `autoRenew: false`; it does not renew automatically. |
| `payments/{paymentId}` | safe `provider`, `planId`, integer `amount`, `currency`, public `status`, `createdAt`, `paidAt`, safe transaction reference | Owner reads. Function writes after provider signature/status/amount/currency/order validation. Never expose raw callback or payment secret. |
| plan catalog | Code-owned `FREE`, `PRO`, `PREMIUM` catalog returned through a callable. Prices and limits never come from mobile request data. | Signed-in user receives safe catalog fields through Functions; prices are currently 99,000 ₫ monthly and 799,000 ₫ yearly for internal sandbox testing. |
| server only | OAuth tokens/state and PKCE verifier, weather request limit state, webhook idempotency receipts, Cloudinary upload intents, prediction provider IDs, admin audit, UID/key mappings, account lock/deletion orchestration, source import manifests | No client read/write. Restrict IAM/service accounts and redact logs. |

### Snapshot and relationship rules

- Outfit/suggestion history should include the displayed item fields at confirmation/generation time. Deleting a wardrobe item must not erase what the user saw/wore historically.
- Use stable `itemId` references while the item exists, plus a bounded snapshot for history. Validate every referenced item against the same UID in Functions; a document path from another user's namespace must be rejected.
- New outfit images, if supported by existing APIs/data, use the same Cloudinary ownership/retention process as wardrobe images.
- Daily outfit and suggestion IDs use a collision safe ID or deterministic key when the business rule allows one record per user and local date. Confirm retries must return the existing record rather than increment counts again.
- Cap arrays/text/image metadata at the service boundary; Firestore's document size and Rules expression limits are not input validation. Paginate growing history with cursors and stable order fields.
- Weather/calendar context snapshots used in a suggestion should be just enough to explain the result. Avoid embedding provider raw payloads, access tokens, or unnecessary exact location/event details.

## 3. Rules matrix

This matrix defines intended capability. It is not a substitute for executable Firestore Rules or tests.

| Actor | Profile | Wardrobe | Daily outfit | Suggestions | Try-on | Weather | Calendar cache/status | Entitlement/payment | Plans | Admin/secret |
|---|---|---|---|---|---|---|---|---|---|---|
| Signed out | deny | deny | deny | deny | deny | deny | deny | deny | public fields only if explicitly needed | deny |
| Owner UID | read; create/update allowlist only | read/create/update descriptive & preference allowlist | read; confirm through Function | read; generation/confirm through Function | read; create/poll/save/delete through Function | read; create/refresh through Function | read sanitized data; connect/sync/disconnect through Function | read safe projections only | read active fields | deny |
| Other signed in user | deny | deny | deny | deny | deny | deny | deny | deny | read public active fields | deny |
| Trusted Function | service role with per-call UID/ownership and payload validation | same | same + idempotency | same | same + provider/quota | provider/cache logic | OAuth token isolated | provider/webhook verified | controlled seed/manage | least-privilege IAM |
| Admin operator | via audited backend/admin tool with assigned role | explicit support actions, audited | read only when support need | same | safe diagnostics only | minimal | never reveal tokens | safe payment status | manage | IAM, MFA, audit |

Rules invariants to encode and test:

1. `request.auth != null` and the authenticated UID equals the `{uid}` path segment for all personal reads/writes.
2. Profile client creation ties to signed-in owner. Wardrobe create/delete and counter updates go through authenticated Functions. On profile/item update, `diff().affectedKeys()` must be a strict allowlist; role, entitlement, counters, AI job state and timestamps controlled by server cannot be added or changed.
3. Per-field types/ranges/lengths and required-field sets are validated. Unrecognized sensitive fields are rejected.
4. Client writes to payment, entitlement, server event, provider receipt, OAuth secret/state, audit and migration mapping collections are denied.
5. A user cannot grant themselves admin by editing profile or role documents. Use server assigned custom claims or IAM managed operator identity; claims are verified in Functions.
6. Query APIs constrain reads to one user's path and bounded page sizes. Security Rules are not a filter that turns a broad unowned query into an allowed query.
7. Authenticated UID checks in Rules do not automatically authorize all Functions. Every Function independently verifies auth, App Check/rate guard where available, resource ownership and allowed state transition.
8. External callbacks have provider signature validation and idempotency; possession of a Firestore document path/job ID alone is not authorization.

## 4. Field conflict and migration transforms

| Existing source | Potential conflict / transform | Required resolution |
|---|---|---|
| `users.user_id`, `public_id`, `email` + `auth_credentials.password_hash` | Old database identity/credentials are not part of the new project | Do not import users/passwords; new users register with Firebase Auth. The demo account from the old backend is not a Firebase credential. |
| `users.plan`, `plan_expires_at`, quota columns + `subscriptions` + `plans` | Multiple representations can disagree | Reconcile from valid active subscription/payment evidence using an explicit rule; emit conflicts to report for review; never blindly trust only denormalized `users.plan`. Server materializes one entitlement projection after reconciliation. |
| `wardrobe_items.is_favorite` + Node `wardrobe_item_preferences.favorite` | Two sources can disagree | Compare update timestamps/history if reliable; choose a documented precedence and export counts/conflicts before import. If no reliable recency, mark conflicts for deterministic reviewed resolution instead of pretending one source is authoritative. |
| Item status columns + `wardrobe_item_preferences.status` | Same split source issue; status can affect recommendations | Normalize known enum values with an explicit mapping; keep unknown values in error report; reconcile per item/user and verify preferences after import. |
| `wardrobe_items.tags` text | May be delimited text instead of array; delimiter escaping unclear | Parse using observed formats and sample rows, preserve original value in restricted import report, test commas/empty/Unicode. Do not split blindly on comma without examining data. |
| `file_assets.file_url/object_key` + Cloudinary metadata | URLs may not reveal asset public ID/owner and can be deleted already | Prefer verified Cloudinary `public_id`; extract only with known URL patterns, verify via admin API before cutover, report unresolved links. Do not upload or delete assets during dry run. |
| `outfits` + `outfit_items` + `daily_outfits` + `ai_style_suggestions` and items | Several relational tables map to snapshot arrays/doc references | Preserve old IDs in migration map; resolve FK relations before writing; retain item snapshots for deleted items; handle nullable/deleted outfit references and repeated date records. |
| Java `try_on_sessions` + Node `node_try_on_sessions` | Similar tables may represent separate writes or duplicate jobs; saved fields only Node migration | Compare provider IDs, input/result assets, timestamps/status/saved state. Deduplicate only with a verified stable key; otherwise import both and report potential duplicates. |
| `calendar_connections` ciphertext + Node OAuth connection/migration/schema | Ciphertext requires source encryption key and associated config; plaintext transfer would expose credentials | Do not export/decrypt in ordinary migration pipeline or print values. Default requires reconnect. Transfer credentials only if source key is available, target secret encryption/storage is designed and a separately reviewed secret migration succeeds. OAuth state is ephemeral and must be dropped. |
| `weather_snapshots.raw_payload` | May contain more location/provider data than needed | Import normalized display fields only unless raw payload is explicitly required; apply retention and coordinate precision policy. |
| AI/payment raw/provider response, audit/login/session/MFA tables | Sensitive, ephemeral, or operational data | Define per table whether to retain safe history, archive encrypted offline, or omit with an approved retention decision. Never place passwords, reset/refresh tokens, MFA secret, full payment provider payload or client IP history in mobile readable Firestore. |
| SQL timezone-free timestamps + SQL DATE | Server timezone/meaning may be ambiguous | Determine original DB/application timezone, preserve date-only values as date keys, convert instants only with documented zone, and compare boundary records across daylight/timezone cases. |

## 5. Query and index inventory to confirm in emulator

Final indexes are generated from actual implemented queries and committed to `firestore.indexes.json`; do not guess indexes from relational indexes.

| Screen/use case | Query needs |
|---|---|
| Wardrobe list | owner path; optional category/season/color/status/favorite; deterministic order and cursor; decide substring/accent-insensitive `q` explicitly |
| Favorites | favorite == true, deterministic order, bounded cursor |
| Profile/home stats | count/totals from bounded aggregate queries or server maintained counters; consistency contract under concurrent add/delete |
| Wear history | `dateKey` range and/or sort by `confirmedAt`; stable tie breaker; bounded cursor |
| Today's outfit/suggestion | exact `dateKey`, newest/active state, timezone-bound date computed on server or supplied and validated |
| Try-on history | `createdAt`/status/saved filter and cursor; polling single job path; stale-job reconciliation query is server only |
| Calendar events | time interval in user's timezone; bounded upcoming event set and stable provider key |
| Weather | newest `observedAt` per user; retention cleanup query server side |

Search decision: keep a small closet query server aware of real product semantics. Firestore does not provide general arbitrary substring/full-text search as a native replacement for SQL `ILIKE`; choose limited prefix filters, client filtering only over a bounded complete data set, or a search service after verifying user scale/cost. Never return misleading partial matches from a paginated subset.

## 6. Questions that block final schema or feature release

- Is there production data and how many users/items/assets/jobs/payments exist? Which SQL source is authoritative?
- Does Cloudinary `public_id` exist in DB for every user image? Which images are public/private and what retention/deletion consent applies to person photos from try-on?
- Do users expect Google Calendar reconnection? Is Calendar OAuth app verified and which HTTPS callback domain will be used?
- Which app stores/channel should govern digital Premium purchase, restore, cancel, refund and customer support?
- Which security/retention features from the old SQL app are required in the new release (account blocking, email verification, admin roles, MFA, audit/payment retention)?

Until resolved, real user collection writes and external provider flows stay disabled. Test fixtures must use fake credentials, fake account data and non-production Cloudinary assets.
