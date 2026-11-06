// Trial countdowns (architecture §7.4). With no known end date, Kyvo asks instead of guessing.
import { diffDays } from './dates';
import type { CachedEvent } from './subscriptions';

const REMIND_ON_DAYS = new Set([3, 1]);
const PAID_TYPES = new Set(['charge', 'usage_bill']);

const str = (value: unknown) => (typeof value === 'string' ? value : null);
const num = (value: unknown) => (typeof value === 'number' ? value : null);

export type TrialState = {
  slug: string;
  name: string;
  startedOn: string | null;
  endsAt: string | null;
  daysLeft: number | null;
  status: 'active' | 'ended' | 'unknown';
  remind: boolean;
  converted: boolean;
  convertsTo: number | null;
  currency: string | null;
  reason: string | null;
  blobIds: string[];
};

const RANK = { active: 0, unknown: 1, ended: 2 };

export function trialStates(events: CachedEvent[], asOf: string): TrialState[] {
  const groups = new Map<string, CachedEvent[]>();
  for (const e of events) {
    if (e.type === 'trial_start' && e.merchant) groups.set(e.merchant, [...(groups.get(e.merchant) ?? []), e]);
  }

  const states = [...groups.entries()].map(([slug, unsorted]): TrialState => {
    const list = [...unsorted].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || (a.event.src === 'user' ? 1 : 0) - (b.event.src === 'user' ? 1 : 0) || a.blobId.localeCompare(b.blobId));
    // The newest stated value wins, so a date the user confirmed replaces a missing one.
    const newest = <T,>(pick: (e: CachedEvent) => T | null) => list.map(pick).filter((v): v is T => v !== null).at(-1) ?? null;
    const endsAt = newest((e) => str(e.event.endsAt));
    const daysLeft = endsAt ? diffDays(endsAt, asOf) : null;
    const status: TrialState['status'] = endsAt === null ? 'unknown' : (daysLeft as number) >= 0 ? 'active' : 'ended';
    const converted = endsAt !== null && events.some((e) => PAID_TYPES.has(e.type) && e.merchant === slug && (e.eventDate ?? '') >= endsAt);

    return {
      slug,
      name: newest((e) => str(e.event.name)) ?? slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      startedOn: list[0].eventDate,
      endsAt,
      daysLeft,
      status,
      remind: status === 'active' && REMIND_ON_DAYS.has(daysLeft as number),
      converted,
      convertsTo: newest((e) => num(e.event.convertsTo)),
      currency: newest((e) => str(e.event.cur)),
      reason: newest((e) => str(e.event.reason)),
      blobIds: list.map((e) => e.blobId),
    };
  });

  return states.sort((a, b) => RANK[a.status] - RANK[b.status] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || (b.endsAt ?? '').localeCompare(a.endsAt ?? '') || a.slug.localeCompare(b.slug));
}
