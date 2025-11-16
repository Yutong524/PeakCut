import { Worker } from 'bullmq';
import fs from 'node:fs';
import path from 'node:path';

import { prisma } from '../lib/db.js';
import { transcribeLocal } from '../lib/ai_local.js';

import { ffmpeg } from '../lib/ffmpeg.js';
import { renderedPath } from '../lib/storage.js';
import { writeTempSrt } from '../lib/srt.js';

const connection = { url: process.env.REDIS_URL };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

async function setJobPatch(jobId, patch) {
    try {
        await prisma.job.update({ where: { id: jobId }, data: patch });
    } catch (e) {
        console.error('[JobPatch] update failed:', jobId, patch, e);
    }
}

function hexToAss(color) {
    if (!color) return '&H00FFFFFF&';
    let c = color.trim();
    if (c.startsWith('#')) c = c.slice(1);
    if (c.length === 3) {
        c = c.split('').map(ch => ch + ch).join('');
    }
    if (c.length !== 6) return '&H00FFFFFF&';
    const r = c.slice(0, 2);
    const g = c.slice(2, 4);
    const b = c.slice(4, 6);
    return `&H00${b}${g}${r}&`;
}

function resolveAlignment(position, textAlign) {
    const pos = (position || 'bottom').toLowerCase();
    const align = (textAlign || 'center').toLowerCase();

    let baseRow = 2;
    if (pos === 'top') baseRow = 1;
    if (pos === 'bottom') baseRow = 3;

    let col = 2;
    if (align === 'left') col = 1;
    if (align === 'right') col = 3;

    return (baseRow - 1) * 3 + col;
}

function buildForceStyleFromTemplate(tpl) {
    const font = tpl.fontFamily || 'Arial';
    const fontSize = tpl.fontSize || 18;
    const primary = hexToAss(tpl.primaryColor || '#FFFFFF');
    const outline = tpl.outlineSize ?? 1;
    const outlineColor = hexToAss(tpl.outlineColor || '#000000');
    const bgColor = hexToAss(tpl.bgColor || '#000000');
    const alignment = resolveAlignment(tpl.position, tpl.textAlign);
    const lineSpacing = tpl.lineSpacing ?? 4;

    const backAlpha = Math.round(clamp((1 - (tpl.bgOpacity ?? 0.4)) * 255, 0, 255));
    const backAlphaHex = backAlpha.toString(16).padStart(2, '0').toUpperCase();
    const backColour = bgColor.replace('&H00', `&H${backAlphaHex}`);

    const parts = [
        `Fontname=${font}`,
        `Fontsize=${fontSize}`,
        `PrimaryColour=${primary}`,
        `OutlineColour=${outlineColor}`,
        `Outline=${outline}`,
        `BorderStyle=3`,
        `BackColour=${backColour}`,
        `Alignment=${alignment}`,
        `MarginV=30`,
        `Spacing=${lineSpacing}`
    ];

    return parts.join(',');
}

async function loadRenderTemplate(meta) {
    const templateId = meta?.templateId;
    if (!templateId) return null;
    try {
        const tpl = await prisma.renderTemplate.findUnique({
            where: { id: templateId }
        });
        return tpl;
    } catch (e) {
        console.error('[RenderTemplate] load failed:', templateId, e);
        return null;
    }
}

async function appendJobLog(jobId, line) {
    try {
        const now = new Date();
        const prefix = now.toISOString();
        await prisma.job.update({
            where: { id: jobId },
            data: {
                logText: {
                    set: prisma.$executeRaw`SELECT COALESCE(logText, '') FROM Job WHERE id = ${jobId}`
                }
            }
        });
    } catch {
        try {
            const job = await prisma.job.findUnique({ where: { id: jobId } });
            const prev = job?.logText || '';
            const next = `${prev}${prev ? '\n' : ''}[${new Date().toISOString()}] ${line}`;
            await prisma.job.update({
                where: { id: jobId },
                data: { logText: next }
            });
        } catch (e) {
            console.error('[JobLog] append failed:', jobId, e);
        }
    }
}

async function setHeartbeat(jobId) {
    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { heartbeatAt: new Date() }
        });
    } catch (e) {
        console.error('[JobHeartbeat] failed:', jobId, e);
    }
}

async function handleTranscribe(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
    await setHeartbeat(job.id);
    await appendJobLog(job.id, 'TRANSCRIBE started');

    try {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video?.original) throw new Error('Video not found or no original file');

        await setJobPatch(job.id, { progress: 5 });
        await appendJobLog(job.id, `Reading file: ${video.original}`);

        const { text, segments } = await transcribeLocal(video.original);

        await prisma.subtitleSegment.deleteMany({ where: { videoId } });

        if (segments?.length) {
            const rows = segments.map(s => ({
                videoId,
                startMs: Math.max(0, Math.floor((s.start || 0) * 1000)),
                endMs: Math.max(0, Math.floor((s.end || 0) * 1000)),
                textSrc: s.text || ''
            }));

            const chunk = 200;
            for (let i = 0; i < rows.length; i += chunk) {
                await prisma.subtitleSegment.createMany({ data: rows.slice(i, i + chunk) });
                const prog = clamp(5 + Math.floor((i / rows.length) * 85), 5, 95);
                await setJobPatch(job.id, { progress: prog });
                await setHeartbeat(job.id);
            }
        } else {
            await prisma.subtitleSegment.create({
                data: { 
                    videoId, 
                    startMs: 0, 
                    endMs: 0, 
                    textSrc: text || '' 
                }
            });
            await setJobPatch(job.id, { progress: 95 });
        }

        await setJobPatch(job.id, { status: 'SUCCEEDED', progress: 100, error: null });
        await setHeartbeat(job.id);
        await appendJobLog(job.id, 'TRANSCRIBE finished');
    } catch (err) {
        console.error('TRANSCRIBE (local) failed:', err);
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        await setHeartbeat(job.id);
        await appendJobLog(job.id, `TRANSCRIBE failed: ${String(err?.message || err)}`);
        throw err;
    }
}

async function handleAutoCut(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
    await setHeartbeat(job.id);
    await appendJobLog(job.id, 'AUTOCUT started');

    try {
        for (let i = 0; i <= 12; i++) {
            await sleep(200);
            await setJobPatch(job.id, { progress: clamp(5 + i * 7, 5, 95) });
            await setHeartbeat(job.id);
        }
        await setJobPatch(job.id, { 
            status: 'SUCCEEDED', 
            progress: 100, 
            error: null 
        });
        await appendJobLog(job.id, 'AUTOCUT finished');
    } catch (err) {
        console.error('AUTOCUT failed:', err);
        await setJobPatch(job.id, { 
            status: 'FAILED', 
            error: String(err?.message || err) 
        });
        await appendJobLog(job.id, `AUTOCUT failed: ${String(err?.message || err)}`);
        throw err;
    }
}

async function handleTranslate(job, videoId) {
    await setJobPatch(job.id, { 
        status: 'RUNNING', 
        progress: 1 
    });
    await setHeartbeat(job.id);
    await appendJobLog(job.id, 'TRANSLATE started');

    try {
        const segs = await prisma.subtitleSegment.findMany({ where: { videoId } });
        const total = segs.length || 1;
        let done = 0;

        for (const s of segs) {
            await prisma.subtitleSegment.update({
                where: { id: s.id },
                data: { textEn: s.textSrc, textZh: (s.textSrc || '') }
            });
            done++;
            if (done % 50 === 0) {
                await setJobPatch(job.id, { 
                    progress: clamp(5 + Math.floor(done / total * 90), 5, 95) 
                });
                await setHeartbeat(job.id);
            }
        }

        await setJobPatch(job.id, { 
            status: 'SUCCEEDED', 
            progress: 100, 
            error: null });
        await appendJobLog(job.id, 'TRANSLATE finished');
    } catch (err) {
        console.error('TRANSLATE failed:', err);
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        await appendJobLog(job.id, `TRANSLATE failed: ${String(err?.message || err)}`);
        throw err;
    }
}

async function handleRender(job, videoId, meta = {}) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
    await setHeartbeat(job.id);
    await appendJobLog(job.id, 'RENDER started');

    try {
        const video = await prisma.video.findUnique({
            where: { id: videoId }
        });
        if (!video?.original || !fs.existsSync(video.original)) {
            await setJobPatch(job.id, { status: 'FAILED', error: 'video file missing' });
            await appendJobLog(job.id, 'RENDER failed: video file missing');
            throw new Error('video file missing');
        }

        const segments = await prisma.subtitleSegment.findMany({
            where: { videoId },
            orderBy: { startMs: 'asc' }
        });
        if (!segments?.length) {
            await setJobPatch(job.id, { status: 'FAILED', error: 'no subtitle segments' });
            await appendJobLog(job.id, 'RENDER failed: no subtitle segments');
            throw new Error('no subtitle segments');
        }

        const tpl = await loadRenderTemplate(meta);
        if (tpl) {
            await appendJobLog(job.id, `Using template: ${tpl.name} (${tpl.id})`);
        } else {
            await appendJobLog(job.id, 'No templateId provided, using default style');
        }

        const fmt = (meta?.format || process.env.RENDER_FORMAT || 'mp4').toLowerCase(); // mp4 | webm
        const crf = Number(meta?.crf ?? process.env.RENDER_CRF ?? (fmt === 'mp4' ? 23 : 32));
        const preset = String(meta?.preset ?? process.env.RENDER_PRESET ?? 'medium');
        const burnLang = tpl?.burnLang || meta?.burnLang || process.env.RENDER_LANG || 'textSrc';

        const srtFile = await writeTempSrt(segments, burnLang);

        const outFile = renderedPath(videoId, fmt);
        try { fs.unlinkSync(outFile); } catch { }

        const esc = (p) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

        const forceStyle = tpl
            ? buildForceStyleFromTemplate(tpl)
            : 'Outline=1,BorderStyle=1,Fontsize=18';

        await new Promise((resolve, reject) => {
            let prog = 3;

            const cmd = ffmpeg(video.original)
                .videoFilters(`subtitles='${esc(srtFile)}':force_style='${forceStyle}'`)
                .on('start', (c) => {
                    console.log('[ffmpeg] start:', c);
                    appendJobLog(job.id, 'ffmpeg started');
                })
                .on('progress', async () => {
                    prog = clamp(prog + 1, 3, 95);
                    await setJobPatch(job.id, { progress: prog });
                    await setHeartbeat(job.id);
                })
                .on('error', async (err) => {
                    console.error('[ffmpeg] error:', err);
                    await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
                    await appendJobLog(job.id, `ffmpeg error: ${String(err?.message || err)}`);
                    reject(err);
                })
                .on('end', async () => {
                    await setJobPatch(job.id, { progress: 98 });
                    await setHeartbeat(job.id);
                    await appendJobLog(job.id, 'ffmpeg finished');
                    resolve();
                });

            if (fmt === 'mp4') {
                cmd
                    .videoCodec('libx264')
                    .outputOptions([`-preset ${preset}`, `-crf ${crf}`, '-pix_fmt yuv420p'])
                    .audioCodec('aac')
                    .format('mp4')
                    .save(outFile);
            } else {
                cmd
                    .videoCodec('libvpx-vp9')
                    .outputOptions(['-b:v 0', `-crf ${crf}`, '-pix_fmt yuv420p'])
                    .audioCodec('libopus')
                    .format('webm')
                    .save(outFile);
            }
        });

        await setJobPatch(job.id, { progress: 99 });

        await prisma.job.update({
            where: { id: job.id },
            data: {
                metaJson: {
                    ...(meta || {}),
                    output: outFile,
                    templateId: meta?.templateId || tpl?.id || null
                }
            }
        });

        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100,
            error: null
        });
        await setHeartbeat(job.id);
        await appendJobLog(job.id, 'RENDER succeeded');
    } catch (err) {
        console.error('RENDER failed:', err);
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: String(err?.message || err)
        });
        await setHeartbeat(job.id);
        await appendJobLog(job.id, `RENDER failed: ${String(err?.message || err)}`);
        throw err;
    }
}

const w = new Worker('video-jobs', async (job) => {
    const { videoId, type, meta } = job.data || {};
    if (!videoId || !type) {
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: 'invalid job payload'
        });
        throw new Error('invalid job payload');
    }

    if (type === 'TRANSCRIBE') {
        await handleTranscribe(job, videoId);
        return;
    }

    if (type === 'AUTOCUT') {
        await handleAutoCut(job, videoId);
        return;
    }

    if (type === 'TRANSLATE') {
        await handleTranslate(job, videoId);
        return;
    }

    if (type === 'RENDER') {
        await handleRender(job, videoId, meta);
        return;
    }

    await setJobPatch(job.id, {
        status: 'SUCCEEDED',
        progress: 100,
        error: null
    });
}, { connection });

w.on('completed', (job) => console.log('Completed', job.name, job.id));
w.on('failed', (job, err) => console.error('Failed', job?.name, job?.id, err));

export { w };
