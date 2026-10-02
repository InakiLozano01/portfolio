const { collection, pool } = require('../lib/postgres-store');

const legacyMetricFields = [
  'proficiency',
  'yearsOfExperience',
  'yearsExperience',
  'experienceLevel',
  'expertise',
  'expertisePercent',
  'expertisePercentage',
  'percentage',
  'percent',
];

async function cleanupSkillMetrics() {
  try {
    await pool().query('SELECT 1');

    const result = await collection('skills').updateMany(
      {
        $or: legacyMetricFields.map((field) => ({ [field]: { $exists: true } })),
      },
      {
        $unset: Object.fromEntries(legacyMetricFields.map((field) => [field, ''])),
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    console.log('[Cleanup Skill Metrics] Matched skills:', result.matchedCount);
    console.log('[Cleanup Skill Metrics] Modified skills:', result.modifiedCount);
  } catch (error) {
    console.error('[Cleanup Skill Metrics] Failed:', error);
    process.exitCode = 1;
  } finally {
    await pool().end();
  }
}

cleanupSkillMetrics();
