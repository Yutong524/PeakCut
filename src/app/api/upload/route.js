import { prisma } from '@/lib/db';
import { enqueueJob } from '@/lib/queue';
import { ensureStorage, localVideoPath } from '@/lib/storage';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req) {
    const form = await req.formData();
    const file = form.get('file');

    if (!file) {
        return new Response(
            JSON.stringify({ error: 'No file' }),
            { status: 400 }
        );
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
            original: path.resolve(p)
        }
    });

    const trans = await prisma.job.create({
        data: {
            type: 'TRANSCRIBE',
            status: 'QUEUED',
            videoId: video.id
        }
    });

    const cut = await prisma.job.create({
        data: {
            type: 'AUTOCUT',
            status: 'QUEUED',
            videoId: video.id
        }
    });

    const tr = await prisma.job.create({
        data: {
            type: 'TRANSLATE',
            status: 'QUEUED',
            videoId: video.id
        }
    });

    await enqueueJob({
        type: 'TRANSCRIBE',
        videoId: video.id
    });

    await enqueueJob({
        type: 'AUTOCUT',
        videoId: video.id,
        meta: {
            dependsOn: trans.id
        }
    });

    await enqueueJob({
        type: 'TRANSLATE',
        videoId: video.id,
        meta: {
            dependsOn: cut.id
        }
    });

    return new Response(
        JSON.stringify({
            videoId: video.id,
            jobs: [trans.id, cut.id, tr.id]
        }),
        { status: 200 }
    );
}
