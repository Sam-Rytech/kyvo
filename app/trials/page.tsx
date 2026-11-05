import { eq } from 'drizzle-orm';
import { SampleTrials } from '@/components/sample-trials';
import { TrialsView } from '@/components/trials-view';
import { createDb } from '@/db';
import { cacheEvents } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { promiseStates } from '@/lib/engines/promises';
import { trialStates } from '@/lib/engines/trials';

export default async function TrialsPage() {
  const session = await getSession();
  if (!session) return <SampleTrials />;

  const events = await createDb().select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId));
  return <TrialsView trials={trialStates(events, today())} promises={promiseStates(events, today())} />;
}
