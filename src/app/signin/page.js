'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
    return (
        <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
            <div className="card card-strong glow max-w-md w-full p-6 space-y-5">
                <div>
                    <h1
                        className="text-lg font-semibold mb-1"
                        style={{ color: 'var(--acid-300)' }}
                    >
                        Sign in to Peakcut
                    </h1>
                    <p className="text-soft text-xs">
                        Use your email magic link or OAuth provider. Your projects and
                        videos will be kept under your account.
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        className="btn btn-primary w-full"
                        onClick={() => signIn('email')}
                    >
                        Continue with email link
                    </button>

                    <div className="hr my-2" />

                    <button
                        className="btn w-full"
                        onClick={() => signIn('github')}
                    >
                        Continue with GitHub
                    </button>
                    <button
                        className="btn w-full"
                        onClick={() => signIn('google')}
                    >
                        Continue with Google
                    </button>
                </div>

                <p className="text-[10px] text-soft">
                    Once signed in, all projects, jobs, and videos will be tied to your
                    user ID for isolation and future billing.
                </p>
            </div>
        </main>
    );
}
