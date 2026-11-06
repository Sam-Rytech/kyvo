import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { createDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/api/auth/google');

  const [user] = await createDb().select().from(users).where(eq(users.id, session.userId));

  return (
    <div className="max-w-xl space-y-lg">
      <div>
        <h1 className="page-title">Set up Kyvo</h1>
        <p className="text-sm text-secondary mt-xs">Two questions, then Kyvo reads your last 12 months of billing emails.</p>
      </div>
      <OnboardingForm initialCurrency={user?.homeCurrency ?? 'NGN'} initialProviders={user?.providers ?? []} />
    </div>
  );
}
