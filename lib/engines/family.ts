// Family-plan splits (architecture §7.5). Members pay the owner's vault in USDC on Sui. A payment
// counts when its sender, amount and timing all match, and each one is remembered with its lateness.
import type { VaultTransaction } from '@/lib/chain/usdc';
import { shortDate, usd } from '@/lib/format';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces, sha256 } from '@/lib/memory/namespaces';
import { addDays, diffDays, nextMonth, roundCents } from './dates';
import type { CachedEvent } from './subscriptions';

const AMOUNT_TOLERANCE = 0.01;
/** A payment can arrive this long before its due date and still count for it. */
const EARLY_WINDOW_DAYS = 15;
/** Close enough to the next due date that a paid member is reminded again. */
const REMIND_AHEAD_DAYS = 7;

type StoredMember = { id: string; name: string; address: string; share: number };

export type MemberState = StoredMember & {
  status: 'paid' | 'due' | 'late';
  /** The oldest date still unpaid, which may be in the future */
  due: string;
  daysLate: number;
  owed: number;
  paidOn: string | null;
  digest: string | null;
  paidCount: number;
  lateCount: number;
  lastLateDays: number | null;
  /** Ready to forward. Its tone comes from this member's history. Null once they've paid. */
  reminder: string | null;
  unpaid: string[];
};

export type PlanState = {
  id: string;
  merchant: string;
  firstDue: string;
  createdOn: string;
  members: MemberState[];
  knownDigests: string[];
  blobIds: string[];
};

const byDate = (a: CachedEvent, b: CachedEvent) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || a.blobId.localeCompare(b.blobId);

/** Monthly due dates from the first, through the next one after asOf. Short months are clamped. */
function dueDates(firstDue: string, asOf: string): string[] {
  const day = Number(firstDue.slice(8, 10));
  const dates: string[] = [];
  for (let month = firstDue.slice(0, 7); ; month = nextMonth(month)) {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const due = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    dates.push(due);
    if (due > asOf) return dates;
  }
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function reminderFor(member: StoredMember, merchant: string, m: Pick<MemberState, 'status' | 'due' | 'daysLate' | 'owed' | 'paidCount' | 'lateCount' | 'lastLateDays'>, vault: string | undefined, now: Date): string {
  const opening = m.status === 'late' ? `Hi ${member.name}, your ${usd(m.owed)} for ${merchant} is ${plural(m.daysLate, 'day')} overdue.` : `Hi ${member.name}, your ${usd(m.owed)} share of ${merchant} is due ${shortDate(m.due, now)}.`;
  const how = vault ? ` Send USDC on Sui to ${vault}.` : ' Send USDC on Sui to the plan owner.';
  let tone = '';
  if (m.status !== 'late' && m.lastLateDays) tone = ` It came ${plural(m.lastLateDays, 'day')} late last time, so this is an early nudge.`;
  else if (m.status !== 'late' && m.paidCount >= 2 && m.lateCount === 0) tone = ' Thanks for always paying on time.';
  return `${opening}${how}${tone}`;
}

export function planStates(events: CachedEvent[], asOf: string, vault?: string): PlanState[] {
  const planEvents = new Map<string, CachedEvent[]>();
  for (const e of events) {
    if (e.type === 'family_plan' && typeof e.event.pid === 'string') planEvents.set(e.event.pid, [...(planEvents.get(e.event.pid) ?? []), e]);
  }
  const now = new Date(`${asOf}T00:00:00Z`);

  return [...planEvents.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]): PlanState => {
      const sorted = [...list].sort(byDate);
      const latest = sorted.at(-1) as CachedEvent;
      const merchant = String(latest.event.merchant ?? 'Shared plan');
      const firstDue = String(latest.event.firstDue);
      const dues = dueDates(firstDue, asOf);
      const payments = events.filter((e) => e.type === 'family_payment' && e.event.pid === id).sort(byDate);

      const members = ((latest.event.members ?? []) as StoredMember[]).map((member): MemberState => {
        const mine = payments.filter((p) => p.event.member === member.id);
        const paidDues = new Set(mine.map((p) => String(p.event.due)));
        const unpaid = dues.filter((due) => !paidDues.has(due));
        const due = unpaid[0] ?? addDays(dues.at(-1) as string, 30);
        const last = [...mine].sort((a, b) => String(a.event.due).localeCompare(String(b.event.due))).at(-1);
        const late = mine.filter((p) => Number(p.event.lateDays) > 0).length;
        const lastLateDays = last ? Number(last.event.lateDays) : null;
        const daysLate = due < asOf ? diffDays(asOf, due) : 0;
        const overdueCycles = unpaid.filter((d) => d <= asOf).length;
        const status: MemberState['status'] = daysLate > 0 ? 'late' : last && diffDays(due, asOf) > REMIND_AHEAD_DAYS ? 'paid' : 'due';
        const owed = roundCents(member.share * Math.max(1, overdueCycles));
        const history = { status, due, daysLate, owed, paidCount: mine.length, lateCount: late, lastLateDays };
        return {
          ...member,
          ...history,
          paidOn: last ? String(last.event.paidOn) : null,
          digest: last ? String(last.event.digest) : null,
          reminder: status === 'paid' ? null : reminderFor(member, merchant, history, vault, now),
          unpaid,
        };
      });

      return {
        id,
        merchant,
        firstDue,
        createdOn: sorted[0].eventDate ?? asOf,
        members,
        knownDigests: payments.map((p) => String(p.event.digest)),
        blobIds: sorted.map((e) => e.blobId),
      };
    });
}

export type MatchedPayment = { planId: string; merchant: string; memberId: string; memberName: string; amount: number; digest: string; paidOn: string; due: string; lateDays: number };
export type UnmatchedPayment = { memberName: string; amount: number; digest: string; reason: 'amount' | 'early' };

/** Sender, amount within 1%, and a date window. Anything else stays unpaid: a wrong "paid" is worse. */
export function matchPayments(plans: PlanState[], transactions: VaultTransaction[]): { matched: MatchedPayment[]; unmatched: UnmatchedPayment[] } {
  const matched: MatchedPayment[] = [];
  const unmatched: UnmatchedPayment[] = [];
  const used = new Set(plans.flatMap((plan) => plan.knownDigests));
  const taken = new Map<string, string[]>();

  const ordered = [...transactions].sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? '') || a.digest.localeCompare(b.digest));
  for (const tx of ordered) {
    if (!tx.success || tx.usdcReceived <= 0 || !tx.sender || !tx.timestamp || used.has(tx.digest)) continue;
    const sender = tx.sender.toLowerCase();
    const paidOn = tx.timestamp.slice(0, 10);

    let outcome: UnmatchedPayment | null = null;
    for (const plan of plans) {
      if (paidOn < plan.createdOn) continue;
      const member = plan.members.find((m) => m.address.toLowerCase() === sender);
      if (!member) continue;
      if (Math.abs(tx.usdcReceived - member.share) > member.share * AMOUNT_TOLERANCE + 1e-9) {
        outcome = { memberName: member.name, amount: tx.usdcReceived, digest: tx.digest, reason: 'amount' };
        continue;
      }
      const key = `${plan.id}:${member.id}`;
      const already = taken.get(key) ?? [];
      const due = member.unpaid.find((d) => !already.includes(d));
      if (!due || paidOn < addDays(due, -EARLY_WINDOW_DAYS)) {
        outcome = { memberName: member.name, amount: tx.usdcReceived, digest: tx.digest, reason: 'early' };
        continue;
      }
      taken.set(key, [...already, due]);
      used.add(tx.digest);
      matched.push({ planId: plan.id, merchant: plan.merchant, memberId: member.id, memberName: member.name, amount: tx.usdcReceived, digest: tx.digest, paidOn, due, lateDays: Math.max(0, diffDays(paidOn, due)) });
      outcome = null;
      break;
    }
    if (outcome) unmatched.push(outcome);
  }
  return { matched, unmatched };
}

export function paymentMemories(userId: string, payments: MatchedPayment[]) {
  return payments.map((p) => {
    const h = eventKey({ userId, type: 'family_payment', merchant: p.digest });
    const timing = p.lateDays > 0 ? `${plural(p.lateDays, 'day')} late` : 'on time';
    return {
      userId,
      namespace: namespaces.familyPayments(userId, p.paidOn.slice(0, 4)),
      idempotencyKey: h,
      text: encodeEnvelope(`${p.memberName} paid USD ${p.amount.toFixed(2)} for ${p.merchant} on ${p.paidOn}, ${timing}. Sui transaction ${p.digest}.`, {
        v: 1,
        t: 'family_payment',
        pid: p.planId,
        member: p.memberId,
        memberName: p.memberName,
        digest: p.digest,
        amt: p.amount,
        cur: 'USD',
        due: p.due,
        paidOn: p.paidOn,
        lateDays: p.lateDays,
        d: p.paidOn,
        src: 'sui',
        h,
      }),
    };
  });
}

export type PlanInput = { merchant: string; firstDue: string; members: { name: string; address: string; share: number }[] };

export function planMemory(userId: string, input: PlanInput, today: string) {
  const pid = sha256(`${userId}|${input.merchant}|${input.firstDue}`).slice(0, 12);
  const members = input.members.map((m) => ({ id: sha256(m.address.toLowerCase()).slice(0, 10), name: m.name, address: m.address.toLowerCase(), share: m.share }));
  const h = eventKey({ userId, type: 'family_plan', merchant: sha256(JSON.stringify([pid, members])) });
  const names = members.map((m) => `${m.name} (${usd(m.share)})`).join(', ');
  return {
    userId,
    namespace: namespaces.family(userId),
    idempotencyKey: h,
    text: encodeEnvelope(`Shared plan for ${input.merchant}, first due ${input.firstDue}: ${names}.`, { v: 1, t: 'family_plan', pid, merchant: input.merchant, firstDue: input.firstDue, members, d: today, src: 'user', h }),
  };
}
