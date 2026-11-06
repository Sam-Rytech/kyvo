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
  // A signed-out visitor never receives the vault address.
  const vault = viewer.readOnly ? null : (user?.vaultAddress ?? null);
  const plans = planStates(events, today(), vault ?? undefined);
  const shown = viewer.readOnly ? plans.map((plan) => ({ ...plan, members: plan.members.map((member) => ({ ...member, address: '' })) })) : plans;
  return <FamilyView plans={shown} vault={vault} readOnly={viewer.readOnly} />;
}
