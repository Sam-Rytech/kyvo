import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getSession } from '@/lib/auth/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kyvo',
  description: 'Never get declined again. Know what to fund, in your own currency, before the charge hits.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <AppShell email={session?.email ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
