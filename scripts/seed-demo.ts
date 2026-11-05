// Seeds the demo account's memories on mainnet from your real subscriptions.
// Data lives in scripts/seed-data.local.json, which git ignores. See seed-data.example.json.
// Run: node --env-file=.env.local --import tsx scripts/seed-demo.ts
import { readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '@/db';
import { outbox, users } from '@/db/schema';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { encodeEnvelope, type EventType, type MemoryEvent } from '@/lib/memory/envelope';
import { eventKey, merchantSlug, namespaces, userHash } from '@/lib/memory/namespaces';
import { enqueue, postgresDrainStore } from '@/lib/memory/store';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const SeedData = z.object({
  homeCurrency: z.string().length(3),
  cards: z.array(z.object({ label: z.string(), provider: z.string() })).min(1),
  subscriptions: z
    .array(
      z.object({
        merchant: z.string(),
        card: z.string(),
        charges: z.array(z.object({ date: isoDate, amount: z.number().positive(), currency: z.string().length(3).default('USD') })).min(1),
      }),
    )
    .min(1),
  promise: z.object({ text: z.string(), merchant: z.string().optional(), date: isoDate }),
  trial: z.object({
    merchant: z.string(),
    startedOn: isoDate,
    endsOn: isoDate.optional(),
    convertsTo: z.number().positive().optional(),
    reason: z.string(),
    card: z.string().optional(),
  }),
});

type Item = { namespace: string; sentence: string; event: MemoryEvent; key: Parameters<typeof eventKey>[0] };

function buildItems(u: string, data: z.infer<typeof SeedData>): Item[] {
  const items: Item[] = [];
  const add = (namespace: string, sentence: string, event: { t: EventType } & Record<string, unknown>, keyExtra: { merchant?: string; date?: string; amount?: number } = {}) => {
    items.push({
      namespace,
      sentence,
      event: { v: 1, src: 'seed', ...event } as MemoryEvent,
      key: { userId: u, type: event.t, ...keyExtra },
    });
  };

  const providers = [...new Set(data.cards.map((c) => c.provider))];
  add(namespaces.profile(u), `Home currency is ${data.homeCurrency}; dollar subscriptions are paid with ${providers.join(' and ')}.`, {
    t: 'profile',
    homeCurrency: data.homeCurrency,
    providers,
  });

  for (const card of data.cards) {
    add(namespaces.cards(u), `Card "${card.label}" is a ${card.provider} card.`, { t: 'card_added', card: card.label, provider: card.provider }, { merchant: card.label });
  }

  for (const sub of data.subscriptions) {
    const m = merchantSlug(sub.merchant);
    for (const charge of sub.charges) {
      add(
        namespaces.merchant(u, sub.merchant),
        `${sub.merchant} charged ${charge.currency} ${charge.amount.toFixed(2)} on ${charge.date} to card "${sub.card}".`,
        { t: 'charge', m, amt: charge.amount, cur: charge.currency, d: charge.date, card: sub.card },
        { merchant: m, date: charge.date, amount: charge.amount },
      );
    }
  }

  const promiseMerchant = data.promise.merchant ? merchantSlug(data.promise.merchant) : undefined;
  add(namespaces.promises(u), `On ${data.promise.date} the user said: "${data.promise.text}".`, { t: 'promise', m: promiseMerchant, d: data.promise.date, text: data.promise.text, status: 'open' }, { merchant: promiseMerchant, date: data.promise.date });

  const trialM = merchantSlug(data.trial.merchant);
  add(
    namespaces.trials(u),
    `${data.trial.merchant} trial started ${data.trial.startedOn}${data.trial.endsOn ? `, ending ${data.trial.endsOn}` : ''}. Reason: ${data.trial.reason}.`,
    { t: 'trial_start', m: trialM, d: data.trial.startedOn, endsAt: data.trial.endsOn, convertsTo: data.trial.convertsTo, cur: 'USD', reason: data.trial.reason, card: data.trial.card },
    { merchant: trialM, date: data.trial.startedOn },
  );

  return items;
}

async function main() {
  const salt = process.env.NS_SALT;
  if (!salt) throw new Error('NS_SALT is not set');
  const data = SeedData.parse(JSON.parse(readFileSync(new URL('./seed-data.local.json', import.meta.url), 'utf8')));

  const db = createDb();
  const store = postgresDrainStore(db);
  const memwal = getMemWal();
  const u = userHash('demo-account', salt);

  await db.insert(users).values({ id: u, homeCurrency: data.homeCurrency, providers: [...new Set(data.cards.map((c) => c.provider))] }).onConflictDoNothing();

  const items = buildItems(u, data);
  await enqueue(
    db,
    items.map((item) => {
      const h = eventKey(item.key);
      return { userId: u, namespace: item.namespace, idempotencyKey: h, text: encodeEnvelope(item.sentence, { ...item.event, h }) };
    }),
  );
  console.log(`demo user ${u}: ${items.length} memories queued`);

  for (let round = 0; round < 40; round++) {
    const result = await drainOnce(store, memwal);
    const [counts] = await db
      .select({
        open: sql<number>`count(*) filter (where ${outbox.status} in ('pending','sending','submitted'))::int`,
        stored: sql<number>`count(*) filter (where ${outbox.status} = 'stored')::int`,
        failed: sql<number>`count(*) filter (where ${outbox.status} = 'failed')::int`,
      })
      .from(outbox)
      .where(eq(outbox.userId, u));
    console.log(`round ${round + 1}: sent=${result.sent} stored=${counts.stored} open=${counts.open} failed=${counts.failed}${result.error ? ` error=${result.error}` : ''}${result.skipped ? ` skipped=${result.skipped}` : ''}`);
    if (counts.open === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  const rows = await db.select({ namespace: outbox.namespace, blobId: outbox.blobId, status: outbox.status }).from(outbox).where(eq(outbox.userId, u));
  for (const row of rows) console.log(`${row.status.padEnd(9)} ${row.blobId ?? '-'}  ${row.namespace.replace(u, '<u>')}`);
}

main().catch((error) => {
  console.error('seed failed:', (error as Error).message);
  process.exitCode = 1;
});
