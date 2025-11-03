export default function EditorShell({ children, right }) {
    return (
        <div className="min-h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
            <div className="rounded-xl border border-[#1f2b1f] bg-[#0d0f0d] shadow-[0_0_0_1px_#1f2b1f_inset,0_20px_80px_-40px_rgba(148,255,58,0.15)]">
                {children}
            </div>
            <aside className="rounded-xl border border-[#284e2b] bg-gradient-to-b from-[#0e140f] via-[#0d130f] to-[#0b0f0b]">
                {right}
            </aside>
        </div>
    );
}
