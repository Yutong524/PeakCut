export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';
import { enqueueJob } from '@/lib/queue.js';

export async function POST(req) {
    try {
        const body = await req.json();
        const { videoId, format = 'mp4', crf, preset, burnLang } = body || {};
        if (!videoId) return NextResponse.json(
            { error: 'videoId required' },
            { status: 400 }
        );

        const video = await prisma.video.findUnique({
            where: {
                id: videoId
            }
        });
        if (!video) return NextResponse.json(
            { error: 'video not found' },
            { status: 404 }
        );

        const job = await prisma.job.create({
            data: {
                type: 'RENDER',
                status: 'QUEUED',
                videoId,
                metaJson: {
                    format,
                    crf,
                    preset,
                    burnLang
                }
            }
        });

        await enqueueJob({
            type: 'RENDER', videoId, meta: {
                format,
                crf,
                preset,
                burnLang,
                jobId: job.id
            }
        });

        return NextResponse.json(
            { jobId: job.id },
            { status: 201 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'start render failed' },
            { status: 500 }
        );
    }
}
