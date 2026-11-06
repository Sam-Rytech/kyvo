// Renames the demo account's family plan with a new memory that keeps its plan ID, so the
// newest event wins and Total Recall restores the new name. Walrus is append-only: the old name stays in history.
// Run: node --env-file=.env.local --import tsx scripts/rename-demo-plan.ts
import { eq } from 'drizzle-orm';
import { createDb } from '@/db';
import { cacheEvents, outbox } from '@/db/schema';
import { today } from '@/lib/engines/dates';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { encodeEnvelope, type MemoryEvent } from '@/lib/memory/envelope';
import { eventKey, namespaces, userHash } from '@/lib/memory/namespaces';
import { enqueue, postgresDrainStore } from '@/lib/memory/store';

const NAME = 'Sui payment proof';

async function main() {
  const demo = userHash('demo-account', process.env.NS_SALT as string);
  const db = createDb();
  const rows = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, demo));
  const plan = rows.filter((row) => row.type === 'family_plan').at(-1)?.event as (Record<string, unknown> & { pid: string; merchant: string; firstDue: string; members: { name: string; share: number }[] }) | undefined;
  if (!plan) throw new Error('The demo account has no plan');
  if (plan.merchant === NAME) {
    console.log('Already renamed.');
    return;
  }

  const h = eventKey({ userId: demo, type: 'family_plan', merchant: `${plan.pid}:${NAME}` });
  const names = plan.members.map((m) => `${m.name} ($${m.share.toFixed(2)})`).join(', ');
  await enqueue(db, [
    {
      userId: demo,
      namespace: namespaces.family(demo),
      idempotencyKey: h,
      text: encodeEnvelope(`Shared plan for ${NAME}, first due ${plan.firstDue}: ${names}.`, { ...plan, merchant: NAME, d: today(), src: 'user', h } as unknown as MemoryEvent),
    },
  ]);

  const store = postgresDrainStore(db);
  const memwal = getMemWal();
  for (let round = 0; round < 30; round++) {
    await drainOnce(store, memwal);
    const open = (await db.select({ status: outbox.status }).from(outbox).where(eq(outbox.userId, demo))).filter((row) => ['pending', 'sending', 'submitted'].includes(row.status));
    console.log(`round ${round + 1}: ${open.length} still saving`);
    if (open.length === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error('rename failed:', (error as Error).message);
    process.exit(1);
  },
);
