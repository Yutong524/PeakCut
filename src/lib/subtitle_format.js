export function toSrtTime(ms = 0) {
    const t = Math.max(0, Math.floor(ms));
    const h = String(Math.floor(t / 3600000)).padStart(2, '0');
    const m = String(Math.floor((t % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const ms3 = String(t % 1000).padStart(3, '0');
    return `${h}:${m}:${s},${ms3}`;
}

export function toVttTime(ms = 0) {
    const t = Math.max(0, Math.floor(ms));
    const h = String(Math.floor(t / 3600000)).padStart(2, '0');
    const m = String(Math.floor((t % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const ms3 = String(t % 1000).padStart(3, '0');

    return `${h}:${m}:${s}.${ms3}`;
}

export function buildSRT(segments = []) {
    const lines = [];
    segments.forEach((s, i) => {
        const start = toSrtTime(s.startMs ?? 0);
        const end = toSrtTime((s.endMs && s.endMs >= s.startMs) ? s.endMs : (s.startMs + 1500));
        const text = (s.textEn || s.textZh || s.textSrc || '').trim() || '…';
        lines.push(String(i + 1));
        lines.push(`${start} --> ${end}`);
        lines.push(text);
        lines.push('');
    });
    return lines.join('\r\n');
}

export function buildVTT(segments = []) {
    const lines = ['WEBVTT', ''];
    segments.forEach((s, i) => {
        const start = toVttTime(s.startMs ?? 0);
        const end = toVttTime((s.endMs && s.endMs >= s.startMs) ? s.endMs : (s.startMs + 1500));
        const text = (s.textEn || s.textZh || s.textSrc || '').trim() || '…';
        lines.push(String(i + 1));
        lines.push(`${start} --> ${end}`);
        lines.push(text);
        lines.push('');
    });
    return lines.join('\n');
}
