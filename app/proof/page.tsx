import { and, desc, eq } from 'drizzle-orm';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { getTatum } from '@/lib/chain/tatum-client';
import { getVaultUsdcBalance } from '@/lib/chain/usdc';
import { usd } from '@/lib/format';
import { getMemWal } from '@/lib/memory/client';
import { userHash } from '@/lib/memory/namespaces';
import { listUserNamespaces } from '@/lib/memory/rebuild';

export const metadata = { title: 'Proof · Kyvo' };

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

export default async function ProofPage() {
  const session = await getSession();
  const userId = session?.userId ?? userHash('demo-account', process.env.NS_SALT as string);
  const db = createDb();

  const [recent, payments, [user]] = await Promise.all([
    db.select({ blobId: cacheEvents.blobId, type: cacheEvents.type, date: cacheEvents.eventDate, src: cacheEvents.event }).from(cacheEvents).where(eq(cacheEvents.userId, userId)).orderBy(desc(cacheEvents.writtenAt), desc(cacheEvents.id)).limit(RECENT),
    db.select({ blobId: cacheEvents.blobId }).from(cacheEvents).where(and(eq(cacheEvents.userId, userId), eq(cacheEvents.type, 'family_payment'))),
    db.select().from(users).where(eq(users.id, userId)),
  ]);
  // Live from the relayer, not the cache. If it's down, the page says so rather than showing an old count.
  const namespaces = await listUserNamespaces(getMemWal(), userId).catch(() => null);
  const total = namespaces?.reduce((sum, ns) => sum + ns.count, 0) ?? null;

  let vaultBalance: number | null = null;
  if (user?.vaultAddress) vaultBalance = await getVaultUsdcBalance(getTatum(), user.vaultAddress).catch(() => null);

  const accountId = process.env.MEMWAL_ACCOUNT_ID ?? '';
  const agentId = process.env.MEMWAL_AGENT_ID ?? '';
  const facts = [
    { label: 'Memories on Walrus', value: total === null ? 'Relayer unavailable' : String(total), mono: false },
    { label: 'Namespaces', value: namespaces === null ? '—' : String(namespaces.length), mono: false },
    { label: 'Payments verified on Sui', value: String(payments.length), mono: false },
    ...(vaultBalance !== null ? [{ label: 'Vault balance (live)', value: `${usd(vaultBalance)} USDC`, mono: false }] : []),
  ];

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Proof</h1>
        <p className="text-xs text-tertiary">
          {session ? 'Your records' : 'The demo account'}, and where to check them yourself. Contents are encrypted on Walrus, so public links show the record exists but not what it says.
        </p>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-xl border border-secondary bg-primary p-lg shadow-xs">
            <dt className="text-xs text-tertiary">{fact.label}</dt>
            <dd className="text-heading-xs font-mono font-bold text-primary mt-xxs">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xs" aria-labelledby="account-title">
        <h2 id="account-title" className="text-sm font-semibold text-primary">
          On-chain identity
        </h2>
        <p className="text-sm text-secondary">
          Walrus Memory account:{' '}
          <a href={`https://suiscan.xyz/mainnet/object/${accountId}`} target="_blank" rel="noreferrer" className="font-mono text-brand-primary underline">
            {short(accountId)}
          </a>
        </p>
        <p className="text-sm text-secondary">
          Delegate public key: <span className="font-mono">{short(agentId)}</span>
        </p>
        {user?.vaultAddress && (
          <p className="text-sm text-secondary">
            Vault:{' '}
            <a href={`https://suiscan.xyz/mainnet/account/${user.vaultAddress}`} target="_blank" rel="noreferrer" className="font-mono text-brand-primary underline">
              {short(user.vaultAddress)}
            </a>
          </p>
        )}
        <p className="text-sm text-secondary">
          Code:{' '}
          <a href="https://github.com/Sam-Rytech/kyvo" target="_blank" rel="noreferrer" className="text-brand-primary underline">
            github.com/Sam-Rytech/kyvo
          </a>
        </p>
      </section>

      <section className="rounded-xl border border-secondary bg-primary shadow-xs" aria-labelledby="records-title">
        <h2 id="records-title" className="text-sm font-semibold text-primary p-lg border-b border-secondary">
          Latest records
        </h2>
        {recent.length === 0 ? (
          <p className="p-lg text-sm text-tertiary">No records yet.</p>
        ) : (
          <ul className="divide-y divide-secondary">
            {recent.map((record) => (
              <li key={record.blobId} className="px-lg py-sm flex items-center justify-between gap-md text-sm">
                <span className="text-secondary">
                  {LABELS[record.type] ?? record.type}
                  {record.src?.src === 'hindcast' ? ' (hindcast)' : ''}
                  {record.src?.digest ? (
                    <>
                      {' · '}
                      <a href={`https://suiscan.xyz/mainnet/tx/${String(record.src.digest)}`} target="_blank" rel="noreferrer" className="text-brand-primary underline">
                        Sui transaction
                      </a>
                    </>
                  ) : null}
                </span>
                <a href={`https://walruscan.com/mainnet/blob/${record.blobId}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-brand-primary underline shrink-0">
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
