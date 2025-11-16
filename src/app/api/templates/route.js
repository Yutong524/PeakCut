import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    const { userId } = await getCurrentUser();
    if (!userId) {
        return NextResponse.json({ templates: [] }, { status: 200 });
    }

    const templates = await prisma.renderTemplate.findMany({
        where: { userId },
        orderBy: [
            {
                isDefault: 'desc'
            },
            {
                createdAt: 'desc'
            }
        ]
    });

    return NextResponse.json({ templates });
}

export async function POST(req) {
    const { userId } = await getCurrentUser();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const {
        name,
        description,
        width,
        height,
        aspectRatio,
        fontFamily,
        fontSize,
        primaryColor,
        outlineColor,
        outlineSize,
        bgColor,
        bgOpacity,
        position,
        textAlign,
        lineSpacing,
        maxLineWidth,
        burnLang,
        isDefault
    } = body || {};

    if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (isDefault) {
        await prisma.renderTemplate.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
    }

    const template = await prisma.renderTemplate.create({
        data: {
            userId,
            name,
            description: description || null,
            width: width ?? null,
            height: height ?? null,
            aspectRatio: aspectRatio || null,
            fontFamily: fontFamily || 'Arial',
            fontSize: fontSize ?? 18,
            primaryColor: primaryColor || '#FFFFFF',
            outlineColor: outlineColor || '#000000',
            outlineSize: outlineSize ?? 1,
            bgColor: bgColor || '#000000',
            bgOpacity: typeof bgOpacity === 'number' ? bgOpacity : 0.4,
            position: position || 'bottom',
            textAlign: textAlign || 'center',
            lineSpacing: lineSpacing ?? 4,
            maxLineWidth: maxLineWidth ?? 42,
            burnLang: burnLang || 'textSrc',
            isDefault: !!isDefault
        }
    });

    return NextResponse.json({ template }, { status: 201 });
}
