'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clamp, fmtClock } from '@/lib/time';

export default function Timeline({ duration = 0, currentMs = 0, segments = [], onSeek, onDragBoundary }) {
    const ref = useRef(null);
    const [dragging, setDragging] = useState(false);

    const marks = useMemo(() => {
        const arr = [];
        const step = Math.max(10000, Math.floor(duration / 10));
        for (let t = 0; t <= duration; t += step) {
            arr.push({ t, label: fmtClock(t) });
        }
        return arr;
    }, [duration]);

    const xFromMs = (ms) => {
        if (!ref.current) return 0;
        const rect = ref.current.getBoundingClientRect();
        return (ms / Math.max(1, duration)) * rect.width;
    };
    const msFromX = (x) => {
        if (!ref.current) return 0;
        const rect = ref.current.getBoundingClientRect();
        return clamp((x / Math.max(1, rect.width)) * duration, 0, duration);
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging) return;
            const rect = ref.current.getBoundingClientRect();
            const x = clamp(e.clientX - rect.left, 0, rect.width);
            const target = msFromX(x);
            onSeek?.(target);
        };
        const onUp = () => setDragging(false);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging, onSeek, duration]);

    const onDown = (e) => {
        setDragging(true);
        const rect = ref.current.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        onSeek?.(msFromX(x));
    };

    return (
        <div className="px-4 pb-4">
            <div className="mb-2 text-[11px] text-[#a5ff70]">Timeline</div>
            <div
                ref={ref}
                onMouseDown={onDown}
                className="relative h-16 rounded-md border border-[#274427] bg-gradient-to-b from-[#0b100b] to-[#0a0e0a] overflow-hidden cursor-pointer"
            >
                <div className="absolute inset-0">
                    {marks.map((m, i) => (
                        <div key={i} className="absolute top-0 h-full" style={{ left: `${(m.t / duration) * 100}%` }}>
                            <div className="w-[1px] h-full bg-[#1f321f]/80" />
                            <div className="absolute top-1 left-1 text-[10px] text-[#90ef6c]">{m.label}</div>
                        </div>
                    ))}
                </div>

                <div className="absolute inset-0">
                    {segments.map((s) => {
                        const left = (s.startMs / duration) * 100;
                        const width = Math.max(0.5, ((s.endMs - s.startMs) / duration) * 100);
                        return (
                            <div
                                key={s.id}
                                className="absolute top-1.5 h-11 rounded-sm bg-[#1a2d10] border border-[#355f2e] shadow-[0_0_0_1px_#284d23_inset]"
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={s.textSrc}
                            />
                        );
                    })}
                </div>

                <div
                    className="absolute top-0 bottom-0 w-[2px] bg-[#d7ff62] shadow-[0_0_8px_2px_rgba(190,255,80,0.5)]"
                    style={{ left: `${(currentMs / duration) * 100}%` }}
                >
                    <div className="absolute -top-1 -left-2 text-[9px] bg-[#0f160f] border border-[#345b2f] rounded px-1 text-[#d7ff62]">
                        {fmtClock(currentMs)}
                    </div>
                </div>
            </div>
        </div>
    );
}
