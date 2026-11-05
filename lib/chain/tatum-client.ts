// Every Tatum call goes through here: paced to the free plan's 3 requests per second,
// retried on 429, and honest when credits run out (architecture §8).
const MIN_INTERVAL_MS = 350;
const MAX_RETRIES = 4;

export class TatumUnavailableError extends Error {
  constructor(message = 'Chain data temporarily unavailable') {
    super(message);
    this.name = 'TatumUnavailableError';
  }
}

type Deps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createTatumClient(apiKey: string, deps: Deps = {}) {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? realSleep;
  const now = deps.now ?? Date.now;
  let nextSlot = 0;
  let requests = 0;
  let lastLatencyMs: number | null = null;

  async function paced(url: string, init: RequestInit = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const at = Math.max(now(), nextSlot);
      nextSlot = at + MIN_INTERVAL_MS;
      const wait = at - now();
      if (wait > 0) await sleep(wait);

      const started = now();
      const response = await doFetch(url, {
        ...init,
        headers: { 'x-api-key': apiKey, ...init.headers },
        signal: init.signal ?? AbortSignal.timeout(30_000),
      });
      requests++;
      lastLatencyMs = now() - started;

      if (response.status === 402) throw new TatumUnavailableError();
      if (response.status !== 429) return response;
      if (attempt >= MAX_RETRIES) throw new TatumUnavailableError('Tatum rate limit: retries exhausted');
      await sleep(Math.min(8_000, 500 * 2 ** attempt));
    }
  }

  return {
    async graphql<T>(endpoint: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
      const response = await paced(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      if (!response.ok) throw new TatumUnavailableError(`Tatum GraphQL error ${response.status}`);
      const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
      if (body.errors?.length) throw new TatumUnavailableError(`Tatum GraphQL: ${body.errors[0].message}`);
      return body.data as T;
    },
    async rest<T>(path: string): Promise<T> {
      const response = await paced(`https://api.tatum.io${path}`);
      if (!response.ok) throw new TatumUnavailableError(`Tatum API error ${response.status}`);
      return (await response.json()) as T;
    },
    /** For the /status page and credit tracking. */
    stats: () => ({ requests, lastLatencyMs }),
  };
}

export type TatumClient = ReturnType<typeof createTatumClient>;

let shared: TatumClient | undefined;

/** Server only. */
export function getTatum(): TatumClient {
  if (shared) return shared;
  const key = process.env.TATUM_API_KEY;
  if (!key) throw new Error('TATUM_API_KEY is not set');
  shared = createTatumClient(key);
  return shared;
}
