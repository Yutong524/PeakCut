'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import EditorShell from '@/components/editor/EditorShell';
import Player from '@/components/editor/Player';
import Timeline from '@/components/editor/Timeline';
import SegmentsList from '@/components/editor/SegmentsList';
import Toolbar from '@/components/editor/Toolbar';
import HotkeysOverlay from '@/components/editor/HotkeysOverlay';
import { clamp } from '@/lib/time';
import { toast } from '@/components/editor/toast';
import ExportDialog from '@/components/editor/ExportDialog';
import RenderDialog from '@/components/editor/RenderDialog';

async function fetchJSON(url, opt) {
    const res = await fetch(url, { cache: 'no-store', ...opt });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function EditorPage() {
    const sp = useSearchParams();
    const videoId = sp.get('videoId');

    const [segments, setSegments] = useState([]);
    const [active, setActive] = useState(null);
    const [currentMs, setCurrentMs] = useState(0);
    const [duration, setDuration] = useState(0);
    const [exportOpen, setExportOpen] = useState(false);
    const [renderOpen, setRenderOpen] = useState(false);

    useEffect(() => {
        (async () => {
            if (!videoId) return;
            try {
                const data = await fetchJSON(`/api/editor/segments?videoId=${videoId}`);
                setSegments(data.segments || []);
            } catch {
                const data = await fetchJSON(`/api/editor/subs?videoId=${videoId}`);
                setSegments(data.segments || []);
            }
        })();
    }, [videoId]);

    const saveOne = useCallback(async (id, patch) => {
        const prev = segments;
        const idx = prev.findIndex(s => s.id === id);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        setSegments(next);

        try {
            await fetchJSON(`/api/editor/segments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            toast('Saved');
        } catch (e) {
            console.error(e);
            setSegments(prev);
            toast('Save failed');
        }
    }, [segments]);

    const deleteOne = useCallback(async (id) => {
        const prev = segments;
        const next = prev.filter(s => s.id !== id);
        setSegments(next);
        try {
            await fetchJSON(`/api/editor/segments/${id}`, { method: 'DELETE' });
            toast('Deleted');
        } catch (e) {
            console.error(e);
            setSegments(prev);
            toast('Delete failed');
        }
    }, [segments]);

    const addAtPlayhead = useCallback(async () => {
        if (!videoId) return;
        const start = Math.floor(currentMs);
        const end = Math.min(start + 1500, duration || (start + 1500));
        const body = { videoId, startMs: start, endMs: end, textSrc: '' };
        try {
            const data = await fetchJSON(`/api/editor/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setSegments(s => [...s, data.segment]);
            setActive(data.segment.id);
            toast('Segment added');
        } catch (e) {
            console.error(e);
            toast('Add failed');
        }
    }, [videoId, currentMs, duration]);

    const splitRow = useCallback(async (id, ms) => {
        const s = segments.find(x => x.id === id); if (!s) return;
        const splitAt = clamp(ms, s.startMs + 50, s.endMs - 50);
        try {
            await saveOne(id, { endMs: splitAt });
            const body = { videoId: s.videoId, startMs: splitAt, endMs: s.endMs, textSrc: s.textSrc };
            const data = await fetchJSON(`/api/editor/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setSegments(list => {
                const next = list.map(x => x.id === id ? { ...x, endMs: splitAt } : x);
                return [...next, data.segment];
            });
            setActive(data.segment.id);
            toast('Split success');
        } catch (e) {
            console.error(e);
            toast('Split failed');
        }
    }, [segments, saveOne]);

    const mergeRow = useCallback(async (id) => {
        const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
        const aIdx = sorted.findIndex(x => x.id === id);
        if (aIdx < 0 || aIdx === sorted.length - 1) return;
        const A = sorted[aIdx], B = sorted[aIdx + 1];

        try {
            await saveOne(A.id, {
                endMs: Math.max(A.endMs, B.endMs),
                textSrc: (A.textSrc || '') + ' ' + (B.textSrc || '')
            });
            await deleteOne(B.id);
            setActive(A.id);
            toast('Merge success');
        } catch (e) {
            console.error(e);
            toast('Merge failed');
        }
    }, [segments, saveOne, deleteOne]);

    const saveAll = useCallback(async () => {
        try {
            await Promise.all(segments.map(s => fetch(`/api/editor/segments/${s.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startMs: s.startMs,
                    endMs: s.endMs,
                    textSrc: s.textSrc
                })
            })));
            toast('All saved');
        } catch (e) {
            console.error(e);
            toast('Some failed');
        }
    }, [segments]);

    const keyRef = useRef({ prevent: false });
    useEffect(() => {
        const onKey = (e) => {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveAll();
                return;
            }

            if (typing) return;

            if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentMs(ms => Math.max(0, ms - 100)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentMs(ms => ms + 100); }
            if (e.key.toLowerCase() === 's' && active) {
                const s = segments.find(x => x.id === active); if (!s) return;
                const cut = clamp(currentMs, s.startMs + 50, s.endMs - 50);
                splitRow(active, cut);
            }

            if (e.key.toLowerCase() === 'm' && active) mergeRow(active);

            if (e.key.toLowerCase() === 'n') addAtPlayhead();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [segments, currentMs, active, splitRow, mergeRow, addAtPlayhead, saveAll]);

    const srtHref = useMemo(() => videoId ? `/api/editor/export.srt?videoId=${videoId}` : null, [videoId]);

    return (
        <div className="p-4">
            <div className="px-4 py-3 border-b border-[#2a4729] bg-gradient-to-r from-[#0c120c] via-[#0b100c] to-[#0d120b] rounded-t-xl">
                <div className="flex items-center gap-2">
                    <button className="btn-primary" onClick={addAtPlayhead}>+ Add at Playhead</button>
                    <button className="btn-ghost" onClick={saveAll}>Save All</button>
                    <button className="btn-accent" onClick={() => setExportOpen(true)}>Export…</button>
                    <button className="btn-accent" onClick={() => setRenderOpen(true)}>Render…</button>
                    <div className="ml-auto text-xs text-[#8fe86c]">Tips: Space Play/Pause · S Split · M Merge · ←/→ ±0.1s · Ctrl+S Save</div>
                </div>
            </div>
            <Toolbar onAddAtPlayhead={addAtPlayhead} onSaveAll={saveAll} srtHref={srtHref} />
            <EditorShell
                children={
                    <>
                        <Player
                            videoId={videoId}
                            currentMs={currentMs}
                            onTimeChange={setCurrentMs}
                            onDuration={setDuration}
                        />
                        <Timeline
                            duration={duration}
                            currentMs={currentMs}
                            segments={segments}
                            onSeek={(ms) => setCurrentMs(ms)}
                        />
                    </>
                }
                right={
                    <SegmentsList
                        segments={segments}
                        activeId={active}
                        onFocusRow={(s) => { setActive(s.id); setCurrentMs(s.startMs); }}
                        onChangeRow={(id, patch) => saveOne(id, patch)}
                        onDeleteRow={(id) => deleteOne(id)}
                        onSplitRow={(id, ms) => splitRow(id, ms)}
                        onMergeRow={(id) => mergeRow(id)}
                        onSeek={(ms) => setCurrentMs(ms)}
                    />
                }
            />
            <HotkeysOverlay />

            <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} videoId={videoId} />
            <RenderDialog open={renderOpen} onClose={(submitted) => {
                setRenderOpen(false);
                if (submitted) alert('Render job started. Check Recent Jobs for progress.');
            }} videoId={videoId} />
        </div>
    );
}
