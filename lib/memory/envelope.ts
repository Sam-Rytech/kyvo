// One memory = one fact: a human sentence, then "#ky", then the exact JSON (architecture §6.2).
// The sentence is what semantic recall matches. The JSON is what rebuilds state.
const TAG = ' #ky ';

export type EventType =
  | 'profile'
  | 'charge'
  | 'trial_start'
  | 'decline'
  | 'price_change'
  | 'card_added'
  | 'card_removed'
  | 'usage_bill'
  | 'refund'
  | 'card_topup'
  | 'promise'
  | 'forecast'
  | 'forecast_result'
  | 'family_plan'
  | 'family_payment';

export type MemoryEvent = {
  v: 1;
  t: EventType;
  /** Merchant slug */
  m?: string;
  amt?: number;
  cur?: string;
  /** ISO date the event happened */
  d?: string;
  card?: string;
  /** gmail, seed or user; for forecast events: hindcast or live */
  src?: string;
  /** Idempotency hash */
  h?: string;
  [key: string]: unknown;
};

export function encodeEnvelope(sentence: string, event: MemoryEvent): string {
  if (sentence.includes(TAG.trim())) throw new Error('Envelope sentence must not contain the #ky tag');
  return `${sentence.trim()}${TAG}${JSON.stringify(event)}`;
}

/** Returns null for anything that doesn't parse: such a line is ignored, never guessed at. */
export function decodeEnvelope(text: string): { sentence: string; event: MemoryEvent } | null {
  const at = text.indexOf(TAG);
  if (at === -1) return null;
  try {
    const event = JSON.parse(text.slice(at + TAG.length));
    if (event === null || typeof event !== 'object' || event.v !== 1 || typeof event.t !== 'string') return null;
    return { sentence: text.slice(0, at), event };
  } catch {
    return null;
  }
}
