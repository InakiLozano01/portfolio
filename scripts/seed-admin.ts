import { connectToDatabase } from '../lib/mongodb';
import Admin from '../models/Admin';
import { config } from 'dotenv';

// Load environment variables
config();

// Set MongoDB URI for Docker environment if not set
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://mongodb:27017/portfolio';
}

const adminData = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  name: 'Admin'
};

async function seedAdmin() {
  try {
    await connectToDatabase();
    
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    
    if (!existingAdmin) {
      // Create new admin
      const admin = new Admin(adminData);
      await admin.save();
      console.log('Successfully created admin user');
    } else {
      console.log('Admin user already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin(); 