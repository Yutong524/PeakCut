'use client';
import { useEffect, useRef, useState } from 'react';
import { clamp, fmtClock } from '@/lib/time';

export default function SegmentRow({
    data, index, active, onFocus, onChange, onDelete, onSplit, onMergeNext, onSeek
}) {
    const [start, setStart] = useState(data.startMs);
    const [end, setEnd] = useState(data.endMs);
    const [text, setText] = useState(data.textSrc || '');
    const dirtyRef = useRef(false);

    useEffect(() => {
        setStart(data.startMs); setEnd(data.endMs); setText(data.textSrc || '');
        dirtyRef.current = false;
    }, [data.id, data.startMs, data.endMs, data.textSrc]);

    const commit = () => {
        if (!dirtyRef.current) return;
        onChange?.({
            startMs: start,
            endMs: end,
            textSrc: text
        });
        dirtyRef.current = false;
    };

    const bump = (which, delta) => {
        if (which === 'start') setStart(s => clamp(s + delta, 0, Math.max(0, end - 10)));
        else setEnd(e => Math.max(start + 10, e + delta));
        dirtyRef.current = true;
    };

    const bg = active ? 'bg-[#111a0f]' : 'bg-[#0d120d]';
    const border = active ? 'border-[#3a6a33]' : 'border-[#274427]';

    return (
        <div
            className={`p-2 border-b ${border} ${bg} hover:bg-[#121a11] transition-colors`}
            onClick={onFocus}
        >
            <div className="flex items-center gap-2">
                <div className="text-[10px] text-[#9fe870] w-7 shrink-0">{index + 1}</div>

                <div className="flex items-center gap-1">
                    <button className="chip" onClick={(e) => { e.stopPropagation(); onSeek?.(start); }}>{fmtClock(start)}</button>
                    <div className="flex gap-1">
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('start', -1000) }}>-1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('start', -100) }}>-0.1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('start', 100) }}>+0.1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('start', 1000) }}>+1s</button>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button className="chip" onClick={(e) => { e.stopPropagation(); onSeek?.(end); }}>{fmtClock(end)}</button>
                    <div className="flex gap-1">
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('end', -1000) }}>-1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('end', -100) }}>-0.1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('end', 100) }}>+0.1s</button>
                        <button className="btn-xs" onClick={(e) => { e.stopPropagation(); bump('end', 1000) }}>+1s</button>
                    </div>
                </div>

                <input
                    className="flex-1 text-sm bg-[#0c0f0c] border border-[#274427] rounded px-2 py-1 text-[#d8ff70] placeholder:text-[#6fa75c] focus:outline-none focus:ring-2 focus:ring-[#3a6a33]"
                    value={text}
                    placeholder="subtitle text"
                    onChange={(e) => { setText(e.target.value); dirtyRef.current = true; }}
                    onBlur={commit}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit(); }}
                />

                <div className="flex items-center gap-1">
                    <button className="btn-accent" title="Split at middle"
                        onClick={(e) => { e.stopPropagation(); const mid = Math.floor((start + end) / 2); onSplit?.(mid); }}>
                        Split
                    </button>
                    <button className="btn-ghost" title="Merge with next" onClick={(e) => { e.stopPropagation(); onMergeNext?.(); }}>
                        Merge
                    </button>
                    <button className="btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
                        Delete
                    </button>
                </div>
            </div>

            <style jsx>{`
        .btn-xs {
          font-size: 10px; padding: 2px 6px; border-radius: 4px;
          border: 1px solid #2a4127; background: #0f150f; color: #bdfb61;
        }
        .btn-xs:hover { background: #141e12; }
        .btn-accent {
          font-size: 12px; padding: 6px 10px; border-radius: 6px;
          border: 1px solid #3f6f35; background: linear-gradient(180deg,#172417,#0e150f);
          color: #e8ff82; box-shadow: inset 0 0 0 1px #2b4826, 0 6px 20px -10px rgba(190,255,80,.4);
        }
        .btn-accent:hover { background: linear-gradient(180deg,#1a2b19,#111a11); }
        .btn-danger {
          font-size: 12px; padding: 6px 10px; border-radius: 6px;
          border: 1px solid #503232; background: #1a0f0f; color: #ffb4b4;
        }
        .btn-danger:hover { background: #201212; }
        .btn-ghost {
          font-size: 12px; padding: 6px 10px; border-radius: 6px;
          border: 1px solid #2b442a; background: #0e150e; color: #d9ff7a;
        }
        .btn-ghost:hover { background: #131e12; }
        .chip {
          font-size: 11px; padding: 3px 6px; border-radius: 6px;
          border: 1px solid #345b2f; background: #101810; color: #caff6b;
        }
      `}</style>
        </div>
    );
}
