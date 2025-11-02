export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(_req, { params }) {
    try {
        const id = params.id;
        const video = await prisma.video.findUnique({
            where: {
                id
            }
        });
        if (!video?.original || !fs.existsSync(video.original)) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        const stat = fs.statSync(video.original);
        const file = fs.createReadStream(video.original);

        const ext = path.extname(video.original).toLowerCase();
        const contentType =
            ext === '.mp4' ? 'video/mp4'
                : ext === '.mov' ? 'video/quicktime'
                    : 'application/octet-stream';

        return new NextResponse(file, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(stat.size),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'stream error' }, { status: 500 });
    }
}
