export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

export function fmtSRT(ms = 0) {
    const t = Math.max(0, Math.floor(ms));
    const h = String(Math.floor(t / 3600000)).padStart(2, '0');
    const m = String(Math.floor((t % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const ms3 = String(t % 1000).padStart(3, '0');
    return `${h}:${m}:${s},${ms3}`;
}

export function fmtClock(ms = 0) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(t / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    return `${m}:${s}`;
}
