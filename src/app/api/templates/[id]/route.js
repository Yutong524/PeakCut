import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req, { params }) {
    const { userId } = await getCurrentUser();
    if (!userId)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const tpl = await prisma.renderTemplate.findFirst({
        where: { id, userId }
    });

    if (!tpl)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ template: tpl });
}

export async function PATCH(req, { params }) {
    const { userId } = await getCurrentUser();
    if (!userId)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const tpl = await prisma.renderTemplate.findFirst({
        where: { id, userId }
    });

    if (!tpl)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

    if (isDefault) {
        await prisma.renderTemplate.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
    }

    const updated = await prisma.renderTemplate.update({
        where: { id },
        data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(width !== undefined ? { width } : {}),
            ...(height !== undefined ? { height } : {}),
            ...(aspectRatio !== undefined ? { aspectRatio } : {}),
            ...(fontFamily !== undefined ? { fontFamily } : {}),
            ...(fontSize !== undefined ? { fontSize } : {}),
            ...(primaryColor !== undefined ? { primaryColor } : {}),
            ...(outlineColor !== undefined ? { outlineColor } : {}),
            ...(outlineSize !== undefined ? { outlineSize } : {}),
            ...(bgColor !== undefined ? { bgColor } : {}),
            ...(bgOpacity !== undefined ? { bgOpacity } : {}),
            ...(position !== undefined ? { position } : {}),
            ...(textAlign !== undefined ? { textAlign } : {}),
            ...(lineSpacing !== undefined ? { lineSpacing } : {}),
            ...(maxLineWidth !== undefined ? { maxLineWidth } : {}),
            ...(burnLang !== undefined ? { burnLang } : {}),
            ...(isDefault !== undefined ? { isDefault } : {})
        }
    });

    return NextResponse.json({ template: updated });
}

export async function DELETE(_req, { params }) {
    const { userId } = await getCurrentUser();
    if (!userId)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const tpl = await prisma.renderTemplate.findFirst({
        where: { id, userId }
    });

    if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.renderTemplate.delete({
        where: { id }
    });

    return NextResponse.json({ ok: true });
}
