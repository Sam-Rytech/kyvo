import { eq } from 'drizzle-orm';
import { FamilyView } from '@/components/family-view';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getViewer } from '@/lib/viewer';
import { today } from '@/lib/engines/dates';
import { planStates } from '@/lib/engines/family';

export default async function FamilyPage() {
  const viewer = await getViewer();
  const db = createDb();
  const [events, [user]] = await Promise.all([db.select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId)), db.select().from(users).where(eq(users.id, viewer.userId))]);
  const vault = user?.vaultAddress ?? null;
  return <FamilyView plans={planStates(events, today(), vault ?? undefined)} vault={vault} readOnly={viewer.readOnly} />;
}
