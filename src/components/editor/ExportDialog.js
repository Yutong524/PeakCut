'use client';
import { useState } from 'react';

export default function ExportDialog({ open, onClose, videoId }) {
    const [format, setFormat] = useState('srt');
    if (!open) return null;
    const href = videoId ? `/api/export/${format}?videoId=${videoId}` : '#';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[420px] rounded-xl border border-[#2a4729] bg-[#0c120c] shadow-[0_25px_90px_-40px_rgba(148,255,58,0.3)]">
                <div className="px-4 py-3 border-b border-[#2a4729] text-[#eaff89]">Export Subtitles</div>

                <div className="p-4 space-y-3">
                    <div className="text-sm text-[#bfe78a]">Choose a format:</div>
                    <div className="flex gap-3 text-sm text-[#d8ff70]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fmt" checked={format === 'srt'} onChange={() => setFormat('srt')} />
                            <span>SRT (Premiere, DaVinci)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fmt" checked={format === 'vtt'} onChange={() => setFormat('vtt')} />
                            <span>VTT (Web players)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fmt" checked={format === 'json'} onChange={() => setFormat('json')} />
                            <span>JSON (raw)</span>
                        </label>
                    </div>
                </div>

                <div className="px-4 py-3 flex items-center gap-2 border-t border-[#2a4729]">
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <a href={href} className="btn-accent">Export</a>
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
