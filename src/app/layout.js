import './globals.css';

export const metadata = {
  title: 'AI Clipper',
  description: 'Auto transcribe, cut, translate, and export shorts.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold tracking-tight">AI Clipper</h1>
            <nav className="text-sm text-zinc-400">MVP</nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
