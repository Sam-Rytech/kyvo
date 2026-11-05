// Live checks for /status: every number here comes from a real call, made just now.
import { sql } from 'drizzle-orm';
import { createDb } from '@/db';
import { getTatum } from '@/lib/chain/tatum-client';
import { getLatestCheckpoint } from '@/lib/chain/usdc';
import { getMemWal } from '@/lib/memory/client';

const TIMEOUT_MS = 8_000;
const CACHE_MS = 60_000;

export type ServiceCheck = { name: string; role: string; ok: boolean; ms: number | null; note: string };

async function timed(name: string, role: string, run: () => Promise<string | void>): Promise<ServiceCheck> {
  const started = Date.now();
  try {
    const note = await Promise.race([run(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out')), TIMEOUT_MS))]);
    return { name, role, ok: true, ms: Date.now() - started, note: note || 'Responding' };
  } catch (error) {
    // Names only: messages from these clients can quote request details.
    return { name, role, ok: false, ms: null, note: (error as Error).message === 'Timed out' ? `No answer in ${TIMEOUT_MS / 1000}s` : 'Not responding' };
  }
}

let cached: { at: number; checks: ServiceCheck[] } | undefined;

export async function runChecks(): Promise<{ checks: ServiceCheck[]; checkedAt: number }> {
  if (cached && Date.now() - cached.at < CACHE_MS) return { checks: cached.checks, checkedAt: cached.at };

  const checks = await Promise.all([
    timed('Tatum Sui GraphQL', 'Vault balance, verifying payments', async () => `Mainnet checkpoint ${(await getLatestCheckpoint(getTatum())).toLocaleString('en-US')}`),
    timed('Tatum exchange rates', 'Local-currency estimates', async () => {
      const body = await getTatum().rest<{ value: string; basePair: string }>('/v4/data/rate/symbol?symbol=USDC&basePair=NGN');
      return `USDC ${Number(body.value).toLocaleString('en-US')} ${body.basePair}`;
    }),
    timed('Walrus Memory relayer', 'Everything Kyvo learns', async () => `Status ${(await getMemWal().health()).status}`),
    timed('Neon Postgres', 'Rebuildable cache and write queue', async () => {
      await createDb().execute(sql`select 1`);
    }),
    timed('Groq', 'Reading billing emails', async () => {
      const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { authorization: `Bearer ${process.env.LLM_API_KEY}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error('Bad status');
    }),
    timed('Telegram', 'Alerts', async () => {
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error('Bad status');
    }),
  ]);
  cached = { at: Date.now(), checks };
  return { checks, checkedAt: cached.at };
}
