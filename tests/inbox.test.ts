import { describe, expect, it, vi } from 'vitest';
import { LlmQuotaError, normalizeMerchant, RawExtraction, toEvent, type ExtractedEvent } from '@/lib/inbox/extractor';
import { buildQuery, parseMessage, type GmailClient, type GmailMessage } from '@/lib/inbox/gmail';
import { scanBatch, type ScanStore } from '@/lib/inbox/scan';
import { cleanEmailText, htmlToText, looksLikeBilling, MAX_EMAIL_CHARS } from '@/lib/inbox/text';
import { eventToOutbox } from '@/lib/inbox/to-memory';
import { decodeEnvelope } from '@/lib/memory/envelope';
import { sha256 } from '@/lib/memory/namespaces';
import type { z } from 'zod';

const b64 = (s: string) => Buffer.from(s).toString('base64url');

describe('query', () => {
  it('asks for billing mail only and leaves out GitHub noise', () => {
    const q = buildQuery('1y');
    expect(q).toContain('newer_than:1y');
    expect(q).toContain('receipt OR invoice');
    expect(q).toContain('-from:notifications@github.com');
  });
});

describe('email text', () => {
  it('strips markup, links and invisible padding', () => {
    const html = '<html><head><style>a{}</style></head><body><p>Paid&nbsp;$20.00&#39;s</p><a href="https://x.y/t?token=abc">https://x.y/t?token=abc</a>͏​</body></html>';
    const text = cleanEmailText(htmlToText(html));
    expect(text).toContain("Paid $20.00's");
    expect(text).not.toContain('token');
    expect(text).not.toContain('͏');
    expect(text).not.toContain('style');
  });

  it('caps what reaches the LLM', () => {
    expect(cleanEmailText('x'.repeat(10_000)).length).toBe(MAX_EMAIL_CHARS);
  });

  it.each([
    ['Your receipt', 'Amount paid $20.00', true],
    ['Hello', 'Your payment was unsuccessful', true],
    ['Welcome', 'Your 30 day trial', true],
    ['Weekly newsletter', 'Nothing about money here', false],
  ])('billing signal for "%s"', (subject, body, expected) => {
    expect(looksLikeBilling(subject, body)).toBe(expected);
  });
});

describe('parseMessage', () => {
  const headers = [
    { name: 'From', value: 'Anthropic <invoice@stripe.com>' },
    { name: 'Subject', value: 'Your receipt' },
  ];

  it('prefers plain text and never reads attachments', () => {
    const plainBody = 'Receipt from Acme. Amount paid $20.00 on October 18.';
    const message = parseMessage({
      id: 'm1',
      internalDate: String(Date.UTC(2026, 9, 18)),
      payload: {
        headers,
        mimeType: 'multipart/mixed',
        parts: [
          { mimeType: 'application/pdf', filename: 'receipt.pdf', body: { data: b64('PDFDATA') } },
          { mimeType: 'text/html', body: { data: b64('<b>html body</b>') } },
          { mimeType: 'text/plain', body: { data: b64(plainBody) } },
        ],
      },
    });
    expect(message).toEqual({ id: 'm1', from: headers[0].value, subject: 'Your receipt', date: '2026-10-18', text: plainBody });
  });

  it('reads the HTML when the plain part is only a stub, as Paystack sends', () => {
    const message = parseMessage({
      id: 'm3',
      internalDate: '0',
      payload: {
        headers,
        mimeType: 'multipart/alternative',
        parts: [
          { mimeType: 'text/plain', body: { data: b64('none') } },
          { mimeType: 'text/html', body: { data: b64('<p>You paid $5.00 to Acme</p>') } },
        ],
      },
    });
    expect(message.text).toBe('You paid $5.00 to Acme');
  });

  it('keeps a short plain part when there is no HTML', () => {
    const message = parseMessage({ id: 'm4', internalDate: '0', payload: { headers, mimeType: 'text/plain', body: { data: b64('Paid $5') } } });
    expect(message.text).toBe('Paid $5');
  });

  it('falls back to HTML', () => {
    const message = parseMessage({ id: 'm2', internalDate: '0', payload: { headers, mimeType: 'text/html', body: { data: b64('<p>Paid $5</p>') } } });
    expect(message.text).toBe('Paid $5');
  });
});

const raw = (over: Partial<z.infer<typeof RawExtraction>>): z.infer<typeof RawExtraction> => ({
  kind: 'charge',
  confidence: 0.95,
  merchant: 'Anthropic',
  amount: 21.5,
  currency: 'usd',
  date: '2026-10-18',
  cardHint: '1234',
  reason: null,
  period: null,
  endsAt: null,
  convertsTo: null,
  fromAmount: null,
  toAmount: null,
  effective: null,
  provider: null,
  ...over,
});

describe('toEvent', () => {
  it('builds a typed event', () => {
    expect(toEvent(raw({}), '2026-10-18')).toEqual({ kind: 'charge', merchant: 'Anthropic', amount: 21.5, currency: 'USD', date: '2026-10-18', cardHint: '1234' });
  });

  it('discards low confidence and "none"', () => {
    expect(toEvent(raw({ confidence: 0.59 }), '2026-10-18')).toBeNull();
    expect(toEvent(raw({ confidence: 0.6 }), '2026-10-18')).not.toBeNull();
    expect(toEvent(raw({ kind: 'none' }), '2026-10-18')).toBeNull();
  });

  it('rejects a charge with no amount or merchant, rather than inventing one', () => {
    expect(toEvent(raw({ amount: null }), '2026-10-18')).toBeNull();
    expect(toEvent(raw({ amount: -5 }), '2026-10-18')).toBeNull();
    expect(toEvent(raw({ merchant: null }), '2026-10-18')).toBeNull();
  });

  it('falls back to the email date for a bad or missing date', () => {
    expect(toEvent(raw({ date: 'October 18' }), '2026-10-19')?.date).toBe('2026-10-19');
    expect(toEvent(raw({ date: null }), '2026-10-19')?.date).toBe('2026-10-19');
  });

  it.each([
    ['decline', { kind: 'decline', amount: 20 }],
    ['decline with no amount', { kind: 'decline', amount: null, currency: null }],
    ['usage_bill', { kind: 'usage_bill', amount: 4.51, period: 'Jul-Aug' }],
    ['refund', { kind: 'refund', amount: 4.51 }],
    ['card_added', { kind: 'card_added', amount: 1 }],
    ['trial_start', { kind: 'trial_start', amount: null, currency: null, endsAt: '2026-11-15' }],
    ['price_change', { kind: 'price_change', amount: null, fromAmount: 15.49, toAmount: 17.99 }],
    ['card_topup', { kind: 'card_topup', merchant: null, provider: 'Grey', amount: 50 }],
  ] as const)('accepts %s', (_name, over) => {
    expect(toEvent(raw(over as never), '2026-10-18')?.kind).toBe(over.kind);
  });

  it('drops bills in the home currency, even when the model is confident', () => {
    expect(toEvent(raw({ merchant: 'MSport', amount: 1000, currency: 'NGN' }), '2026-10-17', 'NGN')).toBeNull();
    expect(toEvent(raw({ kind: 'decline', currency: 'ngn' }), '2026-10-17', 'NGN')).toBeNull();
    expect(toEvent(raw({ currency: 'USD' }), '2026-10-17', 'NGN')).not.toBeNull();
    expect(toEvent(raw({ currency: 'EUR' }), '2026-10-17', 'NGN')).not.toBeNull();
  });

  it('keeps every bill for a user whose home currency is USD', () => {
    expect(toEvent(raw({ currency: 'USD' }), '2026-10-17', 'USD')).not.toBeNull();
  });

  it('removes legal suffixes from merchants', () => {
    expect(normalizeMerchant('Anthropic, PBC')).toBe('Anthropic');
    expect(normalizeMerchant('Vercel Inc.')).toBe('Vercel');
    expect(normalizeMerchant('InstaWP Inc')).toBe('InstaWP');
    expect(normalizeMerchant('Spotify')).toBe('Spotify');
  });
});

describe('eventToOutbox', () => {
  const charge: ExtractedEvent = { kind: 'charge', merchant: 'Anthropic', amount: 21.5, currency: 'USD', date: '2026-10-18', cardHint: '1234' };

  it('writes a decodable envelope to the merchant namespace, without the raw message ID', () => {
    const item = eventToOutbox('u1', charge, 'gmail-id-1');
    expect(item.namespace).toBe('ky:u1:m:anthropic');
    const decoded = decodeEnvelope(item.text);
    expect(decoded?.event).toMatchObject({ t: 'charge', m: 'anthropic', name: 'Anthropic', amt: 21.5, cur: 'USD', d: '2026-10-18', card: '1234', src: 'gmail', gm: sha256('gmail-id-1'), h: item.idempotencyKey });
    expect(item.text).not.toContain('gmail-id-1');
  });

  it('gives the same key when two emails describe one charge', () => {
    expect(eventToOutbox('u1', charge, 'receipt').idempotencyKey).toBe(eventToOutbox('u1', charge, 'invoice').idempotencyKey);
  });

  it('routes trials and top-ups to their own namespaces', () => {
    expect(eventToOutbox('u1', { kind: 'trial_start', merchant: 'GitLab', date: '2026-10-16' }, 'a').namespace).toBe('ky:u1:trials');
    expect(eventToOutbox('u1', { kind: 'card_topup', provider: 'Grey', amount: 50, currency: 'USD', date: '2026-10-16' }, 'b').namespace).toBe('ky:u1:cards');
  });
});

describe('scanBatch', () => {
  function harness(pages: { ids: string[]; nextPageToken: string | null }[], bodies: Record<string, Partial<GmailMessage>> = {}) {
    const state = { pageToken: null as string | null, done: false, seen: new Set<string>(), queued: [] as string[] };
    const store: ScanStore = {
      cursor: async () => ({ pageToken: state.pageToken, done: state.done }),
      saveCursor: async (_u, token, done) => {
        state.pageToken = token;
        state.done = done;
      },
      seen: async (_u, hashes) => new Set(hashes.filter((h) => state.seen.has(h))),
      markSeen: async (_u, hash) => void state.seen.add(hash),
      enqueue: async (items) => void state.queued.push(...items.map((i) => i.idempotencyKey)),
    };
    const getMessage = vi.fn(async (id: string): Promise<GmailMessage> => ({ id, from: 'x', subject: 'receipt', date: '2026-10-18', text: `Paid $${id.length}.00`, ...bodies[id] }));
    const gmail = {
      listMessages: async (_q: string, token?: string | null) => pages[token ? Number(token) : 0],
      getMessage,
    } as unknown as GmailClient;
    return { state, store, gmail, getMessage };
  }

  const extract = async (email: GmailMessage): Promise<ExtractedEvent> => ({ kind: 'charge', merchant: email.id, amount: 1, currency: 'USD', date: email.date });

  it('handles at most one batch per call and resumes without repeating work', async () => {
    const h = harness([{ ids: ['a', 'b', 'c'], nextPageToken: null }]);
    const first = await scanBatch({ ...h, extract }, 'u1', 2);
    expect(first).toMatchObject({ processed: 2, done: false });
    const second = await scanBatch({ ...h, extract }, 'u1', 2);
    expect(second).toMatchObject({ processed: 1, done: true });
    expect(h.getMessage).toHaveBeenCalledTimes(3);
    expect(h.state.queued).toHaveLength(3);
  });

  it('walks pages and saves its place', async () => {
    const h = harness([{ ids: ['a'], nextPageToken: '1' }, { ids: ['b'], nextPageToken: null }]);
    const result = await scanBatch({ ...h, extract }, 'u1', 5);
    expect(result).toMatchObject({ processed: 2, done: true });
    expect(h.state.done).toBe(true);
  });

  it('skips mail with no billing signal without spending LLM quota', async () => {
    const h = harness([{ ids: ['news'], nextPageToken: null }], { news: { subject: 'Newsletter', text: 'hello' } });
    const spy = vi.fn(extract);
    const result = await scanBatch({ ...h, extract: spy }, 'u1');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ skipped: 1, processed: 0, done: true });
    expect(h.state.seen.has(sha256('news'))).toBe(true);
  });

  it('pauses on quota and retries the same email next time', async () => {
    const h = harness([{ ids: ['a', 'b'], nextPageToken: null }]);
    let limited = true;
    const flaky = async (email: GmailMessage) => {
      if (email.id === 'b' && limited) {
        limited = false;
        throw new LlmQuotaError(30);
      }
      return extract(email);
    };
    const first = await scanBatch({ ...h, extract: flaky }, 'u1');
    expect(first).toMatchObject({ processed: 1, pausedForSeconds: 30, done: false });
    expect(h.state.seen.has(sha256('b'))).toBe(false);
    const second = await scanBatch({ ...h, extract: flaky }, 'u1');
    expect(second).toMatchObject({ processed: 1, done: true });
    expect(h.state.queued).toHaveLength(2);
  });

  it('marks a discarded email seen, so it never costs quota twice', async () => {
    const h = harness([{ ids: ['a'], nextPageToken: null }]);
    const result = await scanBatch({ ...h, extract: async () => null }, 'u1');
    expect(result).toMatchObject({ processed: 1, events: 0 });
    expect(h.state.seen.has(sha256('a'))).toBe(true);
  });

  it('after the backfill, only looks at recent mail', async () => {
    const h = harness([{ ids: [], nextPageToken: null }]);
    h.state.done = true;
    const list = vi.spyOn(h.gmail, 'listMessages');
    await scanBatch({ ...h, extract }, 'u1');
    expect(list.mock.calls[0][0]).toContain('newer_than:2d');
  });
});
