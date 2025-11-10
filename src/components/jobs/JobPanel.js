'use client';
import { useEffect, useRef, useState } from 'react';

function badgeClass(status) {
    if (status === 'SUCCEEDED') return 'bg-[#143914] text-[#b9ff7e] border border-[#295c29]';
    if (status === 'FAILED') return 'bg-[#3a1515] text-[#ffd5d5] border border-[#5f2a2a]';
    if (status === 'RUNNING') return 'bg-[#243c14] text-[#e1ff7e] border border-[#3a5f29]';
    return 'bg-[#1c1f1b] text-[#cdeaa1] border border-[#2d3a2a]';
}

export default function JobPanel() {
    const [jobs, setJobs] = useState([]);
    const [openLog, setOpenLog] = useState(null);
    const esRef = useRef(null);

    const pollRef = useRef(null);

    useEffect(() => {
        const connect = () => {
            try {
                const es = new EventSource('/api/jobs/live');
                esRef.current = es;

                es.addEventListener('snapshot', (e) => {
                    const data = JSON.parse(e.data);
                    setJobs(data.jobs || []);
                });
                es.addEventListener('update', (e) => {
                    const data = JSON.parse(e.data);
                    setJobs(data.jobs || []);
                });
                es.onerror = () => {
                    es.close();
                    if (!pollRef.current) {
                        pollRef.current = setInterval(async () => {
                            try {
                                const r = await fetch('/api/jobs', { cache: 'no-store' });
                                const d = await r.json();
                                setJobs(d.jobs || []);
                            } catch { }
                        }, 1000);
                    }
                };
            } catch {
                pollRef.current = setInterval(async () => {
                    try {
                        const r = await fetch('/api/jobs', { cache: 'no-store' });
                        const d = await r.json();
                        setJobs(d.jobs || []);
                    } catch { }
                }, 1000);
            }
        };

        connect();
        return () => {
            esRef.current?.close();
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    return (
        <section className="rounded-xl border border-[#2a4729] bg-[#0c120c] p-4 md:p-5 mb-4">
            <div className="flex items-center justify-between">
                <h2 className="font-medium text-[#eaff89]">Live Jobs</h2>
                <div className="text-xs text-[#92e86b]">auto-updating</div>
            </div>

            <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {jobs.map(j => (
                    <div key={j.id} className="rounded-lg p-3 border border-[#2a4729] bg-[#0e150e]">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-[#d8ff70]">{j.type}</div>
                            <span className={`px-2 py-1 rounded text-xs ${badgeClass(j.status)}`}>{j.status}</span>
                        </div>

                        <div className="mt-2 h-2 bg-[#1a2416] rounded overflow-hidden">
                            <div className="h-full bg-[#caff6b]" style={{ width: `${j.progress}%` }} />
                        </div>

                        <div className="mt-2 text-[11px] text-[#9bdc75]">
                            Job: {j.id}<br />
                            Video: {j.videoId}<br />
                            Updated: {new Date(j.updatedAt).toLocaleTimeString()} · HB: {j.heartbeatAt ? new Date(j.heartbeatAt).toLocaleTimeString() : '—'}
                        </div>

                        <div className="mt-2 flex gap-2">
                            <a className="px-2 py-1 text-xs rounded border border-[#345b2f] text-[#caff6b]" href={`/api/jobs/${j.id}`}>Details</a>
                            <button
                                className="px-2 py-1 text-xs rounded border border-[#345b2f] text-[#e8ff82]"
                                onClick={() => setOpenLog(p => p === j.id ? null : j.id)}
                            >
                                {openLog === j.id ? 'Hide Log' : 'View Log'}
                            </button>
                            {j.type === 'RENDER' && j.status === 'SUCCEEDED' && (
                                <>
                                    <a className="px-2 py-1 text-xs rounded border border-[#345b2f] text-[#e8ff82]" href={`/api/videos/${j.videoId}/download?format=mp4`}>MP4</a>
                                    <a className="px-2 py-1 text-xs rounded border border-[#345b2f] text-[#e8ff82]" href={`/api/videos/${j.videoId}/download?format=webm`}>WEBM</a>
                                </>
                            )}
                        </div>

                        {openLog === j.id && (
                            <JobLog jobId={j.id} />
                        )}
                    </div>
                ))}
                {jobs.length === 0 && <div className="text-sm text-[#9bdc75]">No jobs yet.</div>}
            </div>
        </section>
    );
}

function JobLog({ jobId }) {
    const [log, setLog] = useState('Loading...');
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
                const d = await r.json();
                const text = d.job?.logText || '(empty)';
                if (alive) setLog(text);
            } catch (e) {
                if (alive) setLog('Failed to load log.');
            }
        })();
        const iv = setInterval(async () => {
            try {
                const r = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
                const d = await r.json();
                const text = d.job?.logText || '(empty)';
                setLog(text);
            } catch { }
        }, 1000);
        return () => { alive = false; clearInterval(iv); };
    }, [jobId]);

    return (
        <pre className="mt-2 max-h-48 overflow-auto text-xs leading-5 text-[#c7ff87] bg-[#0a0f0a] p-2 rounded border border-[#2a4729] whitespace-pre-wrap">
            {log}
        </pre>
    );
}
