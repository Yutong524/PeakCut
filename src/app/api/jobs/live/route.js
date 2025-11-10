export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

async function fetchJobs(limit = 50) {
    const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            type: true,
            status: true,
            progress: true,
            error: true,
            videoId: true,
            createdAt: true,
            updatedAt: true,
            heartbeatAt: true,
            metaJson: true,
        },
    });
    return jobs;
}

export async function GET() {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            let closed = false;
            const send = (event, data) => {
                controller.enqueue(encoder.encode(`event: ${event}\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            fetchJobs().then(j => send('snapshot', { jobs: j })).catch(() => { });

            const iv = setInterval(async () => {
                if (closed) return;
                try {
                    const jobs = await fetchJobs();
                    send('update', { jobs, ts: Date.now() });
                } catch (e) {
                    send('ping', { ts: Date.now() });
                }
            }, 1000);

            const keep = setInterval(() => {
                if (closed) return;
                controller.enqueue(encoder.encode(`event: ping\ndata: {"ts":${Date.now()}}\n\n`));
            }, 15000);

            const onClose = () => {
                closed = true;
                clearInterval(iv);
                clearInterval(keep);
                controller.close();
            };

            const ttl = setTimeout(onClose, 60 * 60 * 1000); // 1h
            controller.onpull = () => { };
            controller.oncancel = () => { onClose(); clearTimeout(ttl); };
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
