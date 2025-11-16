import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const queue = new Queue('video-jobs', {
    connection: { url: process.env.REDIS_URL }
});

export async function POST(req) {
    const { userId } = await getCurrentUser();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
        videoId,
        format = 'mp4',
        crf,
        preset,
        burnLang,
        templateId
    } = body || {};

    if (!videoId) {
        return NextResponse.json({ error: 'videoId required' }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
        where: { id: videoId, userId }
    });
    if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (templateId) {
        const tpl = await prisma.renderTemplate.findFirst({
            where: { id: templateId, userId }
        });
        if (!tpl) {
            return NextResponse.json({ error: 'Template not found' }, { status: 400 });
        }
    }

    const meta = {
        format,
        crf: crf ?? null,
        preset: preset ?? null,
        burnLang: burnLang ?? null,
        templateId: templateId ?? null
    };

    const job = await prisma.job.create({
        data: {
            type: 'RENDER',
            status: 'QUEUED',
            progress: 0,
            userId,
            videoId,
            metaJson: meta
        }
    });

    await queue.add(
        'video-job',
        { videoId, type: 'RENDER', meta },
        {
            jobId: job.id,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        }
    );

    return NextResponse.json({ jobId: job.id });
}
