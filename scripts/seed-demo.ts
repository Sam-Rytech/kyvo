// Seeds the demo account's memories on mainnet from real billing history.
// Data lives in scripts/seed-data.local.json, which git ignores. See seed-data.example.json.
// Preview without writing: node --env-file=.env.local --import tsx scripts/seed-demo.ts --dry-run
// Write:                   node --env-file=.env.local --import tsx scripts/seed-demo.ts
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
const money = z.object({ date: isoDate, amount: z.number().positive(), currency: z.string().length(3).default('USD') });

const SeedData = z.object({
  homeCurrency: z.string().length(3),
  cards: z.array(z.object({ label: z.string(), provider: z.string() })).min(1),
  subscriptions: z
    .array(
      z.object({
        merchant: z.string(),
        card: z.string().optional(),
        charges: z.array(money).default([]),
        declines: z.array(money).default([]),
        usageBills: z.array(money.extend({ period: z.string().optional() })).default([]),
        refunds: z.array(money).default([]),
        cardAdded: z.array(money).default([]),
      }),
    )
    .min(1),
  promise: z.object({ text: z.string(), merchant: z.string().optional(), date: isoDate }).optional(),
  trial: z
    .object({
      merchant: z.string(),
      startedOn: isoDate,
      endsOn: isoDate.optional(),
      convertsTo: z.number().positive().optional(),
      reason: z.string().optional(),
      card: z.string().optional(),
    })
    .optional(),
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
    const ns = namespaces.merchant(u, sub.merchant);
    const onCard = sub.card ? ` on card "${sub.card}"` : '';
    const entries: [EventType, z.infer<typeof money>[], (x: z.infer<typeof money>) => string][] = [
      ['charge', sub.charges, (x) => `${sub.merchant} charged ${x.currency} ${x.amount.toFixed(2)} on ${x.date}${onCard}.`],
      ['decline', sub.declines, (x) => `${sub.merchant} failed to charge ${x.currency} ${x.amount.toFixed(2)} on ${x.date}${onCard}.`],
      ['usage_bill', sub.usageBills, (x) => `${sub.merchant} billed ${x.currency} ${x.amount.toFixed(2)} for usage on ${x.date}${onCard}.`],
      ['refund', sub.refunds, (x) => `${sub.merchant} refunded ${x.currency} ${x.amount.toFixed(2)} on ${x.date}${onCard}.`],
      ['card_added', sub.cardAdded, (x) => `${sub.merchant} put a ${x.currency} ${x.amount.toFixed(2)} authorization${onCard} on ${x.date}, so it now holds that card.`],
    ];
    for (const [t, list, sentence] of entries) {
      for (const x of list) {
        add(ns, sentence(x), { t, m, amt: x.amount, cur: x.currency, d: x.date, card: sub.card }, { merchant: m, date: x.date, amount: x.amount });
      }
    }
  }

  if (data.promise) {
    const pm = data.promise.merchant ? merchantSlug(data.promise.merchant) : undefined;
    add(namespaces.promises(u), `On ${data.promise.date} the user said: "${data.promise.text}".`, { t: 'promise', m: pm, d: data.promise.date, text: data.promise.text, status: 'open' }, { merchant: pm, date: data.promise.date });
  }

  if (data.trial) {
    const t = data.trial;
    const tm = merchantSlug(t.merchant);
    add(
      namespaces.trials(u),
      `${t.merchant} trial started ${t.startedOn}${t.endsOn ? `, ending ${t.endsOn}` : ''}.${t.reason ? ` Reason: ${t.reason}.` : ''}`,
      { t: 'trial_start', m: tm, d: t.startedOn, endsAt: t.endsOn, convertsTo: t.convertsTo, cur: t.convertsTo ? 'USD' : undefined, reason: t.reason, card: t.card },
      { merchant: tm, date: t.startedOn },
    );
  }

  return items;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const salt = process.env.NS_SALT;
  if (!salt) throw new Error('NS_SALT is not set');
  const data = SeedData.parse(JSON.parse(readFileSync(new URL('./seed-data.local.json', import.meta.url), 'utf8')));
  const u = userHash('demo-account', salt);
  const items = buildItems(u, data);

  const unknown = data.cards.filter((c) => c.provider === 'UNKNOWN').map((c) => c.label);
  console.log(`${items.length} memories for demo user ${u}:`);
  for (const item of items) console.log(`  [${item.namespace.replace(u, 'u')}] ${item.sentence}`);
  if (dryRun) {
    if (unknown.length) console.log(`Provider still UNKNOWN for: ${unknown.join(', ')}`);
    console.log('Dry run: nothing written.');
    return;
  }
  if (unknown.length) throw new Error(`Fill in the provider for: ${unknown.join(', ')}`);

  const db = createDb();
  const store = postgresDrainStore(db);
  const memwal = getMemWal();

  await db.insert(users).values({ id: u, homeCurrency: data.homeCurrency, providers: [...new Set(data.cards.map((c) => c.provider))] }).onConflictDoNothing();

  await enqueue(
    db,
    items.map((item) => {
      const h = eventKey(item.key);
      return { userId: u, namespace: item.namespace, idempotencyKey: h, text: encodeEnvelope(item.sentence, { ...item.event, h }) };
    }),
  );

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
