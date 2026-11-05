'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Award,
  Calendar,
  Clock,
  CreditCard,
  LayoutDashboard,
  Moon,
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

function SampleBadge() {
  return (
    <span className="text-xs py-xxs px-xs rounded-full bg-utility-brand-50 text-utility-brand-700 border border-utility-brand-200 font-medium">
      Sample data
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  };

  const ThemeIcon = isDark ? Sun : Moon;

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
                <SampleBadge />
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
              {navItems.map((item) => {
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

          <div className="pt-lg border-t border-secondary">
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
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="md:hidden flex items-center justify-between px-lg py-sm bg-primary border-b border-secondary sticky top-0 z-30">
            <div className="flex items-center gap-xs">
              <div className="w-7 h-7 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand font-bold text-sm shadow-xs">
                K
              </div>
              <span className="font-bold text-heading-xs tracking-tight text-primary">Kyvo</span>
              <SampleBadge />
            </div>
            <div className="flex items-center gap-xs">
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

          <main className="flex-1 p-lg md:p-2xl max-w-6xl w-full mx-auto pb-24 md:pb-12">{children}</main>

          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary border-t border-secondary z-30 flex overflow-x-auto">
            {navItems.map((item) => {
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
          <button
            aria-label="Close dialog"
            onClick={() => setIsRecallOpen(false)}
            className="absolute inset-0 bg-overlay opacity-70"
          />
          <div className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-primary shadow-2xl border border-secondary">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div className="flex items-center gap-xs">
                <RotateCcw className="w-5 h-5 text-fg-brand-primary shrink-0" />
                <h2 className="text-heading-xs font-bold text-primary">Total Recall</h2>
              </div>
              <button
                onClick={() => setIsRecallOpen(false)}
                className="p-xs rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>
            <div className="p-xl space-y-md">
              <p className="text-sm text-secondary">
                Total Recall wipes Kyvo&apos;s local cache and rebuilds everything from Walrus Memory, to prove Walrus is the source of truth.
              </p>
              <p className="text-sm font-medium text-primary">Not available yet: it arrives once your inbox is connected.</p>
            </div>
          </div>
        </div>
      )}
    </WhyProvider>
  );
}
