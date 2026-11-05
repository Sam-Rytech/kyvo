import { describe, expect, it } from 'vitest';
import { makeLinkCode, readLinkCode, webhookSecret } from '@/lib/auth/crypto';
import { buildNotifications } from '@/lib/engines/notify';
import type { CachedEvent } from '@/lib/engines/subscriptions';

let id = 0;
const ev = (type: string, merchant: string | null, date: string, fields: Record<string, unknown> = {}): CachedEvent => ({ type, merchant, eventDate: date, blobId: `blob-${++id}`, sentence: `${type} ${date}`, event: { cur: 'USD', name: merchant, ...fields } });

const claude = () => [
  ev('decline', 'anthropic', '2026-08-18', { amt: 20, card: '1234', name: 'Anthropic' }),
  ev('charge', 'anthropic', '2026-08-18', { amt: 20, card: '1234', name: 'Anthropic' }),
  ev('charge', 'anthropic', '2026-09-18', { amt: 20, card: '1234' }),
  ev('charge', 'anthropic', '2026-10-18', { amt: 21.5, card: '1234' }),
];

const build = (events: CachedEvent[], asOf: string, rate: number | null = 1345) => buildNotifications({ events, homeCurrency: 'NGN', asOf, rate });
const byKey = (list: ReturnType<typeof build>, prefix: string) => list.filter((n) => n.key.startsWith(prefix));

describe('daily digest', () => {
  it('leads with what to fund, in local currency', () => {
    const [digest] = byKey(build(claude(), '2026-11-05'), 'digest:');
    expect(digest.key).toBe('digest:2026-11-05');
    expect(digest.text).toContain('Fund $22.58 by 16 Nov');
    expect(digest.text).toContain('≈ ₦30,370');
    expect(digest.text).toContain('Anthropic');
  });

  it('leaves out the local amount when the rate is unavailable, rather than guessing', () => {
    const [digest] = byKey(build(claude(), '2026-11-05', null), 'digest:');
    expect(digest.text).toContain('Fund $22.58');
    expect(digest.text).not.toContain('≈');
  });

  it('stays quiet when there is nothing to say', () => {
    expect(build([], '2026-11-05')).toEqual([]);
  });

  it('includes trials ending within a week, not distant ones', () => {
    const soon = byKey(build([...claude(), ev('trial_start', 'gitlab', '2026-10-16', { endsAt: '2026-11-10' })], '2026-11-05'), 'digest:')[0];
    expect(soon.text).toContain('gitlab');
    const far = byKey(build([...claude(), ev('trial_start', 'gitlab', '2026-10-16', { endsAt: '2026-12-30' })], '2026-11-05'), 'digest:')[0];
    expect(far.text).not.toContain('gitlab');
  });

  it('includes who still owes on a family plan', () => {
    const plan = ev('family_plan', null, '2026-11-01', { pid: 'p1', merchant: 'Netflix', firstDue: '2026-11-03', members: [{ id: 'm1', name: 'Ada', address: `0x${'a'.repeat(64)}`, share: 4.5 }] });
    const [digest] = byKey(build([plan], '2026-11-05'), 'digest:');
    expect(digest.text).toContain('Ada');
    expect(digest.text).toContain('$4.50');
    expect(digest.text).toContain('2 days late');
  });

  it('escapes anything that could break Telegram formatting', () => {
    const [digest] = byKey(build([ev('charge', 'a<b>&c', '2026-10-20', { amt: 5, name: 'A<b>&C' })], '2026-11-05'), 'digest:');
    expect(digest.text).toContain('A&lt;b&gt;&amp;C');
    expect(digest.text).not.toContain('A<b>');
  });
});

describe('decline guard alerts', () => {
  it('fires inside 48 hours, once per charge, with the amount to fund', () => {
    const list = byKey(build(claude(), '2026-11-17'), 'guard:');
    expect(list).toHaveLength(1);
    expect(list[0].key).toBe('guard:anthropic:2026-11-18');
    expect(list[0].text).toContain('$21.50');
    expect(list[0].text).toContain('≈ ₦');
  });

  it('stays out of the way two weeks before', () => {
    expect(byKey(build(claude(), '2026-11-05'), 'guard:')).toHaveLength(0);
  });

  it('uses the real shortfall when the balance is known', () => {
    const list = byKey(build([...claude(), ev('card_balance', null, '2026-11-01', { card: '1234', amt: 5 })], '2026-11-17'), 'guard:');
    expect(list[0].text).toContain('$16.50');
    expect(list[0].text).toContain('short');
  });
});

describe('trial alerts', () => {
  const trial = () => ev('trial_start', 'gitlab', '2026-10-16', { endsAt: '2026-11-15', name: 'GitLab' });

  it('fires 3 days and 1 day before, with distinct keys', () => {
    expect(byKey(build([trial()], '2026-11-12'), 'trial:')[0].key).toBe('trial:gitlab:3');
    expect(byKey(build([trial()], '2026-11-14'), 'trial:')[0].key).toBe('trial:gitlab:1');
    expect(byKey(build([trial()], '2026-11-13'), 'trial:')).toHaveLength(0);
  });

  it('reminds you why you started it, if known', () => {
    const list = byKey(build([ev('trial_start', 'gitlab', '2026-10-16', { endsAt: '2026-11-15', name: 'GitLab', reason: 'to test a build' })], '2026-11-12'), 'trial:');
    expect(list[0].text).toContain('to test a build');
  });
});

describe('promise alerts', () => {
  const promise = () => ev('promise', 'gitlab', '2026-11-01', { pid: 'p1', text: 'Cancel GitLab', status: 'open' });

  it('resurfaces once a week until done', () => {
    expect(byKey(build([promise()], '2026-11-05'), 'promise:')).toHaveLength(0);
    expect(byKey(build([promise()], '2026-11-08'), 'promise:')[0].key).toBe('promise:p1:w1');
    expect(byKey(build([promise()], '2026-11-15'), 'promise:')[0].key).toBe('promise:p1:w2');
  });

  it('stops once kept', () => {
    const done = ev('promise', 'gitlab', '2026-11-07', { pid: 'p1', text: 'Cancel GitLab', status: 'done' });
    expect(byKey(build([promise(), done], '2026-11-15'), 'promise:')).toHaveLength(0);
  });
});

describe('family alerts', () => {
  it('flags a member once when they first go late', () => {
    const plan = ev('family_plan', null, '2026-11-01', { pid: 'p1', merchant: 'Netflix', firstDue: '2026-11-03', members: [{ id: 'm1', name: 'Ada', address: `0x${'a'.repeat(64)}`, share: 4.5 }] });
    const [alert] = byKey(build([plan], '2026-11-05'), 'family:');
    expect(alert.key).toBe('family:p1:m1:2026-11-03');
    expect(alert.text).toContain('Ada');
    expect(alert.text).toContain('Hi Ada');
  });
});

describe('Telegram link codes', () => {
  const ROOT = 'a'.repeat(64);

  it('round-trips, and fits Telegram\'s limits', () => {
    const code = makeLinkCode('7604856287b9c3e7', ROOT, 1_000_000);
    expect(code.length).toBeLessThanOrEqual(64);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(readLinkCode(code, ROOT, 1_000_000)).toBe('7604856287b9c3e7');
  });

  it('reads back every code, including signatures that contain underscores', () => {
    let withUnderscore = 0;
    for (let i = 0; i < 300; i++) {
      const userId = (0x7604856287b9 + i).toString(16).padStart(16, '0');
      const code = makeLinkCode(userId, ROOT, 1_000_000 + i);
      if (code.split('_').length > 3) withUnderscore++;
      expect(readLinkCode(code, ROOT, 1_000_000 + i)).toBe(userId);
    }
    expect(withUnderscore).toBeGreaterThan(0);
  });

  it('expires, and refuses a forged or wrong-key code', () => {
    const code = makeLinkCode('u1', ROOT, 1_000_000);
    expect(readLinkCode(code, ROOT, 1_000_000 + 60 * 60 * 1000 + 1)).toBeNull();
    expect(readLinkCode(code, 'b'.repeat(64), 1_000_000)).toBeNull();
    expect(readLinkCode(code.replace('u1', 'u2'), ROOT, 1_000_000)).toBeNull();
    expect(readLinkCode('junk', ROOT)).toBeNull();
    expect(readLinkCode('', ROOT)).toBeNull();
  });

  it('derives a stable webhook secret in Telegram\'s allowed characters', () => {
    expect(webhookSecret(ROOT)).toBe(webhookSecret(ROOT));
    expect(webhookSecret(ROOT)).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
    expect(webhookSecret(ROOT)).not.toBe(webhookSecret('b'.repeat(64)));
  });
});
