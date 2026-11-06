'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, Calendar, Clock, LayoutDashboard, Users } from 'lucide-react';
import { ConnectGmail } from '@/components/connect-gmail';
import { WhyProvider } from '@/components/why-panel';

const navItems = [
  { href: '/', label: 'Today', icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: Calendar },
  { href: '/trials', label: 'Trials', icon: Clock },
  { href: '/family', label: 'Family', icon: Users },
  { href: '/wrapped', label: 'Wrapped', icon: Award },
];

const AUTH_ERRORS: Record<string, string> = {
  denied: 'Sign-in was cancelled.',
  state: 'Sign-in expired. Try again.',
  gmail_scope: 'Kyvo needs Gmail read access to find your subscriptions. Try again and allow it.',
  exchange: 'Google sign-in failed. Try again.',
};

const connect = 'rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand';

function Wordmark({ email }: { email: string | null }) {
  return (
    <div className="flex items-baseline gap-xs">
      <Link href="/" className="display text-[2rem] leading-none text-primary">
        Kyvo
      </Link>
      {!email && <span className="rounded-full border border-primary px-xs text-xs font-medium text-secondary whitespace-nowrap">Live demo</span>}
    </div>
  );
}

export function AppShell({ children, email }: { children: ReactNode; email: string | null }) {
  const pathname = usePathname();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (code) setAuthError(AUTH_ERRORS[code] ?? AUTH_ERRORS.exchange);
  }, []);

  return (
    <WhyProvider>
      <div className="min-h-screen bg-primary text-primary font-sans flex flex-col md:flex-row">
        <aside className="hidden md:flex flex-col w-56 border-r border-secondary shrink-0 p-xl justify-between sticky top-0 h-screen">
          <div className="space-y-xl">
            <Wordmark email={email} />
            <nav aria-label="Main" className="space-y-xxs">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`block rounded-full px-md py-xs text-sm font-semibold ${isActive ? 'bg-brand-solid text-primary-on-brand' : 'text-secondary hover:bg-secondary'}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {email ? (
            <form action="/api/auth/logout" method="post" className="space-y-xs text-xs">
              <p className="text-tertiary truncate" title={email}>
                {email}
              </p>
              <div className="flex gap-sm font-medium text-secondary">
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                <button className="underline">Sign out</button>
              </div>
            </form>
          ) : (
            <ConnectGmail className={`${connect} w-full`} />
          )}
        </aside>

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="md:hidden flex items-center justify-between gap-xs px-lg py-sm bg-primary border-b border-secondary sticky top-0 z-30">
            <Wordmark email={email} />
            {email ? (
              <form action="/api/auth/logout" method="post" className="flex gap-sm text-xs font-medium text-secondary shrink-0">
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                <button className="underline">Sign out</button>
              </form>
            ) : (
              <ConnectGmail className="rounded-full bg-brand-solid px-md py-xs text-xs font-semibold text-primary-on-brand shrink-0" />
            )}
          </header>

          {authError && (
            <div role="alert" className="bg-utility-error-50 border-b border-utility-error-200 px-lg py-xs text-sm text-utility-error-700">
              {authError}
            </div>
          )}

          <main className="app-main flex-1 min-w-0">{children}</main>

          <footer className="px-[var(--gutter)] pt-md pb-24 md:pb-lg border-t border-secondary flex flex-wrap gap-md text-sm text-secondary">
            <Link href="/proof" className="font-medium underline">
              How it&apos;s verified
            </Link>
            <a href="https://github.com/Sam-Rytech/kyvo" target="_blank" rel="noreferrer" className="underline">
              Code on GitHub
            </a>
          </footer>

          <nav aria-label="Main" className="md:hidden fixed bottom-0 left-0 right-0 bg-primary border-t border-secondary z-30 grid grid-cols-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`flex flex-col items-center py-xs min-w-0 ${isActive ? 'text-primary font-semibold' : 'text-tertiary'}`}>
                  <Icon className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-[0.6875rem] mt-xxs truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </WhyProvider>
  );
}
