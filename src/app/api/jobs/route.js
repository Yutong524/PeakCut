export const runtime = 'nodejs';
import { prisma } from "../../../lib/db";

export async function GET() {
    const jobs = await prisma.job.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    });
    return new Response(JSON.stringify({ jobs }), { status: 200 });
}
