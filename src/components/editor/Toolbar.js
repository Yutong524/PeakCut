'use client';

export default function Toolbar({ onAddAtPlayhead, onSaveAll, srtHref }) {
    return (
        <div className="px-4 py-3 border-b border-[#2a4729] bg-gradient-to-r from-[#0c120c] via-[#0b100c] to-[#0d120b] rounded-t-xl">
            <div className="flex items-center gap-2">
                <button className="btn-primary" onClick={onAddAtPlayhead}>+ Add at Playhead</button>
                <button className="btn-ghost" onClick={onSaveAll}>Save All</button>
                {srtHref && (
                    <a href={srtHref} className="btn-accent" title="Export SRT">Export SRT</a>
                )}
                <div className="ml-auto text-xs text-[#8fe86c]">Tips: Space Play/Pause · S Split · M Merge · ←/→ ±0.1s · Ctrl+S Save</div>
            </div>

            <style jsx>{`
        .btn-primary {
          padding: 8px 12px; border-radius: 8px;
          background: linear-gradient(180deg,#1f371a,#0f160f);
          color: #eaff89; border: 1px solid #3a6a33;
          box-shadow: inset 0 0 0 1px #2a4c25, 0 12px 40px -20px rgba(150,255,70,.5);
        }
        .btn-primary:hover { background: linear-gradient(180deg,#25401f,#121a11); }
        .btn-ghost {
          padding: 8px 12px; border-radius: 8px;
          background: #0e150e; color: #d9ff7a; border: 1px solid #2b442a;
        }
        .btn-ghost:hover { background: #131e12; }
        .btn-accent {
          padding: 8px 12px; border-radius: 8px;
          background: linear-gradient(180deg,#172417,#0e150f);
          color: #e8ff82; border: 1px solid #3f6f35;
        }
        .btn-accent:hover { background: linear-gradient(180deg,#1a2b19,#111a11); }
      `}</style>
        </div>
    );
}
