import { describe, expect, it } from 'vitest';
import type { VaultTransaction } from '@/lib/chain/usdc';
import { matchPayments, paymentMemories, planMemory, planStates, type PlanInput } from '@/lib/engines/family';
import type { CachedEvent } from '@/lib/engines/subscriptions';
import { vaultRunway } from '@/lib/engines/vault';
import { decodeEnvelope } from '@/lib/memory/envelope';

const ADA = `0x${'a'.repeat(64)}`;
const BEN = `0x${'b'.repeat(64)}`;
const STRANGER = `0x${'c'.repeat(64)}`;

let id = 0;
const ev = (type: string, date: string, fields: Record<string, unknown>): CachedEvent => ({ type, merchant: (fields.m as string) ?? null, eventDate: date, blobId: `blob-${++id}`, sentence: `${type} ${date}`, event: fields });

const planEvent = (over: Record<string, unknown> = {}) =>
  ev('family_plan', '2026-11-01', {
    pid: 'p1',
    merchant: 'Netflix',
    firstDue: '2026-11-10',
    members: [
      { id: 'm1', name: 'Ada', address: ADA, share: 4.5 },
      { id: 'm2', name: 'Ben', address: BEN, share: 4.5 },
    ],
    ...over,
  });

const payment = (member: string, due: string, paidOn: string, lateDays: number, digest = `d-${member}-${due}`) =>
  ev('family_payment', paidOn, { pid: 'p1', member, due, paidOn, lateDays, digest, amt: 4.5 });

const tx = (over: Partial<VaultTransaction> = {}): VaultTransaction => ({ digest: 'tx1', sender: ADA, timestamp: '2026-11-08T10:00:00.000Z', success: true, usdcReceived: 4.5, ...over });

describe('planStates', () => {
  it('shows who owes what before the due date', () => {
    const [plan] = planStates([planEvent()], '2026-11-05');
    expect(plan).toMatchObject({ id: 'p1', merchant: 'Netflix' });
    expect(plan.members.map((m) => [m.name, m.status, m.due])).toEqual([
      ['Ada', 'due', '2026-11-10'],
      ['Ben', 'due', '2026-11-10'],
    ]);
  });

  it('marks a member paid once a payment for this cycle exists', () => {
    const [plan] = planStates([planEvent(), payment('m1', '2026-11-10', '2026-11-08', 0)], '2026-11-08');
    expect(plan.members[0]).toMatchObject({ status: 'paid', paidOn: '2026-11-08', digest: 'd-m1-2026-11-10', lastLateDays: 0 });
    expect(plan.members[1].status).toBe('due');
  });

  it('goes late the day after the due date, and counts the days', () => {
    const [plan] = planStates([planEvent()], '2026-11-13');
    expect(plan.members[0]).toMatchObject({ status: 'late', daysLate: 3, due: '2026-11-10' });
  });

  it('adds up every unpaid cycle', () => {
    const [plan] = planStates([planEvent()], '2026-12-15');
    expect(plan.members[0]).toMatchObject({ due: '2026-11-10', owed: 9 });
  });

  it('remembers lateness across cycles', () => {
    const events = [planEvent(), payment('m1', '2026-11-10', '2026-11-12', 2), payment('m1', '2026-12-10', '2026-12-10', 0), payment('m1', '2027-01-10', '2027-01-15', 5)];
    const [plan] = planStates(events, '2027-01-16');
    expect(plan.members[0]).toMatchObject({ paidCount: 3, lateCount: 2, lastLateDays: 5 });
  });

  it('the newest plan event wins, so a plan can be changed', () => {
    const changed = ev('family_plan', '2026-11-03', { pid: 'p1', merchant: 'Netflix', firstDue: '2026-11-10', members: [{ id: 'm1', name: 'Ada', address: ADA, share: 6 }] });
    const [plan] = planStates([planEvent(), changed], '2026-11-05');
    expect(plan.members).toHaveLength(1);
    expect(plan.members[0].share).toBe(6);
  });

  it('gives the same answer whatever order events arrive in', () => {
    const events = [planEvent(), payment('m1', '2026-11-10', '2026-11-08', 0)];
    expect(planStates([...events].reverse(), '2026-11-09')).toEqual(planStates(events, '2026-11-09'));
  });
});

describe('reminders', () => {
  it('is friendly by default and says how to pay', () => {
    const [plan] = planStates([planEvent()], '2026-11-05');
    expect(plan.members[0].reminder).toContain('Hi Ada');
    expect(plan.members[0].reminder).toContain('$4.50');
    expect(plan.members[0].reminder).toContain('Netflix');
    expect(plan.members[0].reminder).toContain('USDC on Sui');
  });

  it('changes tone after a late payment', () => {
    const events = [planEvent(), payment('m1', '2026-11-10', '2026-11-12', 2)];
    const [plan] = planStates(events, '2026-12-05');
    expect(plan.members[0].reminder).toContain('2 days late last time');
  });

  it('thanks someone who always pays on time', () => {
    const events = [planEvent(), payment('m1', '2026-11-10', '2026-11-09', 0), payment('m1', '2026-12-10', '2026-12-08', 0)];
    const [plan] = planStates(events, '2027-01-05');
    expect(plan.members[0].reminder).toContain('Thanks for always paying on time');
  });

  it('says how overdue it is', () => {
    const [plan] = planStates([planEvent()], '2026-11-13');
    expect(plan.members[0].reminder).toContain('3 days overdue');
  });

  it('sends nothing to someone who has paid', () => {
    const [plan] = planStates([planEvent(), payment('m1', '2026-11-10', '2026-11-08', 0)], '2026-11-08');
    expect(plan.members[0].reminder).toBeNull();
  });
});

describe('matchPayments', () => {
  const plans = (asOf = '2026-11-08', extra: CachedEvent[] = []) => planStates([planEvent(), ...extra], asOf);

  it('matches sender and amount, and records lateness', () => {
    const { matched } = matchPayments(plans('2026-11-12'), [tx({ timestamp: '2026-11-12T09:00:00.000Z' })]);
    expect(matched).toEqual([{ planId: 'p1', merchant: 'Netflix', memberId: 'm1', memberName: 'Ada', amount: 4.5, digest: 'tx1', paidOn: '2026-11-12', due: '2026-11-10', lateDays: 2 }]);
  });

  it('counts an early payment as on time', () => {
    expect(matchPayments(plans(), [tx()]).matched[0].lateDays).toBe(0);
  });

  it('accepts an amount within 1%, and refuses one outside', () => {
    expect(matchPayments(plans(), [tx({ usdcReceived: 4.46 })]).matched).toHaveLength(1);
    expect(matchPayments(plans(), [tx({ usdcReceived: 4.54 })]).matched).toHaveLength(1);
    const { matched, unmatched } = matchPayments(plans(), [tx({ usdcReceived: 4.4 })]);
    expect(matched).toHaveLength(0);
    expect(unmatched[0]).toMatchObject({ memberName: 'Ada', amount: 4.4, digest: 'tx1', reason: 'amount' });
  });

  it('works at the smallest real test amount', () => {
    const small = planStates([planEvent({ members: [{ id: 'm1', name: 'Ada', address: ADA, share: 0.01 }] })], '2026-11-08');
    expect(matchPayments(small, [tx({ usdcReceived: 0.01 })]).matched).toHaveLength(1);
  });

  it('ignores strangers, failed transactions and outgoing money', () => {
    expect(matchPayments(plans(), [tx({ sender: STRANGER })])).toEqual({ matched: [], unmatched: [] });
    expect(matchPayments(plans(), [tx({ success: false })])).toEqual({ matched: [], unmatched: [] });
    expect(matchPayments(plans(), [tx({ usdcReceived: 0 })])).toEqual({ matched: [], unmatched: [] });
  });

  it('matches addresses regardless of letter case', () => {
    expect(matchPayments(plans(), [tx({ sender: ADA.toUpperCase().replace('0X', '0x') })]).matched).toHaveLength(1);
  });

  it('does not count money sent before the plan existed', () => {
    expect(matchPayments(plans(), [tx({ timestamp: '2026-10-20T10:00:00.000Z' })]).matched).toHaveLength(0);
  });

  it('never uses a transaction twice', () => {
    const paid = plans('2026-11-08', [payment('m1', '2026-11-10', '2026-11-08', 0, 'tx1')]);
    expect(matchPayments(paid, [tx()]).matched).toHaveLength(0);
  });

  it('pays the oldest unpaid cycle first', () => {
    const { matched } = matchPayments(plans('2026-12-15'), [tx({ digest: 'a', timestamp: '2026-12-14T10:00:00.000Z' }), tx({ digest: 'b', timestamp: '2026-12-15T10:00:00.000Z' })]);
    expect(matched.map((m) => [m.digest, m.due, m.lateDays])).toEqual([
      ['a', '2026-11-10', 34],
      ['b', '2026-12-10', 5],
    ]);
  });

  it('holds a payment made long before anything is due', () => {
    const later = planStates([planEvent({ firstDue: '2027-03-10' })], '2026-11-08');
    const { matched, unmatched } = matchPayments(later, [tx()]);
    expect(matched).toHaveLength(0);
    expect(unmatched[0].reason).toBe('early');
  });

  it('handles two members paying in one check', () => {
    const { matched } = matchPayments(plans(), [tx(), tx({ digest: 'tx2', sender: BEN })]);
    expect(matched.map((m) => m.memberName)).toEqual(['Ada', 'Ben']);
  });
});

describe('memories', () => {
  it('writes a payment to a yearly namespace, with the digest and lateness', () => {
    const { matched } = matchPayments(planStates([planEvent()], '2026-11-12'), [tx({ timestamp: '2026-11-12T09:00:00.000Z' })]);
    const [item] = paymentMemories('u1', matched);
    expect(item.namespace).toBe('ky:u1:family:2026');
    const decoded = decodeEnvelope(item.text);
    expect(decoded?.event).toMatchObject({ t: 'family_payment', pid: 'p1', member: 'm1', digest: 'tx1', lateDays: 2, due: '2026-11-10', paidOn: '2026-11-12', amt: 4.5 });
    expect(decoded?.sentence).toContain('2 days late');
    expect(decoded?.event.m).toBeUndefined();
  });

  it('gives a transaction one stable key', () => {
    const { matched } = matchPayments(planStates([planEvent()], '2026-11-08'), [tx()]);
    expect(paymentMemories('u1', matched)[0].idempotencyKey).toBe(paymentMemories('u1', matched)[0].idempotencyKey);
  });

  it('writes a plan that decodes back to itself', () => {
    const input: PlanInput = { merchant: 'Netflix', firstDue: '2026-11-10', members: [{ name: 'Ada', address: ADA, share: 4.5 }] };
    const item = planMemory('u1', input, '2026-11-01');
    expect(item.namespace).toBe('ky:u1:family');
    const event = decodeEnvelope(item.text)?.event;
    expect(event).toMatchObject({ t: 'family_plan', merchant: 'Netflix', firstDue: '2026-11-10' });
    expect((event?.members as { address: string }[])[0].address).toBe(ADA);
  });
});

describe('vaultRunway', () => {
  const charges = [
    { type: 'charge', merchant: 'anthropic', eventDate: '2026-08-18', blobId: 'a', sentence: 's', event: { amt: 20, cur: 'USD' } },
    { type: 'charge', merchant: 'anthropic', eventDate: '2026-09-18', blobId: 'b', sentence: 's', event: { amt: 20, cur: 'USD' } },
    { type: 'charge', merchant: 'anthropic', eventDate: '2026-10-18', blobId: 'c', sentence: 's', event: { amt: 21.5, cur: 'USD' } },
  ] satisfies CachedEvent[];

  it('turns the balance into months, from what is really still billing', () => {
    const runway = vaultRunway(100, charges, 'NGN', '2026-11-05');
    expect(runway.monthlyBurn).toBeCloseTo((21.5 * 30) / 31, 2);
    expect(runway.months).toBeCloseTo(100 / ((21.5 * 30) / 31), 1);
  });

  it('is zero months with an empty vault', () => {
    expect(vaultRunway(0, charges, 'NGN', '2026-11-05').months).toBe(0);
  });

  it('says nothing when nothing is billing, rather than dividing by zero', () => {
    expect(vaultRunway(100, [], 'NGN', '2026-11-05')).toEqual({ balance: 100, monthlyBurn: 0, months: null });
  });
});
