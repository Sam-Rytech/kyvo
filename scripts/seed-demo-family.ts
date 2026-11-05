// Gives the demo account a vault and a family plan with a payment that really happened on Sui,
// copied from the owner's own account so no addresses live in the repo.
// Run: node --env-file=.env.local --import tsx scripts/seed-demo-family.ts <owner user id>
import { eq } from 'drizzle-orm';
import { createDb } from '@/db';
import { cacheEvents, outbox, users } from '@/db/schema';
import { today } from '@/lib/engines/dates';
import { paymentMemories, planMemory } from '@/lib/engines/family';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces, userHash } from '@/lib/memory/namespaces';
import { enqueue, postgresDrainStore } from '@/lib/memory/store';

type Plan = { pid: string; merchant: string; firstDue: string; members: { id: string; name: string; address: string; share: number }[] };
type Payment = { pid: string; member: string; memberName: string; amt: number; digest: string; paidOn: string; due: string; lateDays: number };

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error('Pass the owner user id');
  const demo = userHash('demo-account', process.env.NS_SALT as string);
  const db = createDb();

  const [owner] = await db.select().from(users).where(eq(users.id, source));
  const rows = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, source));
  const plan = rows.find((row) => row.type === 'family_plan')?.event as unknown as Plan | undefined;
  const payment = rows.find((row) => row.type === 'family_payment')?.event as unknown as Payment | undefined;
  const address = owner?.vaultAddress;
  if (!plan || !payment || !address) throw new Error('The owner has no plan, payment or vault yet');

  await db.update(users).set({ vaultAddress: address }).where(eq(users.id, demo));

  const h = eventKey({ userId: demo, type: 'vault', merchant: address });
  const memory = planMemory(demo, { merchant: plan.merchant, firstDue: plan.firstDue, members: plan.members }, today());
  const planId = (JSON.parse(memory.text.slice(memory.text.indexOf('#ky ') + 4)) as { pid: string }).pid;
  await enqueue(db, [
    { userId: demo, namespace: namespaces.profile(demo), idempotencyKey: h, text: encodeEnvelope(`The dollar vault is the Sui address ${address}.`, { v: 1, t: 'vault', address, d: today(), src: 'user', h }) },
    memory,
    ...paymentMemories(demo, [{ planId, merchant: plan.merchant, memberId: payment.member, memberName: payment.memberName, amount: payment.amt, digest: payment.digest, paidOn: payment.paidOn, due: payment.due, lateDays: payment.lateDays }]),
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
    console.error('seed failed:', (error as Error).message);
    process.exit(1);
  },
);
