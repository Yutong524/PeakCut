'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditorPage() {
    const sp = useSearchParams();
    const videoId = sp.get('videoId');
    const [segs, setSegs] = useState([]);

    useEffect(() => {
        (async () => {
            if (!videoId) return;
            const res = await fetch(`/api/editor/subs?videoId=${videoId}`);
            if (res.ok) setSegs((await res.json()).segments);
        })();
    }, [videoId]);

    return (
        <div className="space-y-4 p-4">
            <h2 className="font-medium">Subtitle Editor (placeholder)</h2>
            <p className="text-sm text-zinc-400">Video: {videoId}</p>
            <div className="space-y-2">
                {segs.map(s => (
                    <div key={s.id} className="border border-zinc-800 rounded p-2">
                        <div className="text-[11px] text-zinc-500">{s.startMs} → {s.endMs} ms</div>
                        <div className="text-sm">Src: {s.textSrc}</div>
                        <div className="text-sm">EN : {s.textEn}</div>
                        <div className="text-sm">ZH : {s.textZh}</div>
                    </div>
                ))}
                {segs.length === 0 && <div className="text-sm text-zinc-500">No segments yet.</div>}
            </div>
        </div>
    );
}
