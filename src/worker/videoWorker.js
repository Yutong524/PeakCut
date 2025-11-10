import { Worker } from 'bullmq';
import fs from 'node:fs';
import path from 'node:path';

import { prisma } from '../lib/db.js';
import { transcribeLocal } from '../lib/ai_local.js';

import { ffmpeg } from '../lib/ffmpeg.js';
import { renderedPath } from '../lib/storage.js';
import { writeTempSrt } from '../lib/srt.js';

const connection = {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        return Math.min(1000 * (2 ** times), 15000);
    },
};


const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowISO = () => new Date().toISOString();

async function appendLog(jobId, message, level = 'info') {
    const line = `[${nowISO()}] [${level.toUpperCase()}] ${message}\n`;
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE Job SET logText = COALESCE(logText, '') || ? WHERE id = ?`,
            line,
            jobId
        );
    } catch (e) {
        try {
            const j = await prisma.job.findUnique({
                where: { id: jobId },
                select: { logText: true }
            });
            await prisma.job.update({
                where: { id: jobId },
                data: { logText: (j?.logText || '') + line },
            });
        } catch (err) {
            console.error('[appendLog] failed:', jobId, err);
        }
    }
}

async function beat(jobId, progress) {
    try {
        const data = { heartbeatAt: new Date() };
        if (typeof progress === 'number') data.progress = progress;
        await prisma.job.update({
            where:
                { id: jobId },
            data
        });
    } catch (e) {
        console.error('[beat] failed:', jobId, e);
    }
}

async function setJobPatch(jobId, patch) {
    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { heartbeatAt: new Date(), ...patch },
        });
    } catch (e) {
        console.error('[JobPatch] update failed:', jobId, patch, e);
    }
}

function startHeartbeat(jobId) {
    const timer = setInterval(() => beat(jobId), 5000);
    return () => clearInterval(timer);
}

async function handleTranscribe(job, videoId) {
    await setJobPatch(job.id, {
        status: 'RUNNING',
        progress: 1
    });
    const stop = startHeartbeat(job.id);
    await appendLog(job.id, `TRANSCRIBE started for video ${videoId}`);

    try {
        const video = await prisma.video.findUnique({
            where: { id: videoId }
        });
        if (!video?.original) {
            await appendLog(job.id, 'Video not found or no original file', 'error');
            throw new Error('Video not found or no original file');
        }

        await setJobPatch(job.id, { progress: 5 });

        await appendLog(job.id, `Invoking local ASR on: ${video.original}`);
        const { text, segments } = await transcribeLocal(video.original);

        await appendLog(job.id, `Transcribe result: ${segments?.length || 0} segments`);
        await prisma.subtitleSegment.deleteMany({ where: { videoId } });

        if (segments?.length) {
            const rows = segments.map(s => ({
                videoId,
                startMs: Math.max(0, Math.floor((s.start || 0) * 1000)),
                endMs: Math.max(0, Math.floor((s.end || 0) * 1000)),
                textSrc: s.text || '',
            }));

            const chunk = 200;
            for (let i = 0; i < rows.length; i += chunk) {
                await prisma.subtitleSegment.createMany({ data: rows.slice(i, i + chunk) });
                const prog = clamp(5 + Math.floor((i / rows.length) * 85), 5, 95);
                await setJobPatch(job.id, { progress: prog });
                if (i === 0 || i % (chunk * 3) === 0) {
                    await appendLog(job.id, `Inserted ${Math.min(i + chunk, rows.length)}/${rows.length} segments`);
                }
            }
        } else {
            await prisma.subtitleSegment.create({
                data: { videoId, startMs: 0, endMs: 0, textSrc: text || '' },
            });
            await setJobPatch(job.id, { progress: 95 });
            await appendLog(job.id, 'No segments detected, inserted 1 whole-line segment');
        }

        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100,
            error: null
        });
        await appendLog(job.id, 'TRANSCRIBE succeeded', 'info');
    } catch (err) {
        console.error('TRANSCRIBE (local) failed:', err);
        await appendLog(job.id, `TRANSCRIBE failed: ${err?.message || err}`, 'error');
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: String(err?.message || err)
        });
        throw err;
    } finally {
        stop();
    }
}

async function handleAutoCut(job, videoId) {
    await setJobPatch(job.id, {
        status: 'RUNNING',
        progress: 1
    });
    const stop = startHeartbeat(job.id);
    await appendLog(job.id, `AUTOCUT started for video ${videoId}`);

    try {
        for (let i = 0; i <= 12; i++) {
            await sleep(200);
            const p = clamp(5 + i * 7, 5, 95);
            await setJobPatch(job.id, { progress: p });
            if (i % 3 === 0) await appendLog(job.id, `AUTOCUT progress ~ ${p}%`);
        }
        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100,
            error: null
        });
        await appendLog(job.id, 'AUTOCUT succeeded', 'info');
    } catch (err) {
        console.error('AUTOCUT failed:', err);
        await appendLog(job.id, `AUTOCUT failed: ${err?.message || err}`, 'error');
        await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
        throw err;
    } finally {
        stop();
    }
}

async function handleTranslate(job, videoId) {
    await setJobPatch(job.id, { status: 'RUNNING', progress: 1 });
    const stop = startHeartbeat(job.id);
    await appendLog(job.id, `TRANSLATE started for video ${videoId}`);

    try {
        const segs = await prisma.subtitleSegment.findMany({ where: { videoId } });
        const total = segs.length || 1;
        let done = 0;

        for (const s of segs) {
            await prisma.subtitleSegment.update({
                where: { id: s.id },
                data: { textEn: s.textSrc, textZh: (s.textSrc || '') },
            });
            done++;
            if (done % 50 === 0 || done === total) {
                const p = clamp(5 + Math.floor((done / total) * 90), 5, 95);
                await setJobPatch(job.id, { progress: p });
                await appendLog(job.id, `TRANSLATE ${done}/${total} (${p}%)`);
            }
        }

        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100,
            error: null
        });
        await appendLog(job.id, 'TRANSLATE succeeded', 'info');
    } catch (err) {
        console.error('TRANSLATE failed:', err);
        await appendLog(job.id, `TRANSLATE failed: ${err?.message || err}`, 'error');
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: String(err?.message || err)
        });
        throw err;
    } finally {
        stop();
    }
}

async function handleRender(job, videoId, meta = {}) {
    await setJobPatch(job.id, {
        status: 'RUNNING',
        progress: 1
    });
    const stop = startHeartbeat(job.id);
    await appendLog(job.id, `RENDER started for video ${videoId}`);

    try {
        const video = await prisma.video.findUnique({ where: { id: videoId } });
        if (!video?.original || !fs.existsSync(video.original)) {
            await appendLog(job.id, 'Video file missing', 'error');
            await setJobPatch(job.id, { status: 'FAILED', error: 'video file missing' });
            throw new Error('video file missing');
        }

        const segments = await prisma.subtitleSegment.findMany({
            where: { videoId },
            orderBy: { startMs: 'asc' },
        });
        if (!segments?.length) {
            await appendLog(job.id, 'No subtitle segments to burn', 'error');
            await setJobPatch(job.id, { status: 'FAILED', error: 'no subtitle segments' });
            throw new Error('no subtitle segments');
        }

        const fmt = (meta?.format || process.env.RENDER_FORMAT || 'mp4').toLowerCase(); // mp4 | webm
        const crf = Number(meta?.crf ?? process.env.RENDER_CRF ?? (fmt === 'mp4' ? 23 : 32));
        const preset = String(meta?.preset ?? process.env.RENDER_PRESET ?? 'medium');
        const lang = String(meta?.burnLang ?? process.env.RENDER_LANG ?? 'textSrc');

        await appendLog(job.id, `Render params -> format=${fmt}, crf=${crf}, preset=${preset}, lang=${lang}`);

        const srtFile = await writeTempSrt(segments, lang);
        await appendLog(job.id, `SRT prepared at: ${srtFile}`);

        const outFile = renderedPath(videoId, fmt);
        try { fs.unlinkSync(outFile); } catch { }
        const esc = (p) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

        await new Promise((resolve, reject) => {
            let prog = 3;

            const cmd = ffmpeg(video.original)
                .videoFilters(`subtitles='${esc(srtFile)}':force_style='Outline=1,BorderStyle=1,Fontsize=18'`)
                .on('start', (c) => {
                    appendLog(job.id, `ffmpeg start: ${c}`);
                })
                .on('stderr', (line) => {
                    if (typeof line === 'string' && line.trim()) {
                        appendLog(job.id, line, 'debug').catch(() => { });
                    }
                })
                .on('progress', async (info) => {
                    prog = clamp(prog + 1, 3, 95);
                    await setJobPatch(job.id, { progress: prog });
                })
                .on('error', async (err) => {
                    await appendLog(job.id, `ffmpeg error: ${err?.message || err}`, 'error');
                    await setJobPatch(job.id, { status: 'FAILED', error: String(err?.message || err) });
                    reject(err);
                })
                .on('end', async () => {
                    await setJobPatch(job.id, { progress: 98 });
                    await appendLog(job.id, 'ffmpeg finished');
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
            data: { metaJson: { ...(meta || {}), output: renderedPath(videoId, fmt) } },
        });

        await setJobPatch(job.id, {
            status: 'SUCCEEDED',
            progress: 100, error: null
        });
        await appendLog(job.id, 'RENDER succeeded', 'info');
    } catch (err) {
        console.error('RENDER failed:', err);
        await appendLog(job.id, `RENDER failed: ${err?.message || err}`, 'error');
        await setJobPatch(job.id, {
            status: 'FAILED',
            error: String(err?.message || err)
        });
        throw err;
    } finally {
        stop();
    }
}

const w = new Worker(
    'video-jobs',
    async (job) => {
        const { videoId, type, meta } = job.data || {};
        if (!videoId || !type) {
            await appendLog(job.id, 'invalid job payload', 'error');
            await setJobPatch(job.id, { status: 'FAILED', error: 'invalid job payload' });
            throw new Error('invalid job payload');
        }

        await appendLog(job.id, `Received job: ${type} for video ${videoId}`);

        if (type === 'TRANSCRIBE') {
            await handleTranscribe(job, videoId); return;
        }
        if (type === 'AUTOCUT') {
            await handleAutoCut(job, videoId); return;
        }
        if (type === 'TRANSLATE') {
            await handleTranslate(job, videoId); return;
        }
        if (type === 'RENDER') {
            await handleRender(job, videoId, meta); return;
        }

        await setJobPatch(job.id, { status: 'SUCCEEDED', progress: 100, error: null });
        await appendLog(job.id, `No-op job type: ${type} -> marked succeeded`);
    },
    { connection, concurrency: 2 }
);

w.on('completed', async (job) => {
    console.log('Completed', job.name, job.id);
    await appendLog(job.id, 'Worker event: completed');
});
w.on('failed', async (job, err) => {
    console.error('Failed', job?.name, job?.id, err);
    if (job?.id) await appendLog(job.id, `Worker event: failed -> ${err?.message || err}`, 'error');
});
w.on('error', (err) => {
    console.error('[Worker Redis Error]', err?.message || err);
});

export { w };
