import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

try {
    const pong = await redis.ping();
    console.log('PING =>', pong);
    await redis.set('peakcut:test', 'ok', 'EX', 60);
    const v = await redis.get('peakcut:test');
    console.log('GET =>', v);
} catch (e) {
    console.error('Redis test failed:', e);
}

await redis.quit();
