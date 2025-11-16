import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import path from 'node:path';

import { prisma } from '@/lib/db';
import { ensureStorage, localVideoPath } from '@/lib/storage';
import { enqueueJob } from '@/lib/queue';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const user = await requireUser();

        const form = await req.formData();
        const file = form.get('file');
        if (!file) {
            return NextResponse.json({ error: 'No file' }, { status: 400 });
        }

        ensureStorage();
        const filename = `${randomUUID()}-${file.name}`;
        const p = localVideoPath(filename);
        const arrayBuffer = await file.arrayBuffer();

        await new Promise((resolve, reject) => {
            const ws = createWriteStream(p);
            ws.on('finish', resolve);
            ws.on('error', reject);
            ws.end(Buffer.from(arrayBuffer));
        });

        const video = await prisma.video.create({
            data: {
                original: path.resolve(p),
                userId: user.id,
            },
        });

        const job = await prisma.job.create({
            data: {
                type: 'TRANSCRIBE',
                status: 'QUEUED',
                progress: 0,
                videoId: video.id,
                userId: user.id,
            },
        });

        await enqueueJob({
            id: job.id,
            videoId: video.id,
            type: 'TRANSCRIBE',
            userId: user.id,
        });

        return NextResponse.json({ 
            videoId: video.id, 
            jobId: job.id 
        });
    } catch (e) {
        console.error('/api/upload failed:', e);
        const status = e.status || 500;
        return NextResponse.json({ error: e.message || 'Upload failed' }, { status });
    }
}
