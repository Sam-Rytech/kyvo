import type { Metadata, Viewport } from 'next';
import { Archivo, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getSession } from '@/lib/auth/session';
import './globals.css';

// latin-ext carries the naira, cedi and rupee signs.
const display = Archivo({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], variable: '--font-display', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' });
const mono = Spline_Sans_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://kyvo-five.vercel.app'),
  title: 'Kyvo',
  description: 'Never get declined again. Know what to fund, in your own currency, before the charge hits.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffc21a',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AppShell email={session?.email ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
