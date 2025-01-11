import { connectToDatabase } from '../lib/mongodb';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ObjectId } from 'mongodb';

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
    const mongoose = await connectToDatabase();
    
    // Read skills data from JSON file
    const skillsData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'skills.json'), 'utf-8')
    );

    // Transform the data
    const transformedData = transformData(skillsData);

    // Clear existing skills
    await mongoose.connection.collection('skills').deleteMany({});

    // Insert new skills
    const result = await mongoose.connection.collection('skills').insertMany(transformedData);
    
    console.log(`Successfully seeded ${result.insertedCount} skills`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding skills:', error);
    process.exit(1);
  }
}

seedSkills(); 