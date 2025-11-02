'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const timerRef = useRef(null);

  const refresh = async () => {
    const res = await fetch('/api/jobs', { cache: 'no-store' });
    const data = await res.json();
    setJobs(data.jobs ?? []);
  };

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 1200);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    setUploading(false);
    if (!res.ok) alert('Upload failed');
    else refresh();
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const j of jobs) {
      const arr = map.get(j.videoId) ?? [];
      arr.push(j);
      map.set(j.videoId, arr);
    }
    return Array.from(map.entries());
  }, [jobs]);

  return (
    <main className="space-y-6 p-4">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="font-medium mb-3">Upload a video</h2>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="video/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200"
          />
          <button
            onClick={onUpload}
            disabled={!file || uploading}
            className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Start'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          MVP stores files locally (switch to S3/R2 later).
        </p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="font-medium mb-3">Recent Jobs</h2>
        <div className="space-y-4">
          {grouped.map(([vid, arr]) => (
            <div key={vid} className="rounded-md border border-zinc-800 p-3">
              <div className="text-xs text-zinc-400 mb-2">Video: {vid}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {arr.sort((a, b) => a.type.localeCompare(b.type)).map(j => (
                  <div key={j.id} className="rounded border border-zinc-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{j.type}</div>
                      <span className={`text-xs ${j.status === 'SUCCEEDED' ? 'text-emerald-400'
                          : j.status === 'FAILED' ? 'text-red-400'
                            : 'text-zinc-400'
                        }`}>
                        {j.status}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded mt-2 overflow-hidden">
                      <div className="h-full bg-zinc-200" style={{ width: `${j.progress}%` }} />
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Job: {j.id}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <a href={`/editor?videoId=${vid}`} className="text-xs underline text-zinc-300">
                  Open subtitle editor (placeholder)
                </a>
              </div>
            </div>
          ))}
          {grouped.length === 0 && <div className="text-sm text-zinc-500">No jobs yet.</div>}
        </div>
      </section>
    </main>
  );
}
