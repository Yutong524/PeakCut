'use client';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
    const providers = [
        { id: 'github', label: 'Sign in with GitHub' },
        { id: 'google', label: 'Sign in with Google' },
        { id: 'email', label: 'Magic Link (Email)' }
    ];

    async function doSignIn(id) {
        if (id === 'email') {
            const email = prompt('Enter your email for a magic link:');
            if (!email) return;
            await signIn('email', { email, callbackUrl: '/' });
            return;
        }
        await signIn(id, { callbackUrl: '/' });
    }

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="card card-strong glow p-6 w-full max-w-md space-y-5">
                <div className="brand-chip w-fit">
                    <span className="brand-dot" />
                    <strong>PEAKCUT</strong>
                </div>
                <h1 className="text-xl" style={{ color: 'var(--acid-200)' }}>Sign in to continue</h1>

                <div className="grid gap-2">
                    {providers.map(p => (
                        <button key={p.id} className="btn btn-primary justify-center" onClick={() => doSignIn(p.id)}>
                            {p.label}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-[var(--fg-2)]">
                    By continuing, you agree to our Terms and acknowledge our Privacy Policy.
                </p>
            </div>
        </div>
    );
}
