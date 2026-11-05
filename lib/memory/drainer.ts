// Sends the outbox to Walrus one batch per call, so it can't outrun serverless time
// limits, and paces every user together because the write cap is per account (§5.3).
import type { RememberBulkAcceptedResult, RememberBulkItem, RememberBulkStatusResult } from '@mysten-incubation/memwal';
import { batchKey } from './namespaces';

export const MAX_BATCH = 20;
export const MAX_PER_MINUTE = 20;
export const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const LEASE_MS = 60_000;
const DEFAULT_BACKOFF_MS = 60_000;

export type OutboxRow = {
  id: number;
  namespace: string;
  text: string;
  idempotencyKey: string;
  batchKey: string | null;
  jobId: string | null;
  attempts: number;
};

export type DrainWindow = { blockedUntil: Date; windowStartedAt: Date; windowCount: number };

export interface DrainStore {
  /** Takes the single lease, or returns null if another drain holds it. */
  acquire(now: Date, leaseMs: number): Promise<DrainWindow | null>;
  release(window: DrainWindow): Promise<void>;
  submitted(): Promise<OutboxRow[]>;
  /** Rows claimed by a batch that never got an acknowledgement, in their original order. */
  sending(): Promise<OutboxRow[]>;
  pending(limit: number): Promise<OutboxRow[]>;
  claim(ids: number[], batchKey: string): Promise<void>;
  markSubmitted(jobs: { id: number; jobId: string }[]): Promise<void>;
  markStored(id: number, blobId: string): Promise<void>;
  /** Puts a failed job back in the queue, or gives up after MAX_ATTEMPTS. */
  markRetry(id: number, attempts: number, error: string, giveUp: boolean): Promise<void>;
}

export interface BulkMemory {
  rememberBulk(items: RememberBulkItem[], options: { idempotencyKey: string }): Promise<RememberBulkAcceptedResult>;
  getRememberBulkStatus(jobIds: string[]): Promise<RememberBulkStatusResult>;
}

export type DrainResult = {
  skipped?: 'locked' | 'blocked';
  sent: number;
  stored: number;
  retried: number;
  failed: number;
  error?: string;
};

function retryAfterMs(error: unknown): number | null {
  const e = error as { status?: number; retryAfterSeconds?: number; message?: string };
  const limited = e?.status === 429 || e?.status === 503 || /\b(429|503)\b/.test(e?.message ?? '');
  if (!limited) return null;
  return e.retryAfterSeconds ? e.retryAfterSeconds * 1000 : DEFAULT_BACKOFF_MS;
}

export async function drainOnce(store: DrainStore, memory: BulkMemory, now: Date = new Date()): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, stored: 0, retried: 0, failed: 0 };
  const window = await store.acquire(now, LEASE_MS);
  if (!window) return { ...result, skipped: 'locked' };

  try {
    await pollSubmitted(store, memory, result);

    if (window.blockedUntil > now) return { ...result, skipped: 'blocked' };

    if (now.getTime() - window.windowStartedAt.getTime() >= WINDOW_MS) {
      window.windowStartedAt = now;
      window.windowCount = 0;
    }
    const allowance = Math.min(MAX_BATCH, MAX_PER_MINUTE - window.windowCount);
    if (allowance <= 0) return result;

    // A batch with no acknowledgement may have landed anyway. Resending it unchanged,
    // with the same key, collapses onto the original job instead of writing twice.
    let rows = await store.sending();
    let key = rows[0]?.batchKey ?? null;
    if (rows.length > 0) rows = rows.filter((row) => row.batchKey === key);
    if (rows.length === 0) {
      rows = await store.pending(allowance);
      if (rows.length === 0) return result;
      key = batchKey(rows.map((row) => row.idempotencyKey));
      await store.claim(rows.map((row) => row.id), key);
    }

    try {
      const accepted = await memory.rememberBulk(
        rows.map((row) => ({ text: row.text, namespace: row.namespace })),
        { idempotencyKey: key as string },
      );
      await store.markSubmitted(rows.map((row, i) => ({ id: row.id, jobId: accepted.job_ids[i] })));
      window.windowCount += rows.length;
      result.sent = rows.length;
    } catch (error) {
      result.error = (error as Error).message;
      const wait = retryAfterMs(error);
      if (wait) window.blockedUntil = new Date(now.getTime() + wait);
    }
    return result;
  } finally {
    await store.release(window);
  }
}

async function pollSubmitted(store: DrainStore, memory: BulkMemory, result: DrainResult) {
  const submitted = await store.submitted();
  if (submitted.length === 0) return;

  const byJob = new Map(submitted.map((row) => [row.jobId, row]));
  const statuses = await memory.getRememberBulkStatus(submitted.map((row) => row.jobId as string));

  for (const status of statuses.results) {
    const row = byJob.get(status.job_id);
    if (!row) continue;
    if (status.status === 'done' && status.blob_id) {
      await store.markStored(row.id, status.blob_id);
      result.stored++;
    } else if (status.status === 'failed' || status.status === 'not_found') {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await store.markRetry(row.id, attempts, status.error ?? status.status, giveUp);
      if (giveUp) result.failed++;
      else result.retried++;
    }
  }
}
