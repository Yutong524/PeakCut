import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function toSrtTime(ms = 0) {
    const t = Math.max(0, Math.floor(ms));
    const h = String(Math.floor(t / 3600000)).padStart(2, '0');
    const m = String(Math.floor((t % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const ms3 = String(t % 1000).padStart(3, '0');
    return `${h}:${m}:${s},${ms3}`;
}

export function buildSRTFromSegments(segments = [], lang = 'textSrc') {
    const pick = (s) => {
        if (lang === 'textEn')
            return s.textEn || s.textSrc || '';
        if (lang === 'textZh')
            return s.textZh || s.textSrc || '';
        return s.textSrc || s.textEn || s.textZh || '';
    };
    const lines = [];
    segments.forEach((s, i) => {
        const start = toSrtTime(s.startMs ?? 0);
        const end = toSrtTime((s.endMs && s.endMs >= s.startMs) ? s.endMs : (s.startMs + 1500));
        const text = (pick(s) || '…').toString().replace(/\r?\n/g, ' ');
        lines.push(String(i + 1));
        lines.push(`${start} --> ${end}`);
        lines.push(text);
        lines.push('');
    });
    return lines.join('\r\n');
}

export async function writeTempSrt(segments, lang = 'textSrc') {
    const content = buildSRTFromSegments(segments, lang);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'peakcut-'));
    const file = path.join(tmpDir, 'burn.srt');
    await fs.writeFile(file, content, 'utf8');
    return file;
}
