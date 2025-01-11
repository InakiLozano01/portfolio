import { SectionModel } from '@/models/Section';
import redis from './redis';

const CACHE_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export async function getCachedSections(type?: string) {
  const cacheKey = type ? `section_${type}` : 'all_sections';

  try {
    // Try to get data from cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Retrieved ${cacheKey} from Redis cache`);
      return JSON.parse(cachedData);
    }

    console.log(`[Cache Miss] Fetching ${cacheKey} from database`);
    // If not in cache, fetch from database
    let data;
    if (type) {
      const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      data = await SectionModel.findOne({ title });
    } else {
      data = await SectionModel.find().sort({ order: 1 });
    }

    // Store in cache only if we have data
    if (data) {
      console.log(`[Cache Update] Storing ${cacheKey} in Redis cache`);
      try {
        await redis.setex(cacheKey, CACHE_DURATION, JSON.stringify(data));
      } catch (cacheError) {
        console.error(`[Cache Error] Failed to store ${cacheKey} in Redis:`, cacheError);
      }
    }

    return data;
  } catch (error) {
    console.error('Cache error:', error);
    // Fallback to database if cache fails
    console.log(`[Cache Fallback] Fetching ${cacheKey} directly from database`);
    if (type) {
      const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return await SectionModel.findOne({ title });
    }
    return await SectionModel.find().sort({ order: 1 });
  }
}

export async function clearSectionsCache() {
  try {
    const keys = await redis.keys('section_*');
    keys.push('all_sections');
    
    if (keys.length > 0) {
      console.log(`[Cache Clear] Clearing keys: ${keys.join(', ')}`);
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
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

export async function setInCache(cacheKey: string, data: any, ttl: number = CACHE_DURATION): Promise<void> {
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