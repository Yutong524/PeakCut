'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

function statusBadgeClass(status) {
    if (status === 'SUCCEEDED') return 'badge badge-ok';
    if (status === 'FAILED') return 'badge badge-fail';
    if (status === 'RUNNING') return 'badge badge-warn';
    return 'badge badge-queued';
}

function statusTone(status) {
    if (status === 'SUCCEEDED') return 'ok';
    if (status === 'FAILED') return 'fail';
    if (status === 'RUNNING') return 'running';
    return 'queued';
}

function StatusDot({ tone = 'queued' }) {
    const base = 'w-2 h-2 rounded-full inline-block';
    const style =
        tone === 'ok'
            ? 'background:var(--emerald-300); box-shadow:0 0 10px rgba(98,242,160,.6);'
            : tone === 'fail'
                ? 'background:var(--rose-400); box-shadow:0 0 10px rgba(255,84,120,.6);'
                : tone === 'running'
                    ? 'background:var(--acid-300); box-shadow:0 0 10px rgba(247,255,118,.6);'
                    : 'background:var(--fg-1); box-shadow:0 0 6px rgba(183,194,183,.35);';

    return <span className={base} style={cssToObj(style)} />;
}

const cssToObj = (str) =>
    Object.fromEntries(
        str
            .split(';')
            .filter(Boolean)
            .map((p) => p.split(':').map((s) => s.trim()))
            .map(([k, v]) => [camel(k), v])
    );

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const STATUS_OPTIONS = ['ALL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'QUEUED'];
const TYPE_OPTIONS = ['ALL', 'TRANSCRIBE', 'AUTOCUT', 'TRANSLATE', 'RENDER'];

export default function JobPanel() {
    const [jobs, setJobs] = useState([]);
    const [openLog, setOpenLog] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [connectionMode, setConnectionMode] = useState('live');

    const esRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const startPolling = () => {
            if (pollRef.current) return;
            setConnectionMode('poll');
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch('/api/jobs', { cache: 'no-store' });
                    if (!res.ok) throw new Error('jobs fetch failed');
                    const data = await res.json();
                    setJobs(data.jobs || []);
                } catch (e) {
                    console.error('[JobPanel] poll error', e);
                    setConnectionMode('offline');
                }
            }, 1000);
        };

        const connectSSE = () => {
            try {
                const es = new EventSource('/api/jobs/live');
                esRef.current = es;
                setConnectionMode('live');

                es.addEventListener('snapshot', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        setJobs(data.jobs || []);
                    } catch (err) {
                        console.error('[JobPanel] snapshot parse error', err);
                    }
                });

                es.addEventListener('update', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        setJobs(data.jobs || []);
                    } catch (err) {
                        console.error('[JobPanel] update parse error', err);
                    }
                });

                es.onerror = () => {
                    console.warn('[JobPanel] SSE error, closing & falling back to polling');
                    es.close();
                    esRef.current = null;
                    startPolling();
                };
            } catch (e) {
                console.error('[JobPanel] SSE init failed, falling back to polling', e);
                startPolling();
            }
        };

        connectSSE();

        return () => {
            esRef.current?.close();
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    const filteredJobs = useMemo(() => {
        let list = jobs.slice().sort((a, b) => {
            const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return tb - ta;
        });

        if (statusFilter !== 'ALL') {
            list = list.filter((j) => j.status === statusFilter);
        }

        if (typeFilter !== 'ALL') {
            list = list.filter((j) => j.type === typeFilter);
        }

        return list;
    }, [jobs, statusFilter, typeFilter]);

    const totals = useMemo(() => {
        const base = { ALL: jobs.length, RUNNING: 0, SUCCEEDED: 0, FAILED: 0, QUEUED: 0 };
        for (const j of jobs) {
            if (base[j.status] != null) base[j.status] += 1;
        }
        return base;
    }, [jobs]);

    const connectionLabel =
        connectionMode === 'live'
            ? 'Live via SSE'
            : connectionMode === 'poll'
                ? 'Fallback: polling'
                : 'Offline / error';

    const connectionTone =
        connectionMode === 'live'
            ? 'ok'
            : connectionMode === 'poll'
                ? 'running'
                : 'fail';

    return (
        <section className="card card-strong p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div
                        className="rounded-md px-2 py-1 border"
                        style={{
                            borderColor: 'rgba(158,240,26,.4)',
                            background:
                                'linear-gradient(180deg, rgba(18,26,18,.9), rgba(12,18,12,.85))',
                        }}
                    >
                        <span className="text-xs text-soft uppercase tracking-[0.15em]">
                            JOB MONITOR
                        </span>
                    </div>
                    <h2 className="text-base md:text-lg font-semibold tracking-tight text-[var(--acid-300)]">
                        Live Tasks Dashboard
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-soft">Connection:</span>
                    <span className={statusBadgeClass(connectionMode === 'live' ? 'RUNNING' : connectionMode === 'poll' ? 'QUEUED' : 'FAILED')}>
                        <StatusDot tone={connectionTone} />
                        {connectionLabel}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between border border-[var(--line)] rounded-xl px-3 py-2 bg-[rgba(10,16,10,.75)]">
                <div className="flex items-center gap-2 text-xs text-soft">
                    <span className="hidden sm:inline">Status:</span>
                    <div className="flex flex-wrap gap-1">
                        {STATUS_OPTIONS.map((s) => {
                            const active = statusFilter === s;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusFilter(s)}
                                    className={
                                        'px-2 py-1 rounded-full border text-[0.7rem] uppercase tracking-wide ' +
                                        (active
                                            ? 'border-[rgba(158,240,26,.6)] bg-[rgba(24,36,18,.9)] text-[var(--acid-300)]'
                                            : 'border-[var(--line)] bg-[rgba(14,20,14,.8)] text-soft hover:border-[rgba(158,240,26,.3)]')
                                    }
                                >
                                    {s === 'ALL' ? 'All' : s.toLowerCase()}
                                    {s !== 'ALL' && totals[s] != null && (
                                        <span className="ml-1 text-[0.65rem] opacity-80">
                                            ({totals[s]})
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-soft">
                    <span className="hidden sm:inline">Type:</span>
                    <div className="flex flex-wrap gap-1">
                        {TYPE_OPTIONS.map((t) => {
                            const active = typeFilter === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTypeFilter(t)}
                                    className={
                                        'px-2 py-1 rounded-full border text-[0.7rem] uppercase tracking-wide ' +
                                        (active
                                            ? 'border-[rgba(247,255,118,.6)] bg-[rgba(28,32,18,.9)] text-[var(--acid-300)]'
                                            : 'border-[var(--line)] bg-[rgba(14,20,14,.8)] text-soft hover:border-[rgba(247,255,118,.3)]')
                                    }
                                >
                                    {t === 'ALL' ? 'All' : t.toLowerCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredJobs.map((j) => {
                    const tone = statusTone(j.status);
                    const updated = j.updatedAt || j.createdAt;
                    const hb = j.heartbeatAt;

                    return (
                        <article
                            key={j.id}
                            className="card p-3 md:p-4 flex flex-col gap-2 border border-[var(--line)]"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                    <div className="text-xs text-soft uppercase tracking-[0.15em]">
                                        {j.type}
                                    </div>
                                    <div className="text-sm text-[var(--fg-0)] truncate max-w-[12rem]">
                                        Job #{j.id.slice(0, 8)}
                                    </div>
                                </div>
                                <span className={statusBadgeClass(j.status)}>
                                    <StatusDot tone={tone} /> {j.status}
                                </span>
                            </div>

                            <div className="mt-1">
                                <div className="progress">
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, j.progress || 0))}%`,
                                        }}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={j.progress || 0}
                                    />
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[11px] text-soft">
                                    <span>Progress: {j.progress ?? 0}%</span>
                                    <span className="opacity-80">
                                        Video: <span className="text-[var(--acid-300)]">{j.videoId}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="mt-1 text-[11px] text-soft flex flex-col gap-0.5">
                                <span>
                                    Updated:&nbsp;
                                    {updated ? new Date(updated).toLocaleTimeString() : '—'}
                                </span>
                                <span>
                                    Heartbeat:&nbsp;
                                    {hb ? new Date(hb).toLocaleTimeString() : '—'}
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                                <a
                                    className="btn text-xs px-2 py-1"
                                    style={{
                                        paddingTop: '0.3rem',
                                        paddingBottom: '0.3rem',
                                        paddingLeft: '0.6rem',
                                        paddingRight: '0.6rem',
                                        borderRadius: '999px',
                                    }}
                                    href={`/api/jobs/${j.id}`}
                                    title="Raw job JSON"
                                >
                                    Details
                                </a>

                                <button
                                    type="button"
                                    onClick={() => setOpenLog((p) => (p === j.id ? null : j.id))}
                                    className="btn text-xs px-2 py-1"
                                    style={{
                                        paddingTop: '0.3rem',
                                        paddingBottom: '0.3rem',
                                        paddingLeft: '0.7rem',
                                        paddingRight: '0.7rem',
                                        borderRadius: '999px',
                                        borderColor: 'rgba(240,255,59,.35)',
                                    }}
                                >
                                    {openLog === j.id ? 'Hide Log' : 'View Log'}
                                </button>

                                {j.type === 'RENDER' && j.status === 'SUCCEEDED' && (
                                    <>
                                        <a
                                            className="btn text-xs px-2 py-1"
                                            style={{
                                                paddingTop: '0.3rem',
                                                paddingBottom: '0.3rem',
                                                paddingLeft: '0.7rem',
                                                paddingRight: '0.7rem',
                                                borderRadius: '999px',
                                                borderColor: 'rgba(158,240,26,.45)',
                                            }}
                                            href={`/api/videos/${j.videoId}/download?format=mp4`}
                                            title="Download rendered MP4"
                                        >
                                            MP4
                                        </a>
                                        <a
                                            className="btn text-xs px-2 py-1"
                                            style={{
                                                paddingTop: '0.3rem',
                                                paddingBottom: '0.3rem',
                                                paddingLeft: '0.7rem',
                                                paddingRight: '0.7rem',
                                                borderRadius: '999px',
                                                borderColor: 'rgba(158,240,26,.45)',
                                            }}
                                            href={`/api/videos/${j.videoId}/download?format=webm`}
                                            title="Download rendered WEBM"
                                        >
                                            WEBM
                                        </a>
                                    </>
                                )}
                            </div>

                            {openLog === j.id && (
                                <div className="mt-2">
                                    <JobLog jobId={j.id} />
                                </div>
                            )}
                        </article>
                    );
                })}

                {filteredJobs.length === 0 && (
                    <div className="text-sm text-soft col-span-full">
                        No jobs match current filters.
                    </div>
                )}
            </div>
        </section>
    );
}

function JobLog({ jobId }) {
    const [log, setLog] = useState('Loading log…');
    const [error, setError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);

    const fetchLogOnce = async () => {
        try {
            const r = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
            if (!r.ok) throw new Error('log fetch failed');
            const d = await r.json();
            const text = d.job?.logText || '(empty)';
            setLog(text);
            setError(null);
        } catch (e) {
            console.error('[JobLog] load error', e);
            setError('Failed to load log.');
        }
    };

    useEffect(() => {
        let alive = true;

        const start = async () => {
            if (!alive) return;
            await fetchLogOnce();
            if (!alive) return;
            timerRef.current = setInterval(() => {
                if (isPaused) return;
                fetchLogOnce();
            }, 1000);
        };

        start();

        return () => {
            alive = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [jobId, isPaused]);

    return (
        <div className="border border-[var(--line)] rounded-lg bg-[rgba(6,10,6,.95)]">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--line)] text-[11px] text-soft">
                <span>Log · {jobId.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                    {error && <span className="text-[var(--rose-400)]">{error}</span>}
                    <button
                        type="button"
                        onClick={() => setIsPaused((p) => !p)}
                        className="px-2 py-0.5 rounded-full border border-[var(--line)] bg-[rgba(10,16,10,.9)] text-[0.7rem]"
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        type="button"
                        onClick={fetchLogOnce}
                        className="px-2 py-0.5 rounded-full border border-[rgba(158,240,26,.4)] bg-[rgba(14,20,14,.95)] text-[0.7rem]"
                    >
                        Refresh
                    </button>
                </div>
            </div>
            <pre className="max-h-48 overflow-auto text-[11px] leading-5 text-[#c7ff87] bg-transparent p-2 whitespace-pre-wrap">
                {log}
            </pre>
        </div>
    );
}
