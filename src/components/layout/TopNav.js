'use client';
import AuthButton from '@/components/AuthButton';

export default function TopNav() {
  return (
    <header className="card card-strong glow p-3 md:p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="brand-chip">
          <span className="brand-dot" />
          <strong>PEAKCUT</strong>
        </div>
        <span className="hidden sm:inline text-xs text-[var(--fg-2)]">AI-powered cuts • bilingual subs</span>
      </div>
      <nav className="flex items-center gap-2">
        <a className="btn" href="/">Home</a>
        <a className="btn" href="/projects">Projects</a>
        <a className="btn" href="/editor">Editor</a>
        <AuthButton />
      </nav>
    </header>
  );
}
