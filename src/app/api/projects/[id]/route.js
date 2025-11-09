export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET(req, { params }) {
    const id = params.id;
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            videos: {
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            segments: true,
                            jobs: true
                        }
                    },
                    jobs: {
                        where: {
                            type: 'RENDER'
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                }
            }
        }
    });
    if (!project)
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ project });
}

export async function DELETE(req, { params }) {
    const id = params.id;
    try {
        await prisma.video.updateMany({
            where: { projectId: id },
            data: { projectId: null }
        });
        await prisma.editorState.updateMany({
            where: { projectId: id },
            data: { projectId: null }
        });
        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
}
