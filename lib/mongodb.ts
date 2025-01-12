import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

const MONGODB_URI = process.env.MONGODB_URI;

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose;
}

if (!global.mongoose) {
  global.mongoose = {
    conn: null,
    promise: null
  };
}

export async function connectToDatabase() {
  console.log('[MongoDB] Connection request received');
  console.log('[MongoDB] Cache status:', {
    hasConnection: global.mongoose.conn !== null,
    hasPromise: global.mongoose.promise !== null
  });

  if (global.mongoose.conn) {
    console.log('[MongoDB] Using cached connection');
    return global.mongoose.conn;
  }

  if (!global.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('[MongoDB] Creating new connection to:', MONGODB_URI);
    global.mongoose.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        global.mongoose.conn = mongoose;
        console.log('[MongoDB] New connection established');
        return mongoose;
      })
      .catch((error) => {
        console.error('[MongoDB] Connection error:', error);
        global.mongoose.promise = null;
        throw error;
      });
  } else {
    console.log('[MongoDB] Using existing connection promise');
  }

  try {
    const mongoose = await global.mongoose.promise;
    console.log('[MongoDB] Connection successful');
    return mongoose;
  } catch (error) {
    console.error('[MongoDB] Failed to resolve connection:', error);
    global.mongoose.promise = null;
    throw error;
  }
} 