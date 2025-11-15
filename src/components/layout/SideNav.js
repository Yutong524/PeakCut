'use client';
export default function SideNav() {
  return (
    <aside className="card glow p-3 md:p-4" style={{ minWidth: 240 }}>
      <div className="text-xs text-[var(--fg-1)] mb-2">NAVIGATION</div>
      <nav className="space-y-2">
        <a className="btn w-full justify-between" href="/projects">
          Projects <span className="badge"><span className="badge-dot" />New</span>
        </a>
        <a className="btn w-full justify-between" href="/">
          Dashboard <span className="badge badge-warn"><span className="badge-dot" />Live</span>
        </a>
        <a className="btn w-full" href="/editor">Editor</a>
        <a className="btn w-full" href="/settings">Settings</a>
      </nav>
    </aside>
  );
}
