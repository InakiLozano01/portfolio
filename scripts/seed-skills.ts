import { connectToDatabase } from '../lib/mongodb';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import Skill from '../models/Skill';

config();

// Set MongoDB URI for Docker environment if not set
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://mongodb:27017/portfolio';
}

function transformData(data: any[]) {
  return data.map(item => {
    const transformed = { ...item };
    // Convert $oid to ObjectId
    if (transformed._id && transformed._id.$oid) {
      transformed._id = new ObjectId(transformed._id.$oid);
    }
    // Convert $date to Date objects
    if (transformed.createdAt && transformed.createdAt.$date) {
      transformed.createdAt = new Date(transformed.createdAt.$date);
    }
    if (transformed.updatedAt && transformed.updatedAt.$date) {
      transformed.updatedAt = new Date(transformed.updatedAt.$date);
    }
    return transformed;
  });
}

async function seedSkills() {
  try {
    await connectToDatabase();
    console.log('[Seed Skills] Connected to database');
    
    const skillsPath = path.join(process.cwd(), 'data', 'skills.json');
    console.log('[Seed Skills] Reading skills from:', skillsPath);
    
    if (!fs.existsSync(skillsPath)) {
      console.error('[Seed Skills] skills.json not found at:', skillsPath);
      console.log('[Seed Skills] Current directory contents:', fs.readdirSync(process.cwd()));
      process.exit(1);
    }
    
    // Read skills data from JSON file
    const skillsData = JSON.parse(
      fs.readFileSync(skillsPath, 'utf-8')
    );
    console.log(`[Seed Skills] Read ${skillsData.length} skills from file`);

    // Transform the data
    const transformedData = transformData(skillsData);
    console.log('[Seed Skills] Transformed data');

    // Clear existing skills using Mongoose model
    const deleteResult = await Skill.deleteMany({});
    console.log('[Seed Skills] Cleared existing skills:', deleteResult);

    // Insert new skills using Mongoose model
    const result = await Skill.insertMany(transformedData, { ordered: true });
    console.log(`[Seed Skills] Successfully seeded ${result.length} skills`);
    
    // Verify the seeded data
    const count = await Skill.countDocuments();
    console.log(`[Seed Skills] Verified count in database: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('[Seed Skills] Error seeding skills:', error);
    process.exit(1);
  }
}

seedSkills(); 