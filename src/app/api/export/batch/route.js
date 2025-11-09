export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db.js';
import { buildSRT, buildVTT } from '@/lib/subtitle-format.js';

export async function POST(req) {
    try {
        const { videoIds = [], format = 'srt' } = await req.json() || {};
        const fmt = String(format).toLowerCase();
        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return NextResponse.json(
                { error: 'videoIds required' },
                { status: 400 }
            );
        }
        if (!['srt', 'vtt', 'json'].includes(fmt)) {
            return NextResponse.json(
                { error: 'unsupported format' },
                { status: 400 }
            );
        }

        const zip = new JSZip();

        for (const id of videoIds) {
            const segs = await prisma.subtitleSegment.findMany({
                where: { videoId: id },
                orderBy: { startMs: 'asc' }
            });
            if (!segs.length) continue;

            let content = '';
            let ext = fmt;

            if (fmt === 'srt') content = buildSRT(segs);
            else if (fmt === 'vtt') content = buildVTT(segs);
            else content = JSON.stringify({
                videoId: id,
                segments: segs
            }, null, 2);

            zip.file(`subtitles_${id}.${ext}`, content);
        }

        const blob = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });
        const headers = new Headers({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="subtitles_batch_${Date.now()}.zip"`,
            'Cache-Control': 'no-store'
        });
        return new NextResponse(blob, { status: 200, headers });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: 'batch export failed' },
            { status: 500 }
        );
    }
}
