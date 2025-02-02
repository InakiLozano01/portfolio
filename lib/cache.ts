import { Redis } from 'ioredis';
import redis from './redis';
import { connectToDatabase } from './mongodb';
import { SectionModel } from '@/models/Section';

const isDevelopment = process.env.NODE_ENV !== 'production';
const CACHE_DURATION = 3600; // 1 hour in seconds

export async function getCachedSections(type?: string) {
  // During build time, return empty array
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return [];
  }

  try {
    const cacheKey = type ? `section_${type.toLowerCase()}` : 'sections';

    // Try to get from cache first
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[Cache Hit] Found ${cacheKey} in cache`);
        return JSON.parse(cachedData);
      }
    } catch (redisError) {
      console.error('[Cache Error] Redis error:', redisError);
      // Continue to MongoDB if Redis fails
    }

    // Only connect to MongoDB if we need to fetch data
    console.log(`[Cache Miss] Fetching ${cacheKey} from database`);
    await connectToDatabase();
    const query = type ? { title: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() } : {};
    const data = await SectionModel.find(query).sort({ order: 1 });

    // Try to store in cache, but don't fail if Redis is down
    try {
      console.log(`[Cache Update] Storing ${cacheKey} in Redis cache`);
      await redis.setex(cacheKey, CACHE_DURATION, JSON.stringify(data));
    } catch (redisError) {
      console.error('[Cache Error] Failed to store in Redis:', redisError);
    }

    return data;
  } catch (error) {
    console.error('[Cache Error] Failed to get cached sections:', error);
    // Fallback to database if cache fails
    try {
      await connectToDatabase();
      const query = type ? { title: type } : {};
      return await SectionModel.find(query).sort({ order: 1 });
    } catch (dbError) {
      console.error('[Cache Error] Database fallback failed:', dbError);
      return [];
    }
  }
}

export async function clearSectionsCache() {
  try {
    // Get all section-related cache keys
    const sectionKeys = await redis.keys('section*'); // This will match both 'sections' and 'section_*'

    if (sectionKeys.length > 0) {
      await redis.del(...sectionKeys);
      console.log('[Cache] Cleared the following keys:', sectionKeys);
    } else {
      console.log('[Cache] No section-related keys found to clear');
    }
  } catch (error) {
    console.error('[Cache Error] Failed to clear cache:', error);
    throw error; // Re-throw to handle in the API route
  }
}

export async function getFromCache<T>(cacheKey: string): Promise<T | null> {
  try {
    // Try to get data from cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Retrieved ${cacheKey} from Redis cache`);
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error(`[Cache Error] Failed to get ${cacheKey} from Redis:`, error);
    return null;
  }
}

export async function setInCache(cacheKey: string, data: unknown, ttl: number = CACHE_DURATION): Promise<void> {
  try {
    const serializedData = JSON.stringify(data);
    await redis.setex(cacheKey, ttl, serializedData);
    console.log(`[Cache Set] Stored ${cacheKey} in Redis cache`);
  } catch (error) {
    console.error(`[Cache Error] Failed to set ${cacheKey} in Redis:`, error);
  }
}

export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    await redis.del(cacheKey);
    console.log(`[Cache Invalidate] Removed ${cacheKey} from Redis cache`);
  } catch (error) {
    console.error(`[Cache Error] Failed to invalidate ${cacheKey} in Redis:`, error);
  }
} 