import fs from 'node:fs';
import path from 'node:path';

const base = process.env.STORAGE_DIR || './storage';

export function ensureStorage() {
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    const videos = path.join(base, 'videos');
    const renders = path.join(base, 'renders');
    if (!fs.existsSync(videos)) fs.mkdirSync(videos, { recursive: true });
    if (!fs.existsSync(renders)) fs.mkdirSync(renders, { recursive: true });
    return { base, videos, renders };
}

export function localVideoPath(filename) {
    const { videos } = ensureStorage();
    return path.join(videos, filename);
}

export function renderedPath(videoId, fmt = 'mp4') {
    const { renders } = ensureStorage();
    return path.join(renders, `${videoId}.${fmt}`);
}
