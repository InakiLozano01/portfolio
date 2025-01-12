import { Redis } from 'ioredis';

class DummyRedis {
  async get() { return null; }
  async set() { return 'OK'; }
  async setex() { return 'OK'; }
  async del() { return 1; }
  async keys() { return []; }
  on() { return this; }
  async ping() { return 'PONG'; }
  async flushall() { return 'OK'; }
  async flushdb() { return 'OK'; }
  async scan() { return ['0', []]; }
  async exists() { return 0; }
  async ttl() { return -2; }
  async type() { return 'none'; }
}

// Use dummy Redis during development or when skipping Redis during build
const isDevelopment = process.env.NODE_ENV !== 'production';
const skipRedisDuringBuild = process.env.SKIP_REDIS_DURING_BUILD === 'true';

let redis: Redis;

// Use dummy Redis during development or build
if (isDevelopment || skipRedisDuringBuild) {
  console.log('[Redis] Using dummy client because:', { isDevelopment, skipRedisDuringBuild });
  redis = new DummyRedis() as unknown as Redis;
} else {
  try {
    console.log('[Redis] Attempting to connect to:', process.env.REDIS_URL);
    redis = new Redis(process.env.REDIS_URL || '', {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redis.on('error', (error: Error) => {
      console.error('[Redis Error] Connection error:', error);
      // Switch to dummy Redis on connection error
      redis = new DummyRedis() as unknown as Redis;
    });

    redis.on('connect', () => {
      console.log('[Redis Success] Connected to Redis server');
    });

    redis.on('ready', () => {
      console.log('[Redis Success] Redis client is ready');
    });
  } catch (error) {
    console.error('[Redis Error] Failed to initialize Redis client:', error);
    redis = new DummyRedis() as unknown as Redis;
  }
}

export default redis; 