import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings-form';
import { createDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';

export const metadata = { title: 'Settings · Kyvo' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const [user] = await createDb().select().from(users).where(eq(users.id, session.userId));

  return (
    <div className="max-w-xl space-y-lg">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-xs text-tertiary">Signed in as {session.email}</p>
      </div>
      <SettingsForm currency={user?.homeCurrency ?? 'NGN'} providers={user?.providers ?? []} />
    </div>
  );
}
