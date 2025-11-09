export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { renderedPath } from '@/lib/storage.js';

export async function GET(req, { params }) {
    const { searchParams } = new URL(req.url);
    const fmt = (searchParams.get('format') || 'mp4').toLowerCase();

    const file = renderedPath(params.id, fmt);
    if (!fs.existsSync(file)) {
        return NextResponse.json(
            { error: 'rendered file not found' },
            { status: 404 }
        );
    }

    const stream = fs.createReadStream(file);
    const ct = fmt === 'webm' ? 'video/webm' : 'video/mp4';
    return new NextResponse(stream, {
        status: 200,
        headers: {
            'Content-Type': ct,
            'Content-Disposition': `attachment; filename="${params.id}.${fmt}"`,
            'Cache-Control': 'no-store',
        },
    });
}
