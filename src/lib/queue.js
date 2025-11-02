import { Queue } from 'bullmq';

const connection = { url: process.env.REDIS_URL };

export const videoQueue = new Queue('video-jobs', { connection });

export async function enqueueJob(payload) {
    return videoQueue.add(payload.type, payload, {
        removeOnComplete: 1000,
        removeOnFail: 500,
        attempts: 2
    });
}
