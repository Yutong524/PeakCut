export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db.js';

export async function GET() {
    const videos = await prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
            _count: {
                select: {
                    segments: true,
                    jobs: true
                }
            }
        }
    });
    return NextResponse.json({ videos });
}
