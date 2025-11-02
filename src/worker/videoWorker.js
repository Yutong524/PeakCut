import { Worker } from 'bullmq';
import { prisma } from '../lib/db.js';

const connection = { url: process.env.REDIS_URL };

const w = new Worker('video-jobs', async (job) => {
    const { videoId, type } = job.data;

    await prisma.job.update({ where: { id: String(job.id) }, data: { status: 'RUNNING' } });

    const simulate = async (steps = 8) => {
        for (let i = 1; i <= steps; i++) {
            await new Promise(r => setTimeout(r, 400));
            await prisma.job.update({
                where: { id: String(job.id) },
                data: { progress: Math.min(99, Math.floor((i / steps) * 98)) }
            });
        }
    };

    if (type === 'TRANSCRIBE') {
        await simulate();
        await prisma.subtitleSegment.createMany({
            data: [
                { videoId, startMs: 0, endMs: 1800, textSrc: 'Hey folks, welcome back!' },
                { videoId, startMs: 1800, endMs: 4200, textSrc: 'Today we test the new build.' },
                { videoId, startMs: 4200, endMs: 7000, textSrc: "Let's clip the highlights." }
            ]
        });
    }

    if (type === 'AUTOCUT') await simulate();

    if (type === 'TRANSLATE') {
        await simulate();
        const segs = await prisma.subtitleSegment.findMany({ where: { videoId } });
        for (const s of segs) {
            await prisma.subtitleSegment.update({
                where: { id: s.id },
                data: { textEn: s.textSrc, textZh: '占位翻译：' + s.textSrc }
            });
        }
    }

    if (type === 'RENDER') await simulate();

    await prisma.job.update({ where: { id: String(job.id) }, data: { progress: 100, status: 'SUCCEEDED' } });
}, { connection });

w.on('completed', (job) => console.log('Completed', job.name, job.id));
w.on('failed', (job, err) => console.error('Failed', job?.name, job?.id, err));
