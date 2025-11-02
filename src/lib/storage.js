import fs from 'node:fs';
import path from 'node:path';

const base = process.env.STORAGE_DIR || './storage';

export function ensureStorage() {
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    const videos = path.join(base, 'videos');
    if (!fs.existsSync(videos)) fs.mkdirSync(videos, { recursive: true });
    return { base, videos };
}

export function localVideoPath(filename) {
    const { videos } = ensureStorage();
    return path.join(videos, filename);
}
