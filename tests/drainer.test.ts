import { describe, expect, it } from 'vitest';
import { MemWalMock } from '@mysten-incubation/memwal';
import { drainOnce, MAX_ATTEMPTS, type BulkMemory, type DrainStore, type DrainWindow, type OutboxRow } from '@/lib/memory/drainer';

type Row = OutboxRow & { status: string; blobId: string | null };

function memoryStore(count: number) {
  const rows: Row[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    namespace: 'ky:u1:m:netflix',
    text: `fact ${i + 1}`,
    idempotencyKey: `key-${i + 1}`,
    batchKey: null,
    jobId: null,
    attempts: 0,
    status: 'pending',
    blobId: null,
  }));
  let lockedUntil = new Date(0);
  let saved: DrainWindow = { blockedUntil: new Date(0), windowStartedAt: new Date(0), windowCount: 0 };

  const store: DrainStore = {
    async acquire(now, leaseMs) {
      if (lockedUntil > now) return null;
      lockedUntil = new Date(now.getTime() + leaseMs);
      return { ...saved };
    },
    async release(window) {
      saved = { ...window };
      lockedUntil = new Date(0);
    },
    submitted: async () => rows.filter((r) => r.status === 'submitted'),
    sending: async () => rows.filter((r) => r.status === 'sending'),
    pending: async (limit) => rows.filter((r) => r.status === 'pending').slice(0, limit),
    async claim(ids, key) {
      for (const r of rows) if (ids.includes(r.id)) Object.assign(r, { status: 'sending', batchKey: key });
    },
    async markSubmitted(jobs) {
      for (const job of jobs) Object.assign(rows.find((r) => r.id === job.id)!, { status: 'submitted', jobId: job.jobId });
    },
    async markStored(id, blobId) {
      Object.assign(rows.find((r) => r.id === id)!, { status: 'stored', blobId });
    },
    async markRetry(id, attempts, _error, giveUp) {
      Object.assign(rows.find((r) => r.id === id)!, { status: giveUp ? 'failed' : 'pending', attempts, jobId: null, batchKey: null });
    },
  };
  return { rows, store, window: () => saved, hold: () => (lockedUntil = new Date(8640000000000000)) };
}

const t0 = new Date('2026-11-05T00:00:00Z');
const after = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

function countingMock() {
  const mock = MemWalMock.create({ namespace: 'test' });
  const calls: { size: number; key: string }[] = [];
  const memory: BulkMemory = {
    rememberBulk(items, options) {
      calls.push({ size: items.length, key: options.idempotencyKey });
      return mock.rememberBulk(items, options);
    },
    getRememberBulkStatus: (ids) => mock.getRememberBulkStatus(ids),
  };
  return { memory, calls, mock };
}

describe('drainOnce', () => {
  it('sends at most one batch of 20 per call, then stores blob IDs on the next poll', async () => {
    const { rows, store } = memoryStore(25);
    const { memory, calls } = countingMock();

    const first = await drainOnce(store, memory, t0);
    expect(first.sent).toBe(20);
    expect(calls).toHaveLength(1);
    expect(rows.filter((r) => r.status === 'submitted')).toHaveLength(20);

    const second = await drainOnce(store, memory, after(5));
    expect(second.stored).toBe(20);
    expect(rows.filter((r) => r.status === 'stored').every((r) => r.blobId)).toBe(true);
  });

  it('never exceeds 20 memories a minute, shared across calls', async () => {
    const { store } = memoryStore(45);
    const { memory, calls } = countingMock();

    await drainOnce(store, memory, t0);
    const blocked = await drainOnce(store, memory, after(30));
    expect(blocked.sent).toBe(0);
    expect(calls).toHaveLength(1);

    const next = await drainOnce(store, memory, after(61));
    expect(next.sent).toBe(20);
    expect(calls).toHaveLength(2);
  });

  it('never asks about more than 20 jobs at once, as the relayer refuses more', async () => {
    const { rows, store } = memoryStore(45);
    const asked: number[] = [];
    let job = 0;
    const memory: BulkMemory = {
      rememberBulk: async (items) => ({ job_ids: items.map(() => `job-${++job}`), total: items.length, status: 'accepted' }),
      getRememberBulkStatus: async (ids) => {
        asked.push(ids.length);
        if (ids.length > 20) throw new Error('job_ids exceeds maximum of 20 per bulk status request');
        return { results: [] };
      },
    };
    // A backlog builds up while jobs are still running, then every poll stays within the limit.
    await drainOnce(store, memory, t0);
    await drainOnce(store, memory, after(61));
    await drainOnce(store, memory, after(122));
    expect(rows.filter((r) => r.status === 'submitted').length).toBeGreaterThan(20);
    expect(Math.max(...asked)).toBeLessThanOrEqual(20);

    memory.getRememberBulkStatus = async (ids) => ({ results: ids.map((job_id) => ({ job_id, status: 'done' as const, blob_id: `blob-${job_id}` })) });
    for (let i = 0; i < 3; i++) await drainOnce(store, memory, after(200 + i));
    expect(rows.every((r) => r.status === 'stored')).toBe(true);
  });

  it('skips when another drain holds the lease', async () => {
    const { store, hold } = memoryStore(3);
    const { memory, calls } = countingMock();
    hold();
    expect(await drainOnce(store, memory, t0)).toMatchObject({ skipped: 'locked', sent: 0 });
    expect(calls).toHaveLength(0);
  });

  it('after an unacknowledged send, retries the same rows with the same key', async () => {
    const { rows, store } = memoryStore(3);
    const { mock } = countingMock();
    const keys: string[] = [];
    let fail = true;
    const memory: BulkMemory = {
      rememberBulk(items, options) {
        keys.push(options.idempotencyKey);
        if (fail) {
          fail = false;
          return Promise.reject(new Error('socket hang up'));
        }
        return mock.rememberBulk(items, options);
      },
      getRememberBulkStatus: (ids) => mock.getRememberBulkStatus(ids),
    };

    const first = await drainOnce(store, memory, t0);
    expect(first).toMatchObject({ sent: 0, error: 'socket hang up' });
    expect(rows.every((r) => r.status === 'sending')).toBe(true);

    const second = await drainOnce(store, memory, after(1));
    expect(second.sent).toBe(3);
    expect(keys[0]).toBe(keys[1]);
  });

  it('backs off on 429 using retry_after, and keeps the rows for the same batch', async () => {
    const { rows, store, window } = memoryStore(2);
    const { mock } = countingMock();
    let limited = true;
    const memory: BulkMemory = {
      rememberBulk(items, options) {
        if (limited) {
          limited = false;
          return Promise.reject(Object.assign(new Error('rate limited'), { status: 429, retryAfterSeconds: 120 }));
        }
        return mock.rememberBulk(items, options);
      },
      getRememberBulkStatus: (ids) => mock.getRememberBulkStatus(ids),
    };

    await drainOnce(store, memory, t0);
    expect(window().blockedUntil).toEqual(after(120));

    expect(await drainOnce(store, memory, after(60))).toMatchObject({ skipped: 'blocked', sent: 0 });
    expect(rows.every((r) => r.status === 'sending')).toBe(true);

    expect((await drainOnce(store, memory, after(121))).sent).toBe(2);
  });

  it('requeues a failed job, then gives up after the attempt limit', async () => {
    const { rows, store } = memoryStore(1);
    const memory: BulkMemory = {
      rememberBulk: async () => ({ job_ids: ['job-1'], total: 1, status: 'accepted' }),
      getRememberBulkStatus: async () => ({ results: [{ job_id: 'job-1', status: 'failed', error: 'boom' }] }),
    };

    let retried = 0;
    let failed = 0;
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
      const result = await drainOnce(store, memory, after(i * 120));
      retried += result.retried;
      failed += result.failed;
    }
    expect(retried).toBe(MAX_ATTEMPTS - 1);
    expect(failed).toBe(1);
    expect(rows[0].status).toBe('failed');
  });
});
