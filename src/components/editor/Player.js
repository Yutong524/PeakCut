'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtClock } from '@/lib/time';

export default function Player({ videoId, currentMs, onTimeChange, onDuration }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;

        const onLoaded = () => {
            setDuration(el.duration * 1000 || 0);
            onDuration?.(el.duration * 1000 || 0);
        };
        const onTime = () => onTimeChange?.(el.currentTime * 1000);

        el.addEventListener('loadedmetadata', onLoaded);
        el.addEventListener('timeupdate', onTime);
        return () => {
            el.removeEventListener('loadedmetadata', onLoaded);
            el.removeEventListener('timeupdate', onTime);
        };
    }, [onTimeChange, onDuration]);

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        const delta = Math.abs((el.currentTime * 1000) - currentMs);
        if (delta > 50) el.currentTime = currentMs / 1000;
    }, [currentMs]);

    const toggle = () => {
        if (!ref.current) return;
        if (ref.current.paused) {
            ref.current.play();
            setPlaying(true);
        } else {
            ref.current.pause();
            setPlaying(false);
        }
    };

    const step = (ms) => {
        if (!ref.current) return;
        ref.current.currentTime = Math.max(0, Math.min((duration / 1000), (ref.current.currentTime + ms / 1000)));
    };

    return (
        <div className="p-4">
            <div className="rounded-lg overflow-hidden border border-[#263a26] bg-black/70">
                <video
                    ref={ref}
                    className="w-full aspect-video"
                    src={`/api/videos/${videoId}/stream`}
                    controls={false}
                    playsInline
                />
            </div>

            <div className="mt-3 flex items-center gap-2">
                <button
                    onClick={toggle}
                    className="px-3 py-2 rounded-md border border-[#345b2f] bg-[#101810] hover:bg-[#132013] text-[#caff6b] text-sm shadow-[inset_0_0_0_1px_#244121]"
                >
                    {playing ? 'Pause' : 'Play'}
                </button>
                <button onClick={() => step(-100)} className="btn-ghost">◀ 0.1s</button>
                <button onClick={() => step(-1000)} className="btn-ghost">◀ 1s</button>
                <button onClick={() => step(100)} className="btn-ghost">0.1s ▶</button>
                <button onClick={() => step(1000)} className="btn-ghost">1s ▶</button>

                <div className="ml-auto text-xs text-[#9fe870]">
                    {fmtClock(currentMs)} / {fmtClock(duration)}
                </div>
            </div>

            <style jsx>{`
        .btn-ghost {
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #2b442a;
          background: #0e150e;
          color: #d9ff7a;
        }
        .btn-ghost:hover {
          background: #131e12;
        }
      `}</style>
        </div>
    );
}
