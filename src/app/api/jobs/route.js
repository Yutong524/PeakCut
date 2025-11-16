import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await requireUser();

        const jobs = await prisma.job.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({ jobs });
    } catch (e) {
        const status = e.status || 500;
        return NextResponse.json(
            { error: e.message || 'Failed to load jobs' },
            { status }
        );
    }
}
