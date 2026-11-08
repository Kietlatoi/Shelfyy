# Shelfy migration inventory

This inventory records the checked-in relational data model before backend replacement. The owner confirmed no existing records or accounts need to be migrated; therefore production SQL import, BCrypt import, legacy UID preservation and SQL cutover are out of scope. This inventory remains useful for recreating only active mobile behavior and preventing secrets or unnecessary records from being copied into a new Firebase project.

Reviewed sources: Core Flyway migrations `V1`–`V7`, Node migrations `001`–`005`, and mobile API clients. This is a source-code inventory, not a live database count or proof of which production features were enabled.

## SQL entities and disposition

| Source tables | Data represented | New-system disposition |
|---|---|---|
| `users`, `user_profiles` | Identity, status, profile/body/style preferences, avatar and quota mirrors | Fresh Firebase Auth accounts; create minimal `users/{uid}` profile on registration. Do not import old credentials or IDs. Server owns status/role/quota/entitlement. |
| `auth_credentials`, `refresh_tokens`, `user_sessions`, `login_attempts` | Password hashes, legacy JWT refresh/session hashes, login audit | Do not copy. Firebase Auth starts fresh; legacy sessions are invalid. Avoid storing IP/login secrets absent a specific retention requirement. |
| `email_verification_tokens`, `password_reset_tokens`, `mfa_methods` | One-time secrets and optional MFA state | Do not copy. Configure Firebase Auth email verification/reset. MFA remains out of initial scope unless confirmed as an active requirement. |
| `roles`, `permissions`, `user_roles`, `role_permissions` | Authorization roles and grants | Do not make user-writable Firestore copies. Define operators through controlled server/IAM/custom claims; setup a new operator separately. |
| `file_assets` | Owner, URLs/object keys, visibility, media metadata | New uploads use Cloudinary integration. Old assets are not copied since existing user data is not needed. Do not bulk delete old Cloudinary files. |
| `wardrobe_items` | Item descriptions/category/tags, image refs, favorite/status mirrors, wear counters and purchase metadata | New owner-scoped wardrobe collection. Preserve current UI fields/enum values. Favorites/status represented once in new schema. |
| `wardrobe_item_preferences` | Node favorite/status per user/item | New schema writes canonical preference field on the wardrobe item. No legacy reconciliation required. |
| `outfits`, `outfit_items` | Saved outfit, item relations, style/occasion/weather metadata | Preserve only if mobile uses it in current paths or backend pairing/trial expects it. Map referenced item snapshots safely. Current mobile primarily consumes daily outfits/suggestions; confirm feature parity before dropping. |
| `daily_outfits` | Confirmed outfit, local date, weather/calendar links, note | Owner subcollection `dailyOutfits`; fresh records only. Preserve date/timezone and idempotent confirm behavior. |
| `ai_suggestions`, `ai_style_suggestions`, `ai_style_suggestion_items` | Generated rule/model suggestions, slots, explanation/context and status | New owner subcollection; only active rule-based fields; do not copy raw provider response or prior history. |
| `try_on_sessions`, `node_try_on_sessions` | AI jobs, source/result asset refs, provider id/status/saved history | Fresh jobs only. Provider ids and raw inputs remain server-controlled. Keep only approved results/retention. |
| `weather_snapshots` | Location, current conditions and raw provider payload | New minimized snapshots. Do not migrate old exact coordinates or raw payload. Confirm retention/location precision. |
| `calendar_events` | Event title/time/location/description and Google ids | New sanitized per-user cache created after user connects Calendar. No old events imported. |
| `calendar_connections`, `calendar_oauth_states` | Encrypted OAuth credentials and one-time state | No credentials or state imported; new connection flow obtains consent. State is ephemeral. |
| `plans`, `subscriptions`, `payments` | Plan catalog, periods, transaction metadata/provider responses | Seed a fresh catalog from reviewed pricing; fresh subscriptions/payments only. Never grant access based on client fields. Keep receipt/provider details server side and minimal. |
| `audit_logs` | Administrative/business audit events | Start new restricted server audit only for material admin/billing/security actions; do not copy old audit trail. |
| Root docker/PostgreSQL, Spring, Node `.env` settings | Service secrets, database configuration and deployment wiring | Replace with Firebase emulator/config and managed Functions secrets. Do not copy old DB/JWT/Cloudinary/Replicate/Google secrets into client config. Rotate any secret if exposure is suspected. |

## Conflicting sources discovered in code

- Favorites and item status are exposed by Core wardrobe records and by the separate Node preference store. New account data starts empty, so there is no old conflict to reconcile. For new writes, keep one canonical value per item and remove the extra read/merge path from mobile.
- Trial jobs exist in both the Core schema and Node schema. Mobile currently calls Node trial APIs and Node migration `004/005` adds save-history state. Implement one Functions job model for all future app jobs.
- Weather and Calendar records are split across Core migrations and Node routes/tables. New app writes go through the new Functions integration contracts only.
- Premium state is mirrored across user, plan, subscription and payment tables. New project seeds the selected plans once; verified server callbacks are the only source for entitlement grants.
- SQL uses integer IDs; new documents use string IDs. No migration means no backwards numeric ID adapter is required after every mobile flow has been moved.

## Explicit no-import decision

Owner response: **“Không cần chuyển”** (there is no need to migrate existing records/accounts).

Implementation consequence:

1. Skip task 04 BCrypt/Auth import and all production export/import jobs.
2. Skip legacy collections, `legacyId`, source manifests and production SQL cutover/reverse sync.
3. Do not remove the old backend/database until the new APK and landing are accepted and the owner has confirmed the old services can be retired. Retain any external backups per existing service policy until retirement is decided.
4. Test with synthetic users/items and new Firebase Auth accounts; existing old demo credentials must no longer be presented as working after the old login flow is removed.
5. If the owner later identifies data to keep, pause cleanup and write a separate export/import plan before changing any production service.
