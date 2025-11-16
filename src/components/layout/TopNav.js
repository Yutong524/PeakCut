'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

const LogoMark = () => (
    <div
        className="rounded-md glow"
        style={{
            padding: '6px 8px',
            background:
                'linear-gradient(180deg, rgba(36,52,16,.9), rgba(20,32,14,.85))',
            border: '1px solid rgba(158,240,26,.35)',
        }}
    >
        <svg width="18" height="18" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M11 2h2l-1 7h5l-8 13l2-9H6z"
                style={{ color: 'var(--lime-400)' }}
            />
        </svg>
    </div>
);

export default function TopNav() {
    const { data: session, status } = useSession();
    const loading = status === 'loading';
    const user = session?.user;

    return (
        <header
            className="card card-strong glow mb-4 flex items-center justify-between px-4 py-3"
            style={{ borderRadius: 16 }}
        >
            <div className="flex items-center gap-3">
                <LogoMark />
                <div className="flex flex-col">
                    <Link href="/" className="flex items-center gap-2">
                        <span
                            className="text-sm md:text-base font-semibold tracking-tight"
                            style={{ color: 'var(--acid-300)' }}
                        >
                            PEAKCUT
                        </span>
                        <span className="hidden md:inline text-[11px] text-soft">
                            multi-project subtitle workspace
                        </span>
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Link
                    href="/projects"
                    className="hidden sm:inline-flex btn"
                    style={{
                        borderColor: 'rgba(158,240,26,.35)',
                        paddingInline: '0.75rem',
                        fontSize: '0.8rem',
                    }}
                >
                    <span className="text-soft">My Projects</span>
                </Link>

                {loading ? (
                    <div className="cmdbar text-xs text-soft">Checking account…</div>
                ) : user ? (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end mr-1">
                            <span className="text-xs text-[var(--fg-0)]">
                                {user.name || user.email || 'Signed in'}
                            </span>
                            <span className="text-[10px] text-soft uppercase tracking-wide">
                                {user.role === 'ADMIN' ? 'ADMIN' : 'USER'}
                            </span>
                        </div>
                        <button
                            className="btn"
                            style={{
                                paddingInline: '0.7rem',
                                borderColor: 'rgba(255,84,120,.4)',
                            }}
                            onClick={() => signOut({ callbackUrl: '/' })}
                        >
                            <span className="text-[11px]">Sign out</span>
                        </button>
                    </div>
                ) : (
                    <button
                        className="btn btn-primary"
                        style={{ paddingInline: '0.85rem', fontSize: '0.8rem' }}
                        onClick={() => signIn(undefined, { callbackUrl: '/projects' })}
                    >
                        <span className="dot"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 9999
                            }}
                        />
                        <span>Sign in</span>
                    </button>
                )}
            </div>
        </header>
    );
}
