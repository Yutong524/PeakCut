'use client';

export default function HotkeysOverlay() {
    return (
        <div className="fixed bottom-3 right-3 z-40">
            <div className="px-3 py-2 rounded-md border border-[#2a4828] bg-[#0c100c]/80 backdrop-blur text-[11px] text-[#caff6b] shadow-[0_10px_50px_-30px_rgba(148,255,58,0.5)]">
                ␣ Play/Pause · S Split · M Merge · ←/→ ±0.1s · Ctrl+S Save
            </div>
        </div>
    );
}
