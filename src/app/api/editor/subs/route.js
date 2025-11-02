import { prisma } from '@/lib/db';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    if (!videoId) return new Response(JSON.stringify(
        { error: 'videoId required' }),
        { status: 400 }
    );

    const segments = await prisma.subtitleSegment.findMany({
        where: { videoId },
        orderBy: { startMs: 'asc' }
    });
    return new Response(JSON.stringify({ segments }), { status: 200 });
}
