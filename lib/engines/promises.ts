// Things the user said they'd do (architecture §7.4). Memory is append-only, so resolving
// a promise is a newer event with the same ID.
import { diffDays } from './dates';
import type { CachedEvent } from './subscriptions';

const RESURFACE_AFTER_DAYS = 7;

const str = (value: unknown) => (typeof value === 'string' ? value : null);

export type PromiseState = {
  id: string;
  text: string;
  merchant: string | null;
  madeOn: string | null;
  ageDays: number | null;
  status: 'open' | 'done';
  resurface: boolean;
  blobId: string;
};

export function promiseStates(events: CachedEvent[], asOf: string): PromiseState[] {
  const groups = new Map<string, CachedEvent[]>();
  for (const e of events) {
    if (e.type !== 'promise') continue;
    const id = str(e.event.pid) ?? str(e.event.text) ?? e.blobId;
    groups.set(id, [...(groups.get(id) ?? []), e]);
  }

  const states = [...groups.entries()].map(([id, list]): PromiseState => {
    const sorted = [...list].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''));
    const latest = sorted.at(-1) as CachedEvent;
    const madeOn = sorted[0].eventDate;
    const ageDays = madeOn ? diffDays(asOf, madeOn) : null;
    const status = latest.event.status === 'done' ? 'done' : 'open';
    return {
      id,
      text: str(latest.event.text) ?? latest.sentence,
      merchant: latest.merchant,
      madeOn,
      ageDays,
      status,
      resurface: status === 'open' && ageDays !== null && ageDays >= RESURFACE_AFTER_DAYS,
      blobId: latest.blobId,
    };
  });
  return states.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (b.madeOn ?? '').localeCompare(a.madeOn ?? ''));
}
