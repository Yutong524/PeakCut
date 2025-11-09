export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET(req, { params }) {
    const id = params.id;
    const videos = await prisma.video.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: {
                    segments: true,
                    jobs: true
                }
            }
        }
    });
    return NextResponse.json({ videos });
}

export async function POST(req, { params }) {
    try {
        const id = params.id;
        const { videoId } = await req.json() || {};
        if (!videoId)
            return NextResponse.json({ error: 'videoId required' }, { status: 400 });

        const p = await prisma.project.findUnique({ where: { id } });
        if (!p)
            return NextResponse.json({ error: 'project not found' }, { status: 404 });

        const v = await prisma.video.update({
            where: { id: videoId },
            data: { projectId: id }
        });

        return NextResponse.json({ video: v });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'attach failed' }, { status: 500 });
    }
}
