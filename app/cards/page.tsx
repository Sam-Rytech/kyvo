import { eq } from 'drizzle-orm';
import { CardsView } from '@/components/cards-view';
import { SampleCards } from '@/components/sample-cards';
import { createDb } from '@/db';
import { cacheEvents } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { cardStates } from '@/lib/engines/registry';

export default async function CardsPage() {
  const session = await getSession();
  if (!session) return <SampleCards />;

  const events = await createDb().select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId));
  return <CardsView cards={cardStates(events, today())} />;
}
