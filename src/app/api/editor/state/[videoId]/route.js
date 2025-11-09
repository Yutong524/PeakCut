export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET(req, { params }) {
    const videoId = params.videoId;
    const s = await prisma.editorState.findUnique({ where: { videoId } });
    return NextResponse.json({ state: s || null });
}

export async function PUT(req, { params }) {
    try {
        const videoId = params.videoId;
        const body = await req.json() || {};
        const { currentMs = 0, durationMs, activeSegmentId, projectId, metaJson } = body;

        const s = await prisma.editorState.upsert({
            where: { videoId },
            update: {
                currentMs,
                durationMs,
                activeSegmentId,
                projectId,
                metaJson
            },
            create: {
                videoId,
                currentMs,
                durationMs,
                activeSegmentId,
                projectId,
                metaJson
            }
        });

        if (projectId) {
            await prisma.video.update({
                where: { id: videoId },
                data: { projectId }
            });
        }

        return NextResponse.json({ state: s });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'save state failed' }, { status: 500 });
    }
}
