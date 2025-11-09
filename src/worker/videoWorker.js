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

async function handleTranscribe(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });

    try {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video?.original) throw new Error('Video not found or no original file');

        await setJobPatch(job.id, { progress: 5 });

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
                await setJobPatch(job.id, {
                    progress: clamp(5 + Math.floor((i / rows.length) * 85), 5, 95)
                });
            }
        } else {
            await prisma.subtitleSegment.create({
                data: { videoId, startMs: 0, endMs: 0, textSrc: text || '' }
            });
            await setJobPatch(job.id, { progress: 95 });
        }

        await setJobPatch(job.id, { status: 'SUCCEEDED', progress: 100, error: null });
    } catch (err) {
        console.error('TRANSCRIBE (local) failed:', err);
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        throw err;
    }
}

async function handleAutoCut(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
    try {
        for (let i = 0; i <= 12; i++) {
            await sleep(200);
            await setJobPatch(job.id, { progress: clamp(5 + i * 7, 5, 95) });
        }
        await setJobPatch(job.id, { status: 'SUCCEEDED', progress: 100, error: null });
    } catch (err) {
        console.error('AUTOCUT failed:', err);
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        throw err;
    }
}

async function handleTranslate(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
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
                await setJobPatch(job.id, { progress: clamp(5 + Math.floor(done / total * 90), 5, 95) });
            }
        }

        await setJobPatch(job.id, { status: 'SUCCEEDED', progress: 100, error: null });
    } catch (err) {
        console.error('TRANSLATE failed:', err);
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        throw err;
    }
}

async function handleRender(job, videoId, meta = {}) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });

    try {
        const video = await prisma.video.findUnique({
            where: {
                id: videoId
            }
        });
        if (!video?.original || !fs.existsSync(video.original)) {
            await setJobPatch(job.id, { status: 'FAILED', error: 'video file missing' });
            throw new Error('video file missing');
        }

        const segments = await prisma.subtitleSegment.findMany({
            where: { videoId },
            orderBy: { startMs: 'asc' },
        });
        if (!segments?.length) {
            await setJobPatch(job.id, { status: 'FAILED', error: 'no subtitle segments' });
            throw new Error('no subtitle segments');
        }

        const fmt = (meta?.format || process.env.RENDER_FORMAT || 'mp4').toLowerCase(); // mp4 | webm
        const crf = Number(meta?.crf ?? process.env.RENDER_CRF ?? (fmt === 'mp4' ? 23 : 32));
        const preset = String(meta?.preset ?? process.env.RENDER_PRESET ?? 'medium');
        const lang = String(meta?.burnLang ?? process.env.RENDER_LANG ?? 'textSrc');

        const srtFile = await writeTempSrt(segments, lang);

        const outFile = renderedPath(videoId, fmt);
        try { fs.unlinkSync(outFile); } catch { }

        const esc = (p) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

        await new Promise((resolve, reject) => {
            let prog = 3;

            const cmd = ffmpeg(video.original)
                .videoFilters(`subtitles='${esc(srtFile)}':force_style='Outline=1,BorderStyle=1,Fontsize=18'`)
                .on('start', (c) => {
                    console.log('[ffmpeg] start:', c);
                })
                .on('progress', async () => {
                    prog = clamp(prog + 1, 3, 95);
                    await setJobPatch(job.id, { progress: prog });
                })
                .on('error', async (err) => {
                    console.error('[ffmpeg] error:', err);
                    await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
                    reject(err);
                })
                .on('end', async () => {
                    await setJobPatch(job.id, { progress: 98 });
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
                // webm / vp9
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
            data: { metaJson: { ...(meta || {}), output: outFile } }
        });

        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100,
            error: null
        });
    } catch (err) {
        console.error('RENDER failed:', err);
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: String(err?.message || err)
        });
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
