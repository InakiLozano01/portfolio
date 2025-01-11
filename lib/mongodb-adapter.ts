import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env')
}

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI as string)
    return mongoose
  } catch (error) {
    console.error('Error connecting to MongoDB:', error)
    throw error
  }
} 