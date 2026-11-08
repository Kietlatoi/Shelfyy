// Operator CLI: Application Default Credentials must have project IAM access.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { createAccountLifecycle } = require('../accountLifecycle');

async function main() {
  const args = process.argv.slice(2);
  const [action, uid] = args;
  const projectId = args[args.indexOf('--project') + 1];
  if (!['inspect', 'disable', 'enable', 'delete'].includes(action) || !uid || uid.includes('/') || !args.includes('--project') || !projectId) {
    throw new Error('Usage: node scripts/admin.cjs inspect|disable|enable|delete UID --project PROJECT_ID [--apply]');
  }
  initializeApp({ credential: applicationDefault(), projectId });
  const database = getFirestore();
  const auth = getAuth();
  const account = await auth.getUser(uid);
  const [access, deletion] = await Promise.all([database.doc(`_accountAccess/${uid}`).get(), database.doc(`_accountDeletionJobs/${uid}`).get()]);
  console.log(JSON.stringify({ projectId, uid, disabled: account.disabled, access: access.data()?.status || 'active', deletionPhase: deletion.data()?.phase || null, action, dryRun: !args.includes('--apply') }));
  if (action === 'inspect' || !args.includes('--apply')) return;
  const lifecycle = createAccountLifecycle({ database, auth, serverTimestamp: () => FieldValue.serverTimestamp() });
  const actor = `operator:${process.env.USERNAME || 'local'}`;
  if (action === 'delete') await lifecycle.requestDeletion(uid, actor);
  else await lifecycle.setDisabled(uid, action === 'disable', actor);
  console.log('Applied. Deletion, when requested, runs through the scheduled cleanup queue.');
}
main().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
