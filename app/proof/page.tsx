import { and, desc, eq } from 'drizzle-orm';
import { TotalRecall } from '@/components/total-recall';
import { createDb } from '@/db';
import { cacheEvents, tokens, users } from '@/db/schema';
import { decryptToken } from '@/lib/auth/crypto';
import { refreshAccessToken } from '@/lib/auth/google';
import { getSession } from '@/lib/auth/session';
import { getTatum } from '@/lib/chain/tatum-client';
import { getVaultUsdcBalance } from '@/lib/chain/usdc';
import { usd } from '@/lib/format';
import { createGmailClient, buildQuery } from '@/lib/inbox/gmail';
import { getMemWal } from '@/lib/memory/client';
import { userHash } from '@/lib/memory/namespaces';
import { listUserNamespaces } from '@/lib/memory/rebuild';
import { runChecks, type ServiceCheck } from '@/lib/status';

export const metadata = { title: "How it's verified · Kyvo" };

const RECENT = 25;
const LABELS: Record<string, string> = {
  charge: 'Charge',
  usage_bill: 'Usage bill',
  decline: 'Decline',
  refund: 'Refund',
  trial_start: 'Trial',
  price_change: 'Price change',
  card_added: 'Card',
  card_balance: 'Card balance',
  card_removed: 'Card removed',
  card_topup: 'Top-up',
  promise: 'Promise',
  profile: 'Profile',
  vault: 'Vault',
  forecast: 'Forecast',
  forecast_result: 'Forecast score',
  family_plan: 'Family plan',
  family_payment: 'Family payment',
};

const short = (value: string, head = 8, tail = 6) => `${value.slice(0, head)}…${value.slice(-tail)}`;

/** Only for the signed-in user's own mailbox, and never cached. */
async function gmailCheck(userId: string | null): Promise<ServiceCheck> {
  const base = { name: 'Gmail', role: 'Finding billing emails' };
  if (!userId) return { ...base, ok: true, ms: null, note: 'Sign in to test your own connection' };
  const [token] = await createDb().select().from(tokens).where(eq(tokens.userId, userId));
  if (!token) return { ...base, ok: false, ms: null, note: 'Not connected. Sign in again.' };
  const started = Date.now();
  try {
    const access = await refreshAccessToken(decryptToken(token.refreshTokenEnc, process.env.TOKEN_ENC_KEY as string));
    await createGmailClient(access).listMessages(buildQuery('2d'));
    return { ...base, ok: true, ms: Date.now() - started, note: 'Your connection works' };
  } catch {
    return { ...base, ok: false, ms: null, note: 'Access expired or unavailable. Sign in again.' };
  }
}

export default async function ProofPage() {
  const session = await getSession();
  const userId = session?.userId ?? userHash('demo-account', process.env.NS_SALT as string);
  const db = createDb();

  const [recent, payments, [user], { checks, checkedAt }, gmail] = await Promise.all([
    db.select({ blobId: cacheEvents.blobId, type: cacheEvents.type, date: cacheEvents.eventDate, src: cacheEvents.event }).from(cacheEvents).where(eq(cacheEvents.userId, userId)).orderBy(desc(cacheEvents.writtenAt), desc(cacheEvents.id)).limit(RECENT),
    db.select({ blobId: cacheEvents.blobId }).from(cacheEvents).where(and(eq(cacheEvents.userId, userId), eq(cacheEvents.type, 'family_payment'))),
    db.select().from(users).where(eq(users.id, userId)),
    runChecks(),
    gmailCheck(session?.userId ?? null),
  ]);
  const all = [...checks, gmail];
  const down = all.filter((c) => !c.ok).length;

  // Live from the relayer, not the cache. If it's down, the page says so rather than showing an old count.
  const namespaces = await listUserNamespaces(getMemWal(), userId).catch(() => null);
  const total = namespaces?.reduce((sum, ns) => sum + ns.count, 0) ?? null;

  let vaultBalance: number | null = null;
  if (user?.vaultAddress) vaultBalance = await getVaultUsdcBalance(getTatum(), user.vaultAddress).catch(() => null);

  const accountId = process.env.MEMWAL_ACCOUNT_ID ?? '';
  const agentId = process.env.MEMWAL_AGENT_ID ?? '';
  const facts = [
    { label: 'Memories on Walrus', value: total === null ? 'Relayer unavailable' : String(total) },
    { label: 'Namespaces', value: namespaces === null ? '—' : String(namespaces.length) },
    { label: 'Payments verified on Sui', value: String(payments.length) },
    ...(vaultBalance !== null ? [{ label: 'Vault balance, live', value: `${usd(vaultBalance)} USDC` }] : []),
  ];

  return (
    <div className="space-y-2xl">
      <div className="space-y-sm">
        <h1 className="page-title">How it&apos;s verified</h1>
        <p className="text-md text-secondary max-w-prose">{session ? 'Your records' : "The demo account's records"}, and where to check them yourself. Contents are encrypted on Walrus, so public links show that a record exists but not what it says.</p>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-md border-t border-secondary pt-lg">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-sm text-tertiary">{fact.label}</dt>
            <dd className="text-heading-xs font-bold tabular-nums text-primary mt-xxs">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <TotalRecall signedIn={Boolean(session)} />

      <section id="status" className="border-t border-secondary pt-xl space-y-sm scroll-mt-20" aria-labelledby="status-title">
        <h2 id="status-title" className="section-title">
          Are the services up?
        </h2>
        <p role="status" className={`text-md font-semibold ${down ? 'text-utility-error-700' : 'text-utility-success-700'}`}>
          {down ? `${down} ${down === 1 ? "service isn't" : "services aren't"} responding` : 'Everything is responding'}
        </p>
        <p className="text-sm text-tertiary">Live checks from Kyvo&apos;s server. Last run {new Date(checkedAt).toISOString().slice(11, 19)} UTC, refreshed at most once a minute.</p>
        <ul>
          {all.map((check) => (
            <li key={check.name} className="py-sm border-t border-secondary flex items-start justify-between gap-md">
              <div className="min-w-0">
                <p className="text-md font-semibold text-primary">{check.name}</p>
                <p className="text-sm text-tertiary">{check.role}</p>
                <p className={`text-sm mt-xxs ${check.ok ? 'text-secondary' : 'text-utility-error-700'}`}>{check.note}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-md font-semibold tabular-nums text-primary">{check.ms === null ? '—' : `${check.ms} ms`}</p>
                <p className={`text-sm font-medium ${check.ok ? 'text-utility-success-700' : 'text-utility-error-700'}`}>{check.ok ? 'Up' : 'Down'}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-secondary pt-xl space-y-xs" aria-labelledby="account-title">
        <h2 id="account-title" className="section-title">
          On-chain identity
        </h2>
        <p className="text-md text-secondary">
          Walrus Memory account:{' '}
          <a href={`https://suiscan.xyz/mainnet/object/${accountId}`} target="_blank" rel="noreferrer" className="font-mono text-sm underline text-primary">
            {short(accountId)}
          </a>
        </p>
        <p className="text-md text-secondary">
          Delegate public key: <span className="font-mono text-sm text-primary">{short(agentId)}</span>
        </p>
        {session && user?.vaultAddress && (
          <p className="text-md text-secondary">
            Vault:{' '}
            <a href={`https://suiscan.xyz/mainnet/account/${user.vaultAddress}`} target="_blank" rel="noreferrer" className="font-mono text-sm underline text-primary">
              {short(user.vaultAddress)}
            </a>
          </p>
        )}
        <p className="text-md text-secondary">
          Code:{' '}
          <a href="https://github.com/Sam-Rytech/kyvo" target="_blank" rel="noreferrer" className="underline text-primary">
            github.com/Sam-Rytech/kyvo
          </a>
        </p>
      </section>

      <section className="border-t border-secondary pt-xl" aria-labelledby="records-title">
        <h2 id="records-title" className="section-title mb-sm">
          Latest records
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-tertiary">No records yet.</p>
        ) : (
          <ul>
            {recent.map((record) => (
              <li key={record.blobId} className="py-xs border-t border-secondary flex flex-wrap items-center justify-between gap-x-md gap-y-xxs text-md">
                <span className="text-secondary flex flex-wrap gap-x-sm">
                  <span>
                    {LABELS[record.type] ?? record.type}
                    {record.src?.src === 'hindcast' ? ' (hindcast)' : ''}
                  </span>
                  {record.src?.digest ? (
                    <a href={`https://suiscan.xyz/mainnet/tx/${String(record.src.digest)}`} target="_blank" rel="noreferrer" className="underline text-primary">
                      Sui transaction
                    </a>
                  ) : null}
                </span>
                <a href={`https://walruscan.com/mainnet/blob/${record.blobId}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline text-primary shrink-0">
                  {short(record.blobId)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
