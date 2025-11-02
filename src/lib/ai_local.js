import { pipeline } from '@xenova/transformers';
import { execa } from 'execa';
import ffmpeg from 'ffmpeg-static';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import wav from 'node-wav';

const MODEL_ID = process.env.WHISPER_MODEL_ID || 'Xenova/whisper-small';

let _asr = null;
async function getASR() {
    if (_asr) return _asr;
    _asr = await pipeline('automatic-speech-recognition', MODEL_ID, {
    });
    return _asr;
}

async function toWav16kBuffer(inputPath) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peakcut-'));
    const out = path.join(tmp, `audio_${Date.now()}.wav`);
    await execa(ffmpeg, ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', out]);
    const buf = fs.readFileSync(out);
    try { fs.unlinkSync(out); fs.rmdirSync(tmp); } catch { }
    return buf;
}

function decodeWavToFloat32(buf) {
    const decoded = wav.decode(buf);
    const ch0 = decoded.channelData[0];
    return { sampleRate: decoded.sampleRate, pcm: ch0 };
}


export async function transcribeLocal(filePath) {
    const asr = await getASR();

    const wavBuf = await toWav16kBuffer(filePath);

    const { pcm, sampleRate } = decodeWavToFloat32(wavBuf);

    const result = await asr(pcm, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
    });

    const segments = (result.segments || []).map(s => ({
        start: s.start,
        end: s.end,
        text: (s.text || '').trim(),
    }));

    return {
        text: (result.text || '').trim(),
        segments
    };
}
