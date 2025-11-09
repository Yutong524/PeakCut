export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET() {
    const list = await prisma.project.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            _count: {
                select: {
                    videos: true,
                    editorStates: true
                }
            }
        }
    });
    return NextResponse.json({ projects: list });
}

export async function POST(req) {
    try {
        const { name } = await req.json() || {};
        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: 'name required' },
                { status: 400 }
            );
        }
        const p = await prisma.project.create({
            data: {
                name: name.trim()
            }
        });
        return NextResponse.json({ project: p }, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'create failed' }, { status: 500 });
    }
}
