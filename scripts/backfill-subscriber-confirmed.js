/**
 * One-time migration for the double opt-in rollout: mark pre-existing
 * subscribers as confirmed so they keep receiving newsletters once sends are
 * gated on `confirmed: true`.
 *
 * Targets ONLY legacy docs — those with no `confirmToken` (subscribers created
 * before double opt-in). Genuinely-pending new sign-ups DO have a `confirmToken`
 * and are left untouched, so they still must confirm via email.
 *
 * Dry-run by default; gated on APPLY=1. Run inside the capped portfolio
 * container (PostgreSQL + DATABASE_URL available there), never on the host:
 *
 *   # dry run (counts only)
 *   docker exec portfolio-portfolio-1 node /app/scripts/backfill-subscriber-confirmed.js
 *   # apply
 *   docker exec -e APPLY=1 portfolio-portfolio-1 node /app/scripts/backfill-subscriber-confirmed.js
 */
const { rawModel, pool } = require('./postgres-model.cjs');

const dryRun = process.env.APPLY !== '1';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  await pool().query('SELECT 1');
  const Subscriber =
    rawModel('Subscriber', 'subscribers');

  // Legacy subscribers: not already confirmed AND no pending confirm token.
  const filter = { confirmed: { $ne: true }, confirmToken: { $exists: false } };
  const total = await Subscriber.countDocuments({});
  const eligible = await Subscriber.countDocuments(filter);

  console.log(`${dryRun ? 'Dry run' : 'Apply'}: ${total} subscribers total, ${eligible} legacy (to mark confirmed)`);

  if (dryRun) {
    console.log('No changes written (set APPLY=1 to apply).');
    await pool().end();
    return;
  }

  const res = await Subscriber.updateMany(filter, {
    $set: { confirmed: true, confirmedAt: new Date(), updatedAt: new Date() },
  });
  console.log(`Done. Marked confirmed: ${res.modifiedCount ?? res.nModified ?? 0}`);

  await pool().end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
