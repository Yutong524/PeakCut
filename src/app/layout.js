import './globals.css';

import AppChrome from '@/components/layout/AppChrome';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata = {
  title: 'PEAKCUT · Industrial Subtitle & Render Studio',
  description:
    'Project-based video subtitle editing, hard-sub rendering, and batch export with an industrial green–yellow UI.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="
          min-h-screen
          antialiased
          text-[var(--fg-0)]
          bg-[var(--bg-0)]
        "
      >
        <AuthProvider>
          <AppChrome>
            {children}
          </AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
