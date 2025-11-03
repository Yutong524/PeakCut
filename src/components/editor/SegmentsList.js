'use client';
import { useMemo } from 'react';
import SegmentRow from './SegmentRow';

export default function SegmentsList({
    segments, activeId, onFocusRow, onChangeRow, onDeleteRow,
    onSplitRow, onMergeRow, onSeek
}) {

    const sorted = useMemo(() => {
        return [...(segments || [])].sort((a, b) => a.startMs - b.startMs);
    }, [segments]);

    return (
        <div className="p-3">
            <div className="mb-2 text-[11px] text-[#a5ff70] flex items-center justify-between">
                <span>Segments</span>
                <span className="text-[#90ef6c]">{sorted.length}</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-[#274427] bg-[#0c0f0c]">
                {sorted.map((s, idx) => (
                    <SegmentRow
                        key={s.id}
                        data={s}
                        index={idx}
                        active={activeId === s.id}
                        onFocus={() => onFocusRow?.(s)}
                        onChange={(next) => onChangeRow?.(s.id, next)}
                        onDelete={() => onDeleteRow?.(s.id)}
                        onSplit={(ms) => onSplitRow?.(s.id, ms)}
                        onMergeNext={() => onMergeRow?.(s.id)}
                        onSeek={(ms) => onSeek?.(ms)}
                    />
                ))}
                {sorted.length === 0 && (
                    <div className="p-6 text-sm text-[#8bbf6a]">No segments yet.</div>
                )}
            </div>
        </div>
    );
}
