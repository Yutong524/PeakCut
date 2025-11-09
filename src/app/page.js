'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BatchExportDialog from '@/components/editor/BatchExportDialog';

const IconUpload = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M12 16V5.83l3.59 3.58L17 8l-5-5l-5 5l1.41 1.41L11 5.83V16zm-7 2h14v2H5v-2z" />
  </svg>
);
const IconPlay = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
);
const IconSpark = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
    <path fill="currentColor" d="M11 2h2l-1 7h5l-8 13l2-9H6z" />
  </svg>
);
const StatusDot = ({ tone = 'queued' }) => {
  const bg =
    tone === 'ok' ? 'background:var(--emerald-300);'
      : tone === 'fail' ? 'background:var(--rose-400);'
        : tone === 'running' ? 'background:var(--acid-300);'
          : 'background:var(--fg-1);';
  return <span style={{ width: 8, height: 8, borderRadius: 9999, boxShadow: '0 0 10px rgba(158,240,26,.55)', ...cssToObj(bg) }} />;
};
const cssToObj = (str) => Object.fromEntries(str.split(';').filter(Boolean).map(p => p.split(':').map(s => s.trim())).map(([k, v]) => [camel(k), v]));
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const timerRef = useRef(null);
  const [batchOpen, setBatchOpen] = useState(false);

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
    <main className="p-4 md:p-6 lg:p-8 space-y-8">
      <header className="card card-strong glow p-4 md:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md p-2 glow" style={{ background: 'linear-gradient(180deg, rgba(36,52,16,.9), rgba(20,32,14,.85))', border: '1px solid rgba(158,240,26,.35)' }}>
            <IconSpark style={{ color: 'var(--lime-300)' }} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight" style={{ color: 'var(--acid-300)' }}>
              PEAKCUT
            </h1>
            <p className="text-soft text-xs">
              AI-powered cuts • bilingual subs
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 cmdbar">
          <span className="kbd">Ctrl</span>
          <span className="kbd">K</span>
          <span className="text-soft text-xs">Command Palette</span>
        </div>
      </header>

      <section className="card p-4 md:p-5 space-y-4">
        <div className="flex items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="font-medium text-base md:text-lg">Upload a video</h2>
            <p className="text-soft text-xs md:text-sm">Local-only storage in MVP, switchable to S3/R2 later.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="badge badge-queued"><span className="badge-dot" />MVP</span>
            <span className="badge"><span className="badge-dot" style={{ background: 'var(--acid-300)' }} />Secure Local</span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <div className="rounded-lg input-file p-3 flex items-center justify-between">
            <input
              type="file"
              accept="video/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-[var(--line)] file:bg-[rgba(26,34,22,.8)] file:px-3 file:py-2 file:text-[var(--fg-0)]"
            />
            <span className="text-soft text-xs">{file?.name || 'No file selected'}</span>
          </div>

          <button
            onClick={onUpload}
            disabled={!file || uploading}
            className={`btn btn-primary ${(!file || uploading) ? 'btn-disabled' : ''}`}
            aria-disabled={!file || uploading}
            title="Start processing"
          >
            <button onClick={() => setBatchOpen(true)}
              className="px-3 py-2 rounded-md border border-[#345b2f] bg-[#101810] hover:bg-[#132013] text-[#caff6b] text-sm">
              Batch Export…
            </button>

            <span className="dot" style={{ width: 8, height: 8, borderRadius: 9999 }} />
            <IconUpload style={{ color: 'var(--acid-300)' }} />
            {uploading ? 'Uploading…' : 'Start'}
          </button>
        </div>

        <div className="hr my-2" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="card p-3">
            <div className="text-soft text-xs">Throughput</div>
            <div className="mt-1 text-base">Queue-driven</div>
          </div>
          <div className="card p-3">
            <div className="text-soft text-xs">Accuracy</div>
            <div className="mt-1 text-base">Transcribe → Translate</div>
          </div>
          <div className="card p-3">
            <div className="text-soft text-xs">Exports</div>
            <div className="mt-1 text-base">9:16 / 1:1 / 16:9</div>
          </div>
        </div>
      </section>

      <section className="card card-strong p-4 md:p-5">
        <h2 className="font-medium mb-3 md:mb-4">Recent Jobs</h2>

        {grouped.length === 0 ? (
          <div className="text-soft text-sm">No jobs yet.</div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([vid, arr]) => {
              const ordered = arr.slice().sort((a, b) => a.type.localeCompare(b.type));
              return (
                <div key={vid} className="rounded-xl border border-[var(--line)] p-3 md:p-4 glow">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-soft">
                      Video ID: <span className="text-[var(--acid-300)]">{vid}</span>
                    </div>
                    <a
                      href={`/editor?videoId=${vid}`}
                      className="btn"
                      style={{ borderColor: 'rgba(240,255,59,.35)' }}
                    >
                      <IconPlay style={{ color: 'var(--acid-300)' }} /> Open subtitle editor
                    </a>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ordered.map(j => {
                      const tone =
                        j.status === 'SUCCEEDED' ? 'ok' :
                          j.status === 'FAILED' ? 'fail' :
                            j.status === 'RUNNING' ? 'running' : 'queued';

                      return (
                        <div key={j.id} className="card p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">{j.type}</div>
                            <span className={`badge ${j.status === 'SUCCEEDED' ? 'badge-ok'
                              : j.status === 'FAILED' ? 'badge-fail'
                                : j.status === 'RUNNING' ? 'badge-warn'
                                  : 'badge-queued'
                              }`}>
                              <StatusDot tone={tone} /> {j.status}
                            </span>
                          </div>

                          <div className="progress mt-2">
                            <div
                              className="progress-bar"
                              style={{ width: `${j.progress}%` }}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={j.progress}
                            />
                          </div>

                          <div className="text-[10px] text-soft mt-2">
                            Job: {j.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>   
        )}
      </section>
      <BatchExportDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
    </main>
  );
}
