import { describe, expect, it } from 'vitest';
import { decodeEnvelope, encodeEnvelope, type MemoryEvent } from '@/lib/memory/envelope';
import { batchKey, eventKey, merchantSlug, namespaces, userHash } from '@/lib/memory/namespaces';

const charge: MemoryEvent = { v: 1, t: 'charge', m: 'netflix', amt: 17.99, cur: 'USD', d: '2026-11-03', card: 'grey-1', src: 'gmail', h: 'abc' };

describe('envelope', () => {
  it('round-trips the sentence and the exact event', () => {
    const text = encodeEnvelope('Netflix charged $17.99 on Nov 3.', charge);
    expect(decodeEnvelope(text)).toEqual({ sentence: 'Netflix charged $17.99 on Nov 3.', event: charge });
  });

  it('survives text in the event that looks like the tag', () => {
    const event: MemoryEvent = { v: 1, t: 'promise', note: 'cancel #ky soon' };
    expect(decodeEnvelope(encodeEnvelope('A promise.', event))?.event).toEqual(event);
  });

  it.each([
    ['no tag', 'just a sentence'],
    ['broken JSON', 'a sentence #ky {not json'],
    ['wrong version', 'a sentence #ky {"v":2,"t":"charge"}'],
    ['missing type', 'a sentence #ky {"v":1}'],
    ['null', 'a sentence #ky null'],
  ])('ignores a line with %s', (_name, text) => {
    expect(decodeEnvelope(text)).toBeNull();
  });

  it('refuses a sentence that would break decoding', () => {
    expect(() => encodeEnvelope('a sentence #ky here', charge)).toThrow();
  });
});

describe('namespaces', () => {
  it('hides the subject and depends on the salt', () => {
    const hash = userHash('google-sub-123', 'salt-a');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain('google');
    expect(hash).not.toBe(userHash('google-sub-123', 'salt-b'));
    expect(hash).toBe(userHash('google-sub-123', 'salt-a'));
  });

  it('builds the documented names', () => {
    expect(namespaces.profile('u1')).toBe('ky:u1:profile');
    expect(namespaces.merchant('u1', 'Netflix')).toBe('ky:u1:m:netflix');
    expect(namespaces.merchant('u1', 'AWS Cloud (Hosting)')).toBe('ky:u1:m:aws-cloud-hosting');
    expect(namespaces.forecasts('u1').startsWith(namespaces.prefix('u1'))).toBe(true);
  });

  it('rejects a merchant with no usable slug', () => {
    expect(() => merchantSlug('!!!')).toThrow();
  });
});

describe('idempotency keys', () => {
  const base = { userId: 'u1', type: 'charge', merchant: 'netflix', date: '2026-11-03', amount: 17.99 };

  it('is stable for the same event and differs for any changed field', () => {
    expect(eventKey(base)).toBe(eventKey({ ...base }));
    expect(eventKey(base)).not.toBe(eventKey({ ...base, amount: 15.49 }));
    expect(eventKey(base)).not.toBe(eventKey({ ...base, date: '2026-12-03' }));
    expect(eventKey(base)).not.toBe(eventKey({ ...base, userId: 'u2' }));
  });

  it('gives a batch the same key whatever order its members are in', () => {
    expect(batchKey(['a', 'b'])).toBe(batchKey(['b', 'a']));
    expect(batchKey(['a', 'b'])).not.toBe(batchKey(['a', 'c']));
  });
});
