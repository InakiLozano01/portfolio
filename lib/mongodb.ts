import mongoose from 'mongoose';

// Check if MONGODB_URI is defined, if not use default development URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';

if (!mongoose.connections[0].readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function connectToDatabase() {
  try {
    if (mongoose.connections[0].readyState) return;

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

export default mongoose; 