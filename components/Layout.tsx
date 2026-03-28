import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sd_name');
    if (stored) setUserName(stored);
  }, []);

  const navLinks = [
    { href: '/', label: 'Register', icon: '✦' },
    { href: '/rate', label: 'Rate', icon: '♥' },
    { href: '/results', label: 'Results', icon: '◈' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-ink/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-rose text-lg">❤</span>
            <span className="font-display font-bold text-bright text-lg tracking-tight">
              spark<span className="text-rose">.</span>date
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon }) => {
              const active = router.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-rose/20 text-rose'
                      : 'text-dim hover:text-text hover:bg-surface'
                  }`}
                >
                  <span className="hidden sm:inline text-xs">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>

          {userName && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-dim">
              <span className="w-6 h-6 rounded-full bg-rose/20 flex items-center justify-center text-rose text-xs font-bold">
                {userName[0].toUpperCase()}
              </span>
              <span className="text-soft max-w-[100px] truncate">{userName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {title && (
          <div className="mb-8 animate-fade-in">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-bright">{title}</h1>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 text-center">
        <p className="text-xs text-muted">
          Match predictions powered by Naive Bayes · Trained on{' '}
          <a
            href="https://www.kaggle.com/datasets/annavictoria/speed-dating-experiment"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dim hover:text-rose transition-colors underline underline-offset-2"
          >
            Columbia University Speed Dating dataset
          </a>{' '}
          · Fisman et al. (2006)
        </p>
      </footer>
    </div>
  );
}
