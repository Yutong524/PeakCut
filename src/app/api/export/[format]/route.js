export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';
import { buildSRT, buildVTT } from '@/lib/subtitle-format.js';

export async function GET(req, { params }) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const format = (params.format || '').toLowerCase();

    if (!videoId) return NextResponse.json(
        { error: 'videoId required' },
        { status: 400 }
    );
    if (!['srt', 'vtt', 'json'].includes(format)) {
        return NextResponse.json(
            { error: 'unsupported format' },
            { status: 400 }
        );
    }

    const segs = await prisma.subtitleSegment.findMany({
        where: { videoId },
        orderBy: { startMs: 'asc' }
    });
    if (!segs.length) return NextResponse.json(
        { error: 'no segments' },
        { status: 404 }
    );

    let body = '';
    let contentType = 'text/plain;charset=utf-8';
    let ext = format;

    if (format === 'srt') {
        body = buildSRT(segs);
        contentType = 'text/plain;charset=utf-8';
    } else if (format === 'vtt') {
        body = buildVTT(segs);
        contentType = 'text/vtt;charset=utf-8';
    } else {
        body = JSON.stringify({
            videoId,
            segments: segs
        }, null, 2);
        contentType = 'application/json';
    }

    const headers = new Headers({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="subtitles_${videoId}.${ext}"`
    });
    return new NextResponse(body, { status: 200, headers });
}
