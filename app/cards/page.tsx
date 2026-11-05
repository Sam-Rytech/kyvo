import { eq } from 'drizzle-orm';
import { CardsView } from '@/components/cards-view';
import { createDb } from '@/db';
import { cacheEvents } from '@/db/schema';
import { getViewer } from '@/lib/viewer';
import { today } from '@/lib/engines/dates';
import { cardStates } from '@/lib/engines/registry';

export default async function CardsPage() {
  const viewer = await getViewer();
  const events = await createDb().select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId));
  return <CardsView cards={cardStates(events, today())} readOnly={viewer.readOnly} />;
}
