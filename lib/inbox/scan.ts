// One scan call handles one small batch, saves its place and returns, so a long
// backfill can't outrun serverless limits and can pause when LLM quota runs out (§5.1).
import { sha256 } from '@/lib/memory/namespaces';
import { LlmQuotaError, type Extractor } from './extractor';
import { buildQuery, type GmailClient } from './gmail';
import { looksLikeBilling } from './text';
import { eventToOutbox, type OutboxItem } from './to-memory';

/** Fits Groq's per-minute limits in one call, with room for its slowest responses. */
export const SCAN_BATCH = 6;

export interface ScanStore {
  cursor(userId: string): Promise<{ pageToken: string | null; done: boolean }>;
  saveCursor(userId: string, pageToken: string | null, done: boolean): Promise<void>;
  /** Of these hashes, the ones already processed. */
  seen(userId: string, hashes: string[]): Promise<Set<string>>;
  markSeen(userId: string, hash: string): Promise<void>;
  enqueue(items: OutboxItem[]): Promise<void>;
}

export type ScanResult = {
  done: boolean;
  processed: number;
  events: number;
  skipped: number;
  pausedForSeconds?: number;
};

export async function scanBatch(
  deps: { store: ScanStore; gmail: GmailClient; extract: Extractor },
  userId: string,
  limit: number = SCAN_BATCH,
): Promise<ScanResult> {
  const { store, gmail, extract } = deps;
  const result: ScanResult = { done: false, processed: 0, events: 0, skipped: 0 };
  const cursor = await store.cursor(userId);
  let pageToken = cursor.done ? null : cursor.pageToken;
  // After the backfill, a scan only looks at recent mail.
  const query = buildQuery(cursor.done ? '2d' : '1y');

  while (result.processed + result.skipped < limit) {
    const page = await gmail.listMessages(query, pageToken);
    const hashes = new Map(page.ids.map((id) => [id, sha256(id)]));
    const seen = await store.seen(userId, [...hashes.values()]);
    const unseen = page.ids.filter((id) => !seen.has(hashes.get(id) as string));

    for (const id of unseen) {
      if (result.processed + result.skipped >= limit) return result;
      const email = await gmail.getMessage(id);

      if (!looksLikeBilling(email.subject, email.text)) {
        await store.markSeen(userId, hashes.get(id) as string);
        result.skipped++;
        continue;
      }

      try {
        const event = await extract(email);
        if (event) {
          await store.enqueue([eventToOutbox(userId, event, id)]);
          result.events++;
        }
        await store.markSeen(userId, hashes.get(id) as string);
        result.processed++;
      } catch (error) {
        // Not marked seen, so this email is retried when quota returns.
        if (error instanceof LlmQuotaError) return { ...result, pausedForSeconds: error.retryAfterSeconds };
        throw error;
      }
    }

    if (!page.nextPageToken) {
      await store.saveCursor(userId, null, true);
      return { ...result, done: true };
    }
    pageToken = page.nextPageToken;
    if (!cursor.done) await store.saveCursor(userId, pageToken, false);
  }
  return result;
}
