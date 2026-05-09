const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/portfolio';
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
    await mongoose.connect(uri, { bufferCommands: false });

    const result = await mongoose.connection.collection('skills').updateMany(
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
    await mongoose.disconnect();
  }
}

cleanupSkillMetrics();
