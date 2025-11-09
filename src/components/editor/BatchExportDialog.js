'use client';
import { useEffect, useState } from 'react';

export default function BatchExportDialog({ open, onClose }) {
    const [loading, setLoading] = useState(false);
    const [videos, setVideos] = useState([]);
    const [picked, setPicked] = useState(new Set());
    const [format, setFormat] = useState('srt');

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const res = await fetch('/api/videos', { cache: 'no-store' });
                const data = await res.json();
                setVideos(data.videos || []);
            } catch (e) {
                console.error(e);
                setVideos([]);
            }
        })();
    }, [open]);

    const toggle = (id) => {
        const next = new Set(picked);
        if (next.has(id)) next.delete(id); else next.add(id);
        setPicked(next);
    };

    const exportZip = async () => {
        if (!picked.size) return;
        setLoading(true);
        try {
            const res = await fetch('/api/export/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoIds: Array.from(picked),
                    format
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `subtitles_batch_${Date.now()}.zip`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Export failed');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[640px] rounded-xl border border-[#2a4729] bg-[#0c120c] shadow-[0_25px_90px_-40px_rgba(148,255,58,0.3)]">
                <div className="px-4 py-3 border-b border-[#2a4729] text-[#eaff89]">Batch Export Subtitles</div>

                <div className="p-4 space-y-3">
                    <div className="text-sm text-[#bfe78a]">Choose format:</div>
                    <div className="flex gap-3 text-sm text-[#d8ff70]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio"
                                name="fmt2"
                                checked={format === 'srt'}
                                onChange={() => setFormat('srt')} />
                            <span>SRT</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio"
                                name="fmt2"
                                checked={format === 'vtt'}
                                onChange={() => setFormat('vtt')} />
                            <span>VTT</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio"
                                name="fmt2"
                                checked={format === 'json'}
                                onChange={() => setFormat('json')} />
                            <span>JSON</span>
                        </label>
                    </div>

                    <div className="text-sm text-[#bfe78a]">Pick videos:</div>
                    <div className="max-h-[50vh] overflow-y-auto rounded border border-[#274427]">
                        {videos.map(v => (
                            <label key={v.id}
                                className="flex items-center gap-3 p-2 border-b border-[#223a22] text-[#d8ff70] cursor-pointer hover:bg-[#0f160f]">
                                <input type="checkbox" checked={picked.has(v.id)} onChange={() => toggle(v.id)} />
                                <div className="flex-1">
                                    <div className="text-sm">Video: {v.id}</div>
                                    <div className="text-[11px] text-[#92e86b]">Segments: {v._count?.segments ?? 0} · Jobs: {v._count?.jobs ?? 0}</div>
                                    <div className="text-[11px] text-[#6dac57] break-all">{v.original}</div>
                                </div>
                            </label>
                        ))}
                        {(!videos || !videos.length) && <div className="p-4 text-[#8bbf6a] text-sm">No videos.</div>}
                    </div>
                </div>

                <div className="px-4 py-3 flex items-center gap-2 border-t border-[#2a4729]">
                    <button onClick={onClose}
                        className="btn-ghost">Cancel</button>
                    <button onClick={exportZip}
                        disabled={!picked.size || loading}
                        className="btn-accent">
                        {loading ? 'Exporting…' : `Export ${picked.size} file(s)`}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .btn-ghost {
          padding: 8px 12px; border-radius: 8px;
          background: #0e150e; color: #d9ff7a; border: 1px solid #2b442a;
        }
        .btn-ghost:hover { background: #131e12; }
        .btn-accent {
          padding: 8px 12px; border-radius: 8px;
          background: linear-gradient(180deg,#172417,#0e150f);
          color: #e8ff82; border: 1px solid #3f6f35;
        }
        .btn-accent:hover { background: linear-gradient(180deg,#1a2b19,#111a11); }
      `}</style>
        </div>
    );
}
