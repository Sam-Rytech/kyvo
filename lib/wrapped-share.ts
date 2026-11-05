import { eq } from 'drizzle-orm';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { readShareCode } from '@/lib/auth/crypto';
import { today } from '@/lib/engines/dates';
import { buildWrapped, type WrappedReport } from '@/lib/engines/wrapped';

/** A signed link opens one month's totals only. Merchant names stay private. */
export async function loadSharedReport(code: string): Promise<WrappedReport | null> {
  const parsed = readShareCode(code, process.env.TOKEN_ENC_KEY as string);
  if (!parsed) return null;
  const db = createDb();
  const [events, [user]] = await Promise.all([db.select().from(cacheEvents).where(eq(cacheEvents.userId, parsed.userId)), db.select().from(users).where(eq(users.id, parsed.userId))]);
  const report = buildWrapped(events, user?.homeCurrency, parsed.month, today());
  return report ? { ...report, top: [] } : null;
}
