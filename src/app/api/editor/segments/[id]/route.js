export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function PATCH(req, { params }) {
    try {
        const id = params.id;
        const body = await req.json();

        const data = {};
        if (body.startMs != null) data.startMs = Math.max(0, parseInt(body.startMs, 10));
        if (body.endMs != null) data.endMs = Math.max(0, parseInt(body.endMs, 10));
        if (body.textSrc != null) data.textSrc = String(body.textSrc).trim();
        if (body.textEn != null) data.textEn = String(body.textEn).trim();
        if (body.textZh != null) data.textZh = String(body.textZh).trim();
        if (body.speaker != null) data.speaker = String(body.speaker).trim();

        const seg = await prisma.subtitleSegment.update({ where: { id }, data });
        return NextResponse.json({ segment: seg });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'update failed' }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    try {
        const id = params.id;
        await prisma.subtitleSegment.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
}
