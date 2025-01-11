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

const redisConfig = {
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  maxReconnectionAttempts: 10,
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

// Use dummy Redis during build or if explicitly skipped
const isDevelopment = process.env.NODE_ENV !== 'production';
const skipRedis = process.env.SKIP_REDIS_DURING_BUILD === 'true' || process.env.NEXT_PHASE === 'phase-production-build';

const redis = skipRedis && isDevelopment
  ? (new DummyRedis() as unknown as Redis)
  : new Redis(process.env.REDIS_URI || 'redis://localhost:6379', redisConfig);

if (!skipRedis || !isDevelopment) {
  redis.on('error', (error: Error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('Connected to Redis');
  });

  redis.on('ready', () => {
    console.log('Redis is ready');
  });

  redis.on('reconnecting', () => {
    console.log('Reconnecting to Redis...');
  });
}

export default redis; 