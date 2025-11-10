'use client';
import { useEffect, useState } from 'react';

async function j(url, opt) {
    const res = await fetch(url, { cache: 'no-store', ...opt });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function OpenProjectDialog({ open, onClose, projectId }) {
    const [videos, setVideos] = useState([]);

    useEffect(() => {
        if (!open || !projectId) return;
        (async () => {
            try {
                const data = await j(`/api/projects/${projectId}`);
                setVideos(data.project?.videos || []);
            } catch (e) {
                console.error(e);
                setVideos([]);
            }
        })();
    }, [open, projectId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[720px] rounded-xl border border-[#2a4729] bg-[#0c120c] shadow-[0_25px_90px_-40px_rgba(148,255,58,0.3)]">
                <div className="px-4 py-3 border-b border-[#2a4729] text-[#eaff89]">Open Project</div>

                <div className="max-h-[60vh] overflow-y-auto p-4">
                    {videos.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 border-b border-[#223a22] text-[#d8ff70]">
                            <div className="space-y-1">
                                <div className="text-sm">Video: {v.id}</div>
                                <div className="text-[11px] text-[#92e86b]">Segments: {v._count?.segments ?? 0} · Jobs: {v._count?.jobs ?? 0}</div>
                                <div className="text-[11px] text-[#6dac57] break-all">{v.original}</div>
                            </div>
                            <div className="flex gap-2">
                                <a className="px-3 py-2 rounded-md border border-[#3f6f35] bg-[#111a11] text-[#e8ff82]" href={`/editor?videoId=${v.id}`}>Open Editor</a>
                                <a className="px-3 py-2 rounded-md border border-[#3f6f35] bg-[#111a11] text-[#e8ff82]" href={`/api/videos/${v.id}/download?format=mp4`}>Last Render</a>
                            </div>
                        </div>
                    ))}
                    {(!videos || !videos.length) && <div className="p-4 text-[#9bdc75] text-sm">No videos in this project.</div>}
                </div>

                <div className="px-4 py-3 border-t border-[#2a4729] flex justify-end">
                    <button onClick={onClose} className="px-3 py-2 rounded-md border border-[#2b442a] bg-[#0e150e] text-[#d9ff7a]">Close</button>
                </div>
            </div>
        </div>
    );
}
