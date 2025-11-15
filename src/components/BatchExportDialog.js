'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';

async function getJSON(url) {
    const res = await fetch(url, {
        cache: 'no-store'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function BatchExportDialog({ open, onClose }) {
    const [videos, setVideos] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [fmt, setFmt] = useState('srt');

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const r = await getJSON('/api/videos/list');
                setVideos(r.videos || []);
            } catch (e) { console.error(e); }
        })();
    }, [open]);

    function toggle(id) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    async function submit() {
        if (selected.size === 0) return alert('No videos selected');
        try {
            const ids = Array.from(selected);
            const url = `/api/export/zip?format=${fmt}&ids=${encodeURIComponent(JSON.stringify(ids))}`;
            window.location.href = url;
            onClose?.();
        } catch (e) {
            alert('Batch export failed: ' + e.message);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Batch Export"
            footer={
                <>
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={submit}>Export</button>
                </>
            }
        >
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--fg-1)]">Format</label>
                    <select className="select"
                        value={fmt}
                        onChange={e => setFmt(e.target.value)}
                    >
                        <option value="srt">SRT</option>
                        <option value="vtt">VTT</option>
                        <option value="json">JSON</option>
                    </select>
                </div>
                <div className="border rounded p-2"
                    style={{ borderColor: 'var(--line)' }}
                >
                    <div className="text-xs text-[var(--fg-1)] mb-2">Select Videos</div>
                    <div className="max-h-[280px] overflow-auto space-y-1">
                        {videos.length === 0 ? (
                            <div className="text-xs text-[var(--fg-2)]">No videos.</div>
                        ) : videos.map(v => (
                            <label key={v.id} className="flex items-center gap-2 p-2 rounded hover:bg-[rgba(174,254,42,.05)]">
                                <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                                <span className="text-sm">{v.id}</span>
                                <span className="ml-auto text-xs text-[var(--fg-2)]">
                                    {(v.durationMs / 1000 | 0)}
                                    s
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
