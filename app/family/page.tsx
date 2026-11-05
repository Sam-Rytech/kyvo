import { eq } from 'drizzle-orm';
import { FamilyView } from '@/components/family-view';
import { SampleFamily } from '@/components/sample-family';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { planStates } from '@/lib/engines/family';

export default async function FamilyPage() {
  const session = await getSession();
  if (!session) return <SampleFamily />;

  const db = createDb();
  const [events, [user]] = await Promise.all([db.select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId)), db.select().from(users).where(eq(users.id, session.userId))]);
  const vault = user?.vaultAddress ?? null;
  return <FamilyView plans={planStates(events, today(), vault ?? undefined)} vault={vault} />;
}
