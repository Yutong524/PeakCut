export const runtime = 'nodejs';
import { prisma } from '@/lib/db';

export async function GET(req, { params }) {
    const job = await prisma.job.findUnique({
        where: {
            id: params.id
        }
    });
    if (!job) return new Response(JSON.stringify(
        { error: 'Not found' }),
        { status: 404 }
    );
    return new Response(JSON.stringify({ job }), { status: 200 });
}
