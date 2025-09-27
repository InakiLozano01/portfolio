import type { Redis } from 'ioredis';

class MemoryCache {
  private cache: Map<string, { value: string; expiry: number | null }>;

  constructor() {
    this.cache = new Map();
  }

  async get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string) {
    this.cache.set(key, { value, expiry: null });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(keys: string | string[]) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => this.cache.delete(key));
    return keyArray.length;
  }

  async keys(pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  on() {
    return this;
  }

  async ping() {
    return 'PONG';
  }

  async flushall() {
    this.cache.clear();
    return 'OK';
  }

  async flushdb() {
    this.cache.clear();
    return 'OK';
  }

  async scan() {
    return ['0', Array.from(this.cache.keys())];
  }

  async exists(key: string) {
    return this.cache.has(key) ? 1 : 0;
  }

  async ttl(key: string) {
    const item = this.cache.get(key);
    if (!item) return -2;
    if (!item.expiry) return -1;
    const ttl = Math.ceil((item.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async type(key: string) {
    return this.cache.has(key) ? 'string' : 'none';
  }
}

// Use memory cache during development or when skipping Redis during build
const isDevelopment = process.env.NODE_ENV !== 'production';
const skipRedisDuringBuild = process.env.SKIP_REDIS_DURING_BUILD === 'true';

let redis: Redis;

// Use memory cache during development or build
if (isDevelopment || skipRedisDuringBuild) {
  console.log('[Redis] Using memory cache because:', { isDevelopment, skipRedisDuringBuild });
  redis = new MemoryCache() as unknown as Redis;
} else {
  try {
    console.log('[Redis] Attempting to connect to:', process.env.REDIS_URL);
    const { Redis: RedisClient } = require('ioredis') as typeof import('ioredis');
    redis = new RedisClient(process.env.REDIS_URL || '', {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redis.on('error', (error: Error) => {
      console.error('[Redis Error] Connection error:', error);
      // Switch to memory cache on connection error
      redis = new MemoryCache() as unknown as Redis;
    });

    redis.on('connect', () => {
      console.log('[Redis Success] Connected to Redis server');
    });

    redis.on('ready', () => {
      console.log('[Redis Success] Redis client is ready');
    });
  } catch (error) {
    console.error('[Redis Error] Failed to initialize Redis client:', error);
    redis = new MemoryCache() as unknown as Redis;
  }
}

export default redis; 