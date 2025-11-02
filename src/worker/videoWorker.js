import { Worker } from 'bullmq';
import { prisma } from '../lib/db.js';
import { transcribeLocal } from '../lib/ai_local.js';

const connection = { url: process.env.REDIS_URL };

const w = new Worker('video-jobs', async (job) => {
    const { videoId, type } = job.data;

    await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'RUNNING',
            progress: 1
        }
    });

    if (type === 'TRANSCRIBE') {
        try {
            const video = await prisma.video.findUnique({ where: { id: videoId } });
            if (!video?.original) throw new Error('Video not found or no original file');

            await prisma.job.update({
                where: {
                    id: job.id
                },
                data: {
                    progress: 5
                }
            });

            const { text, segments } = await transcribeLocal(video.original);

            await prisma.subtitleSegment.deleteMany({ where: { videoId } });

            if (segments?.length) {
                const rows = segments.map(s => ({
                    videoId,
                    startMs: Math.max(0, Math.floor((s.start || 0) * 1000)),
                    endMs: Math.max(0, Math.floor((s.end || 0) * 1000)),
                    textSrc: s.text || ''
                }));

                const chunk = 200;
                for (let i = 0; i < rows.length; i += chunk) {
                    await prisma.subtitleSegment.createMany({ data: rows.slice(i, i + chunk) });
                    await prisma.job.update({
                        where: { id: job.id },
                        data: { progress: Math.min(95, 5 + Math.floor((i / rows.length) * 85)) }
                    });
                }
            } else {
                await prisma.subtitleSegment.create({
                    data: {
                        videoId,
                        startMs: 0,
                        endMs: 0,
                        textSrc: text || ''
                    }
                });
                await prisma.job.update({
                    where: {
                        id: job.id
                    },
                    data: {
                        progress: 95
                    }
                });
            }

            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'SUCCEEDED',
                    progress: 100,
                    error: null
                }
            });
        } catch (err) {
            console.error('TRANSCRIBE (local) failed:', err);
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    error: String(err?.message || err)
                }
            });
            throw err;
        }
        return;
    }

    await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'SUCCEEDED',
            progress: 100
        }
    });
}, { connection });

w.on('completed', (job) => console.log('Completed', job.name, job.id));
w.on('failed', (job, err) => console.error('Failed', job?.name, job?.id, err));
