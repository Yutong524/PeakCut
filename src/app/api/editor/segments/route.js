export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });

    const segments = await prisma.subtitleSegment.findMany({
        where: { videoId },
        orderBy: { startMs: 'asc' },
    });
    return NextResponse.json({ segments });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { videoId, startMs, endMs, textSrc } = body || {};
        if (!videoId) return NextResponse.json(
            { error: 'videoId required' },
            { status: 400 }
        );

        const seg = await prisma.subtitleSegment.create({
            data: {
                videoId,
                startMs: Math.max(0, parseInt(startMs ?? 0, 10)),
                endMs: Math.max(
                    0,
                    parseInt(
                        endMs ?? ((parseInt(startMs ?? 0, 10)) + 1500),
                        10
                    )
                ),
                textSrc: (textSrc ?? '').trim(),
            }
        });
        return NextResponse.json({ segment: seg }, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'create failed' }, { status: 500 });
    }
}
