'use client';
import { useState } from 'react';

export default function RenderDialog({ open, onClose, videoId }) {
    const [format, setFormat] = useState('mp4');
    const [crf, setCrf] = useState(23);
    const [preset, setPreset] = useState('medium');
    const [burnLang, setBurnLang] = useState('textSrc');
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const submit = async () => {
        if (!videoId) return;
        setLoading(true);
        try {
            const res = await fetch('/api/render/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, format, crf, preset, burnLang }),
            });
            if (!res.ok) throw new Error(await res.text());
            onClose(true);
        } catch (e) {
            console.error(e);
            alert('Start render failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[440px] rounded-xl border border-[#2a4729] bg-[#0c120c] shadow-[0_25px_90px_-40px_rgba(148,255,58,0.3)]">
                <div className="px-4 py-3 border-b border-[#2a4729] text-[#eaff89]">Render Video</div>

                <div className="p-4 space-y-3 text-sm text-[#d8ff70]">
                    <div className="flex items-center justify-between">
                        <label>Format</label>
                        <select value={format} onChange={e => {
                            const f = e.target.value; setFormat(f);
                            if (f === 'webm') setCrf(32);
                        }} className="select">
                            <option value="mp4">MP4 (H.264)</option>
                            <option value="webm">WEBM (VP9)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label>CRF</label>
                        <input type="number" value={crf} min={12} max={40}
                            onChange={e => setCrf(Number(e.target.value))}
                            className="input" />
                    </div>

                    <div className="flex items-center justify-between">
                        <label>Preset</label>
                        <select value={preset} onChange={e => setPreset(e.target.value)} className="select">
                            <option>ultrafast</option><option>superfast</option><option>veryfast</option>
                            <option>faster</option><option>fast</option><option>medium</option>
                            <option>slow</option><option>slower</option><option>veryslow</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <label>Burn Field</label>
                        <select value={burnLang} onChange={e => setBurnLang(e.target.value)} className="select">
                            <option value="textSrc">Original</option>
                            <option value="textEn">English</option>
                            <option value="textZh">Chinese</option>
                        </select>
                    </div>

                    <p className="text-xs text-[#9bdc75]">
                        Tip: Lower CRF → higher quality & larger file. Preset affects speed only.
                    </p>
                </div>

                <div className="px-4 py-3 flex items-center gap-2 border-t border-[#2a4729]">
                    <button onClick={() => onClose(false)} className="btn-ghost">Cancel</button>
                    <button onClick={submit} disabled={loading} className="btn-accent">
                        {loading ? 'Submitting…' : 'Start Render'}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .input { width: 160px; padding: 6px 8px; border-radius: 8px; background:#0e150e; border:1px solid #2b442a; color:#d9ff7a; }
        .select { width: 180px; padding: 6px 8px; border-radius: 8px; background:#0e150e; border:1px solid #2b442a; color:#d9ff7a; }
        .btn-ghost { padding: 8px 12px; border-radius: 8px; background:#0e150e; color:#d9ff7a; border:1px solid #2b442a; }
        .btn-ghost:hover { background:#131e12; }
        .btn-accent { padding:8px 12px; border-radius:8px; background:linear-gradient(180deg,#172417,#0e150f); color:#e8ff82; border:1px solid #3f6f35; }
        .btn-accent:hover { background:linear-gradient(180deg,#1a2b19,#111a11); }
      `}</style>
        </div>
    );
}
