import { ReauthRequiredError } from '@/lib/auth/google';
import { cleanEmailText, htmlToText } from './text';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

const SUBJECT_TERMS = ['receipt', 'invoice', 'payment', 'trial', 'renew', 'renewal', 'price', 'declined', 'unsuccessful', 'refund', 'subscription', 'charged', 'billing'];
// Repository and social notifications match "invoice" and "payment" constantly and never bill anyone.
const EXCLUDE = ['-from:notifications@github.com', '-category:social', '-category:promotions'];

/** Billing mail only (§5.2). */
export function buildQuery(newerThan: '1y' | '2d'): string {
  return `newer_than:${newerThan} subject:(${SUBJECT_TERMS.join(' OR ')}) ${EXCLUDE.join(' ')}`;
}

type Part = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string };
  parts?: Part[];
};

export type GmailMessage = { id: string; from: string; subject: string; date: string; text: string };

function decode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function findPart(part: Part, mimeType: string): string | null {
  if (part.filename) return null; // attachments never leave Gmail
  if (part.mimeType === mimeType && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

export function parseMessage(raw: {
  id: string;
  internalDate?: string;
  payload?: Part & { headers?: { name: string; value: string }[] };
}): GmailMessage {
  const header = (name: string) => raw.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? '';
  const payload = raw.payload ?? {};
  const plain = findPart(payload, 'text/plain');
  const html = plain ? null : findPart(payload, 'text/html');
  return {
    id: raw.id,
    from: header('from'),
    subject: header('subject'),
    date: new Date(Number(raw.internalDate ?? 0)).toISOString().slice(0, 10),
    text: cleanEmailText(plain ?? (html ? htmlToText(html) : '')),
  };
}

export function createGmailClient(accessToken: string, doFetch: typeof fetch = fetch) {
  async function get<T>(path: string): Promise<T> {
    const response = await doFetch(`${API}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401) throw new ReauthRequiredError();
    if (!response.ok) throw new Error(`Gmail API error ${response.status}`);
    return (await response.json()) as T;
  }

  return {
    async listMessages(query: string, pageToken?: string | null): Promise<{ ids: string[]; nextPageToken: string | null }> {
      const params = new URLSearchParams({ q: query, maxResults: '50' });
      if (pageToken) params.set('pageToken', pageToken);
      const body = await get<{ messages?: { id: string }[]; nextPageToken?: string }>(`/messages?${params}`);
      return { ids: (body.messages ?? []).map((m) => m.id), nextPageToken: body.nextPageToken ?? null };
    },
    async getMessage(id: string): Promise<GmailMessage> {
      return parseMessage(await get(`/messages/${id}?format=full&fields=id,internalDate,payload`));
    },
  };
}

export type GmailClient = ReturnType<typeof createGmailClient>;
