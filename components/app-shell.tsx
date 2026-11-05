'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Award,
  Calendar,
  Check,
  Clock,
  CreditCard,
  LayoutDashboard,
  Moon,
  Settings,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { WhyProvider } from '@/components/why-panel';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: Calendar },
  { href: '/trials', label: 'Trials', icon: Clock },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/family', label: 'Family', icon: Users },
  { href: '/wrapped', label: 'Wrapped', icon: Award },
  { href: '/status', label: 'Status', icon: Activity },
  { href: '/proof', label: 'Proof', icon: ShieldCheck },
];

const AUTH_ERRORS: Record<string, string> = {
  denied: 'Sign-in was cancelled.',
  state: 'Sign-in expired. Try again.',
  gmail_scope: 'Kyvo needs Gmail read access to find your subscriptions. Try again and allow it.',
  exchange: 'Google sign-in failed. Try again.',
};

type Recall = { state: 'idle' } | { state: 'running'; done: number; total: number; restored: number } | { state: 'done'; restored: number } | { state: 'error'; message: string };

export function AppShell({ children, email }: { children: ReactNode; email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [recall, setRecall] = useState<Recall>({ state: 'idle' });
  const [isDark, setIsDark] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (code) setAuthError(AUTH_ERRORS[code] ?? AUTH_ERRORS.exchange);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  };

  async function runTotalRecall() {
    setRecall({ state: 'running', done: 0, total: 0, restored: 0 });
    let cursor = 0;
    let restored = 0;
    for (;;) {
      const response = await fetch('/api/rebuild', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cursor }),
      }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!response?.ok || !body) {
        setRecall({ state: 'error', message: body?.error ?? 'Total Recall stopped. Your memories are safe on Walrus, so try again.' });
        return;
      }
      restored += body.restored;
      cursor = body.cursor;
      if (body.done) {
        setRecall({ state: 'done', restored });
        router.refresh();
        return;
      }
      setRecall({ state: 'running', done: cursor, total: body.total, restored });
    }
  }

  useEffect(() => {
    if (!isRecallOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRecall();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeRecall = () => {
    if (recall.state === 'running') return;
    setIsRecallOpen(false);
    setRecall({ state: 'idle' });
  };

  const ThemeIcon = isDark ? Sun : Moon;
  const nav = email ? [...navItems, { href: '/settings', label: 'Settings', icon: Settings }] : navItems;

  return (
    <WhyProvider>
      <div className="min-h-screen bg-secondary text-primary font-sans flex flex-col md:flex-row">
        <aside className="hidden md:flex flex-col w-64 border-r border-secondary bg-primary shrink-0 p-xl justify-between">
          <div className="space-y-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <div className="w-8 h-8 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand font-bold text-md shadow-xs">
                  K
                </div>
                <span className="font-bold text-heading-xs tracking-tight text-primary">Kyvo</span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-xs rounded-lg text-tertiary hover:text-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Toggle theme"
              >
                <ThemeIcon className="w-4 h-4 text-fg-tertiary" />
              </button>
            </div>

            <nav className="space-y-xxs">
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-sm px-lg py-sm rounded-lg text-sm font-medium border focus-visible:ring-2 focus-visible:ring-focus-ring ${
                      isActive
                        ? 'bg-secondary text-brand-primary font-semibold border-secondary shadow-xs'
                        : 'text-secondary hover:text-primary hover:bg-secondary-hover border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-fg-brand-primary' : 'text-fg-quaternary'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-lg border-t border-secondary space-y-sm">
            <button
              onClick={() => setIsRecallOpen(true)}
              className="w-full flex items-center gap-xs p-sm rounded-lg border border-secondary bg-primary hover:bg-secondary-hover text-primary text-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <RotateCcw className="w-4 h-4 text-fg-brand-primary shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-primary">Total Recall</div>
                <div className="text-tertiary text-xs">Rebuild everything from Walrus</div>
              </div>
            </button>
            {email ? (
              <form action="/api/auth/logout" method="post" className="flex items-center justify-between gap-xs">
                <span className="text-xs text-tertiary truncate" title={email}>
                  {email}
                </span>
                <button className="text-xs font-medium text-secondary hover:text-primary underline shrink-0">Sign out</button>
              </form>
            ) : (
              <a
                href="/api/auth/google"
                className="block w-full rounded-lg bg-brand-solid px-lg py-sm text-center text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Connect Gmail
              </a>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="md:hidden flex items-center justify-between gap-xs px-lg py-sm bg-primary border-b border-secondary sticky top-0 z-30">
            <div className="flex items-center gap-xs min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand font-bold text-sm shadow-xs shrink-0">
                K
              </div>
              <span className="font-bold text-heading-xs tracking-tight text-primary">Kyvo</span>
            </div>
            <div className="flex items-center gap-xs shrink-0">
              {email ? (
                <form action="/api/auth/logout" method="post">
                  <button className="text-xs font-medium text-secondary underline">Sign out</button>
                </form>
              ) : (
                <a href="/api/auth/google" className="rounded-lg bg-brand-solid px-sm py-xs text-xs font-semibold text-primary-on-brand">
                  Connect Gmail
                </a>
              )}
              <button
                onClick={() => setIsRecallOpen(true)}
                className="p-xs rounded-lg bg-primary border border-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Total Recall"
              >
                <RotateCcw className="w-4 h-4 text-fg-brand-primary shrink-0" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-xs rounded-lg bg-primary border border-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Toggle theme"
              >
                <ThemeIcon className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </div>
          </header>

          {!email && (
            <div className="bg-utility-brand-50 border-b border-utility-brand-200 px-lg py-xs text-xs text-utility-brand-700">
              <strong className="font-semibold">Demo:</strong> real billing history, read-only. Connecting your own Gmail is limited to approved testers while Kyvo is in Google&apos;s testing mode.
            </div>
          )}

          {authError && (
            <div role="alert" className="bg-utility-error-50 border-b border-utility-error-200 px-lg py-xs text-sm text-utility-error-700">
              {authError}
            </div>
          )}

          <main className="flex-1 p-lg md:p-2xl max-w-6xl w-full mx-auto pb-24 md:pb-12">{children}</main>

          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary border-t border-secondary z-30 flex overflow-x-auto">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center shrink-0 min-w-[76px] py-xs px-xxs ${
                    isActive ? 'text-brand-primary font-semibold' : 'text-quaternary hover:text-primary'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-fg-brand-primary' : 'text-fg-quaternary'}`} />
                  <span className="text-xs mt-xxs">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {isRecallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
          <button aria-label="Close dialog" onClick={closeRecall} className="absolute inset-0 bg-overlay opacity-70" />
          <div role="dialog" aria-modal="true" aria-labelledby="recall-title" className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-primary shadow-2xl border border-secondary">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div className="flex items-center gap-xs">
                <RotateCcw className="w-5 h-5 text-fg-brand-primary shrink-0" />
                <h2 id="recall-title" className="text-heading-xs font-bold text-primary">
                  Total Recall
                </h2>
              </div>
              <button onClick={closeRecall} className="p-xs rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring" aria-label="Close">
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>
            <div className="p-xl space-y-md">
              {!email && (
                <>
                  <p className="text-sm text-secondary">
                    Total Recall wipes Kyvo&apos;s local cache and rebuilds everything from Walrus Memory, to prove Walrus is the source of truth.
                  </p>
                  <a href="/api/auth/google" className="inline-block rounded-lg bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
                    Connect Gmail to try it
                  </a>
                </>
              )}
              {email && recall.state === 'idle' && (
                <>
                  <p className="text-sm text-secondary">
                    This wipes Kyvo&apos;s local cache of your data and rebuilds it from Walrus Memory alone. Nothing on Walrus is changed, and your list should come back the same.
                  </p>
                  <div className="flex justify-end gap-sm">
                    <button onClick={closeRecall} className="rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover">
                      Cancel
                    </button>
                    <button onClick={() => void runTotalRecall()} className="rounded-lg bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover">
                      Wipe and rebuild
                    </button>
                  </div>
                </>
              )}
              {recall.state === 'running' && (
                <div className="py-md text-center space-y-sm" role="status">
                  <RefreshCw className="w-8 h-8 text-fg-brand-primary animate-spin mx-auto" aria-hidden />
                  <p className="text-sm font-semibold text-primary">
                    {recall.total ? `Recalled ${recall.done} of ${recall.total} namespaces, ${recall.restored} records so far` : 'Reading from Walrus Memory…'}
                  </p>
                </div>
              )}
              {recall.state === 'done' && (
                <div className="py-md text-center space-y-xs" role="status">
                  <Check className="w-8 h-8 text-fg-success-primary mx-auto" aria-hidden />
                  <p className="text-sm font-semibold text-primary">Rebuilt {recall.restored} records from Walrus Memory.</p>
                </div>
              )}
              {recall.state === 'error' && (
                <p role="alert" className="text-sm text-utility-error-700">
                  {recall.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </WhyProvider>
  );
}
