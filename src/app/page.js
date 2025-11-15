'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppChrome from '@/components/layout/AppChrome';
import BatchExportDialog from '@/components/editor/BatchExportDialog';
import JobPanel from '@/components/jobs/JobPanel';

const IconUpload = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12 16V5.83l3.59 3.58L17 8l-5-5l-5 5l1.41 1.41L11 5.83V16zm-7 2h14v2H5v-2z"
    />
  </svg>
);

const IconPlay = (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M8 5v14l11-7z" />
  </svg>
);

const IconSpark = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...props}>
    <path fill="currentColor" d="M11 2h2l-1 7h5l-8 13l2-9H6z" />
  </svg>
);

const IconProject = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M4 5h6l2 2h8v12H4zM6 9v8h12V9z"
    />
  </svg>
);

const StatusDot = ({ tone = 'queued' }) => {
  const bg =
    tone === 'ok'
      ? 'background:var(--emerald-300);'
      : tone === 'fail'
        ? 'background:var(--rose-400);'
        : tone === 'running'
          ? 'background:var(--acid-300);'
          : 'background:var(--fg-1);';

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 9999,
        boxShadow: '0 0 10px rgba(158,240,26,.55)',
        ...cssToObj(bg),
      }}
    />
  );
};

const cssToObj = (str) =>
  Object.fromEntries(
    str
      .split(';')
      .filter(Boolean)
      .map((p) => p.split(':').map((s) => s.trim()))
      .map(([k, v]) => [camel(k), v])
  );

const camel = (s) =>
  s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const timerRef = useRef(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (e) {
      console.error('Failed to load jobs', e);
    }
  };

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 1200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        alert('Upload failed');
      } else {
        await refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
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

  const { totalJobs, totalVideos, activeJobs, failedJobs } = useMemo(() => {
    const totalJobs = jobs.length;
    const totalVideos = grouped.length;
    const activeJobs = jobs.filter(
      (j) => j.status === 'RUNNING' || j.status === 'QUEUED'
    ).length;
    const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
    return { totalJobs, totalVideos, activeJobs, failedJobs };
  }, [jobs, grouped]);

  return (
    <AppChrome active="dashboard">
      <main className="p-4 md:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        <section className="card card-strong glow p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="rounded-md p-2 glow"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(36,52,16,.9), rgba(20,32,14,.85))',
                  border: '1px solid rgba(158,240,26,.35)',
                }}
              >
                <IconSpark style={{ color: 'var(--lime-300)' }} />
              </div>
              <div>
                <h1
                  className="text-lg md:text-xl font-semibold tracking-tight"
                  style={{ color: 'var(--acid-300)' }}
                >
                  PEAKCUT Dashboard
                </h1>
                <p className="text-soft text-xs md:text-sm">
                  AI-powered cutting pipeline · bilingual subtitles · industrial-grade control.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Link
                href="/projects"
                className="btn"
                style={{ borderColor: 'rgba(158,240,26,.4)' }}
              >
                <IconProject style={{ color: 'var(--acid-300)' }} />
                <span>Projects workspace</span>
              </Link>
              <div className="hidden md:flex items-center gap-2 cmdbar">
                <span className="kbd">Ctrl</span>
                <span className="kbd">K</span>
                <span className="text-soft text-xs">Command Palette</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Videos tracked"
              value={totalVideos}
              hint="Grouped by video ID"
            />
            <StatCard
              label="Total jobs"
              value={totalJobs}
              hint="All pipeline tasks"
            />
            <StatCard
              label="Active jobs"
              value={activeJobs}
              tone="active"
              hint="Running or queued"
            />
            <StatCard
              label="Failed jobs"
              value={failedJobs}
              tone="danger"
              hint="Need attention"
            />
          </div>
        </section>

        <JobPanel />

        <section className="card p-4 md:p-5 space-y-4">
          <div className="flex items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-base md:text-lg">Upload a video</h2>
              <p className="text-soft text-xs md:text-sm">
                Files are stored locally in this MVP, with a clear path to S3 / R2 in the future.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="badge badge-queued">
                <span className="badge-dot" />
                Local MVP
              </span>
              <span className="badge">
                <span
                  className="badge-dot"
                  style={{ background: 'var(--acid-300)' }}
                />
                Secure local storage
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_auto_auto] items-stretch">
            <div className="rounded-lg input-file p-3 flex items-center justify-between gap-3">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-[var(--line)] file:bg-[rgba(26,34,22,.8)] file:px-3 file:py-2 file:text-[var(--fg-0)]"
              />
              <span className="text-soft text-xs truncate max-w-[40%]">
                {file?.name || 'No file selected'}
              </span>
            </div>

            <button
              onClick={onUpload}
              disabled={!file || uploading}
              className={`btn btn-primary justify-center ${!file || uploading ? 'btn-disabled' : ''
                }`}
              aria-disabled={!file || uploading}
              title="Start processing"
            >
              <span
                className="dot"
                style={{ width: 8, height: 8, borderRadius: 9999 }}
              />
              <IconUpload style={{ color: 'var(--acid-300)' }} />
              <span>{uploading ? 'Uploading…' : 'Start pipeline'}</span>
            </button>

            <button
              onClick={() => setBatchOpen(true)}
              className="btn justify-center border-[#345b2f]"
              style={{
                background:
                  'linear-gradient(180deg, #101810, #0b130c), radial-gradient(120% 100% at 0 0, rgba(158,240,26,.18), transparent)',
                color: '#caff6b',
              }}
            >
              Batch export…
            </button>
          </div>

          <div className="hr my-2" />

          <div className="grid sm:grid-cols-3 gap-3">
            <MiniMetricCard
              title="Throughput"
              value="Queue-driven"
              desc="BullMQ worker pipeline"
            />
            <MiniMetricCard
              title="Subtitles"
              value="Transcribe → Translate"
              desc="Source + bilingual tracks"
            />
            <MiniMetricCard
              title="Exports"
              value="9:16 · 1:1 · 16:9"
              desc="Shorts & long-form ready"
            />
          </div>
        </section>

        {/* Recent Jobs 区域 */}
        <section className="card card-strong p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
            <h2 className="font-medium">Recent Jobs</h2>
            <span className="text-soft text-xs">
              Jobs are grouped by video · click “Open editor” to fine-tune subtitles.
            </span>
          </div>

          {grouped.length === 0 ? (
            <div className="text-soft text-sm">No jobs yet. Upload a video to start.</div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([vid, arr]) => {
                const ordered = arr.slice().sort((a, b) =>
                  a.type.localeCompare(b.type)
                );

                return (
                  <div
                    key={vid}
                    className="rounded-xl border border-[var(--line)] p-3 md:p-4 glow"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-soft">
                        Video ID:{' '}
                        <span className="text-[var(--acid-300)] break-all">
                          {vid}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/projects"
                          className="btn"
                          style={{ borderColor: '#345b2f' }}
                        >
                          <IconProject style={{ color: 'var(--acid-300)' }} />
                          Projects
                        </Link>
                        <Link
                          href={`/editor?videoId=${vid}`}
                          className="btn"
                          style={{ borderColor: 'rgba(240,255,59,.35)' }}
                        >
                          <IconPlay style={{ color: 'var(--acid-300)' }} />{' '}
                          Open subtitle editor
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {ordered.map((j) => {
                        const tone =
                          j.status === 'SUCCEEDED'
                            ? 'ok'
                            : j.status === 'FAILED'
                              ? 'fail'
                              : j.status === 'RUNNING'
                                ? 'running'
                                : 'queued';

                        return (
                          <div key={j.id} className="card p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm">{j.type}</div>
                              <span
                                className={`badge ${j.status === 'SUCCEEDED'
                                    ? 'badge-ok'
                                    : j.status === 'FAILED'
                                      ? 'badge-fail'
                                      : j.status === 'RUNNING'
                                        ? 'badge-warn'
                                        : 'badge-queued'
                                  }`}
                              >
                                <StatusDot tone={tone} /> {j.status}
                              </span>
                            </div>

                            <div className="progress mt-1">
                              <div
                                className="progress-bar"
                                style={{ width: `${j.progress}%` }}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={j.progress}
                              />
                            </div>

                            <div className="text-[10px] text-soft mt-1">
                              Job: {j.id}
                            </div>

                            {j.type === 'RENDER' && j.status === 'SUCCEEDED' && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <a
                                  className="btn"
                                  href={`/api/videos/${j.videoId}/download?format=mp4`}
                                  title="Download rendered MP4"
                                >
                                  Download MP4
                                </a>
                                <a
                                  className="btn"
                                  href={`/api/videos/${j.videoId}/download?format=webm`}
                                  title="Download rendered WEBM"
                                >
                                  Download WEBM
                                </a>
                              </div>
                            )}
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
    </AppChrome>
  );
}

function StatCard({ label, value, hint, tone }) {
  let accentBorder = 'rgba(158,240,26,.35)';
  let accentText = 'var(--fg-0)';

  if (tone === 'active') {
    accentBorder = 'rgba(240,255,59,.45)';
    accentText = 'var(--acid-300)';
  }
  if (tone === 'danger') {
    accentBorder = 'rgba(255,84,120,.6)';
    accentText = 'var(--rose-400)';
  }

  return (
    <div
      className="card p-3 flex flex-col gap-1"
      style={{ borderColor: accentBorder }}
    >
      <div className="text-soft text-[11px] uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-semibold" style={{ color: accentText }}>
        {value}
      </div>
      {hint && (
        <div className="text-soft text-[11px] leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}

function MiniMetricCard({ title, value, desc }) {
  return (
    <div className="card p-3 flex flex-col gap-1">
      <div className="text-soft text-xs">{title}</div>
      <div className="mt-1 text-base" style={{ color: 'var(--acid-300)' }}>
        {value}
      </div>
      {desc && (
        <div className="text-soft text-[11px] leading-snug">{desc}</div>
      )}
    </div>
  );
}
