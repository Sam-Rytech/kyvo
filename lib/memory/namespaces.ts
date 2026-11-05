import { createHash } from 'node:crypto';

// Namespaces are derived on the server from the authenticated user, never taken
// from a request, and hold no personal data (architecture §6.1, §9).

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function userHash(googleSub: string, salt: string): string {
  if (!googleSub || !salt) throw new Error('userHash needs a subject and a salt');
  return sha256(googleSub + salt).slice(0, 16);
}

export function merchantSlug(merchant: string): string {
  const slug = merchant
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`Merchant has no usable slug: ${merchant}`);
  return slug;
}

export const namespaces = {
  prefix: (u: string) => `ky:${u}:`,
  profile: (u: string) => `ky:${u}:profile`,
  merchant: (u: string, merchant: string) => `ky:${u}:m:${merchantSlug(merchant)}`,
  trials: (u: string) => `ky:${u}:trials`,
  cards: (u: string) => `ky:${u}:cards`,
  promises: (u: string) => `ky:${u}:promises`,
  /** One namespace per month, so forecasts can never pile up past the recall cap. */
  forecasts: (u: string, month: string) => `ky:${u}:forecasts:${month}`,
  family: (u: string) => `ky:${u}:family`,
  /** Payments by year, so they can never pile up past the recall cap. */
  familyPayments: (u: string, year: string) => `ky:${u}:family:${year}`,
};

/** sha256(userId + eventType + merchant + date + amount), per architecture §5.3 */
export function eventKey(parts: { userId: string; type: string; merchant?: string; date?: string; amount?: number }): string {
  const { userId, type, merchant = '', date = '', amount = '' } = parts;
  return sha256([userId, type, merchant, date, amount].join('|'));
}

/** rememberBulk takes one key per batch, so a batch's key comes from its members. */
export function batchKey(itemKeys: string[]): string {
  return sha256([...itemKeys].sort().join('|'));
}
