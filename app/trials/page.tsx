import { eq } from 'drizzle-orm';
import { TrialsView } from '@/components/trials-view';
import { createDb } from '@/db';
import { cacheEvents } from '@/db/schema';
import { getViewer } from '@/lib/viewer';
import { today } from '@/lib/engines/dates';
import { promiseStates } from '@/lib/engines/promises';
import { trialStates } from '@/lib/engines/trials';

export default async function TrialsPage() {
  const viewer = await getViewer();
  const events = await createDb().select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId));
  return <TrialsView trials={trialStates(events, today())} promises={promiseStates(events, today())} readOnly={viewer.readOnly} />;
}
