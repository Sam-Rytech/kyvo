'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { MemorySyncStatus, useMemorySync } from '@/components/memory-sync';
import type { MemberState, PlanState } from '@/lib/engines/family';
import { shortDate, usd } from '@/lib/format';

const BADGES: Record<MemberState['status'], string> = {
  paid: 'border-utility-success-200 bg-utility-success-50 text-utility-success-700',
  due: 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700',
  late: 'border-utility-error-200 bg-utility-error-50 text-utility-error-700',
};

const statusLabel = (member: MemberState) => (member.status === 'paid' ? 'Paid' : member.status === 'late' ? `${member.daysLate} ${member.daysLate === 1 ? 'day' : 'days'} late` : `Due ${shortDate(member.due)}`);

function MemberRow({ member }: { member: MemberState }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(member.reminder ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="py-md space-y-xs">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <div className="flex flex-wrap items-center gap-xs min-w-0">
          <span className="text-sm font-semibold text-primary">{member.name}</span>
          <span className={`rounded-full border px-md py-xxs text-xs font-medium ${BADGES[member.status]}`}>{statusLabel(member)}</span>
        </div>
        <span className="text-sm font-mono font-bold text-primary">{usd(member.status === 'paid' ? member.share : member.owed)}</span>
      </div>
      <p className="text-xs text-tertiary">
        {member.lastLateDays === null
          ? 'No payments yet'
          : `Paid ${member.paidCount} ${member.paidCount === 1 ? 'time' : 'times'}, ${member.lateCount === 0 ? 'always on time' : `late ${member.lateCount} ${member.lateCount === 1 ? 'time' : 'times'}`}${member.lastLateDays ? `, ${member.lastLateDays} ${member.lastLateDays === 1 ? 'day' : 'days'} late last time` : ''}`}
        {member.digest && (
          <>
            {' · '}
            <a href={`https://suiscan.xyz/mainnet/tx/${member.digest}`} target="_blank" rel="noreferrer" className="underline">
              Last payment on Sui
            </a>
          </>
        )}
      </p>
      {member.reminder && (
        <button onClick={() => void copy()} className="inline-flex items-center gap-xxs text-xs font-semibold text-brand-primary hover:underline">
          {copied ? <Check className="w-3 h-3" aria-hidden /> : <Copy className="w-3 h-3" aria-hidden />}
          {copied ? 'Copied' : 'Copy a reminder to send'}
        </button>
      )}
    </li>
  );
}

type MemberDraft = { name: string; address: string; share: string };
const EMPTY_MEMBER: MemberDraft = { name: '', address: '', share: '' };

function NewPlan({ onCreated }: { onCreated: () => void }) {
  const [merchant, setMerchant] = useState('');
  const [firstDue, setFirstDue] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([{ ...EMPTY_MEMBER }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (index: number, change: Partial<MemberDraft>) => setMembers((list) => list.map((m, i) => (i === index ? { ...m, ...change } : m)));

  async function create() {
    setSaving(true);
    setError(null);
    const response = await fetch('/api/family', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ merchant, firstDue, members: members.map((m) => ({ name: m.name, address: m.address, share: Number(m.share) })) }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setSaving(false);
    if (response?.ok) {
      setSaved(true);
      onCreated();
    } else setError(body?.error ?? "That didn't save. Check your connection and try again.");
  }

  const input = 'w-full rounded-lg border border-secondary bg-primary px-sm py-xs text-sm text-primary placeholder:text-placeholder';

  if (saved) return <p className="text-sm text-secondary">Plan saved. It appears here once it&apos;s on Walrus Memory.</p>;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
      className="space-y-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs">
        <label className="text-xs font-medium text-secondary">
          What are you sharing?
          <input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Netflix" className={`mt-xxs ${input}`} />
        </label>
        <label className="text-xs font-medium text-secondary">
          First due date
          <input type="date" value={firstDue} onChange={(event) => setFirstDue(event.target.value)} className={`mt-xxs ${input}`} />
        </label>
      </div>
      {members.map((member, index) => (
        // Members have no ID until saved, and rows are only ever added at the end.
        <fieldset key={index} className="rounded-lg border border-secondary p-sm grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-xs">
          <legend className="text-xs font-medium text-secondary px-xxs">Member {index + 1}</legend>
          <label className="text-xs text-tertiary">
            Name
            <input value={member.name} onChange={(event) => update(index, { name: event.target.value })} className={`mt-xxs ${input}`} />
          </label>
          <label className="text-xs text-tertiary">
            Their Sui address
            <input value={member.address} onChange={(event) => update(index, { address: event.target.value })} placeholder="0x…" className={`mt-xxs font-mono ${input}`} />
          </label>
          <label className="text-xs text-tertiary">
            Share in USDC
            <input inputMode="decimal" value={member.share} onChange={(event) => update(index, { share: event.target.value })} placeholder="4.50" className={`mt-xxs sm:w-24 ${input}`} />
          </label>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-xs">
        <button type="button" onClick={() => setMembers((list) => [...list, { ...EMPTY_MEMBER }])} className="rounded-lg border border-secondary bg-primary px-md py-xs text-sm font-semibold text-secondary">
          Add a member
        </button>
        <button disabled={saving || !merchant.trim() || !firstDue} className="rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50">
          {saving ? 'Saving…' : 'Create plan'}
        </button>
      </div>
      {error && <p className="text-xs text-utility-error-700">{error}</p>}
    </form>
  );
}

const REASONS = { amount: 'the amount differs from their share by more than 1%', early: "there's nothing due yet for it to count towards" };

export function FamilyView({ plans, vault }: { plans: PlanState[]; vault: string | null }) {
  const { sync } = useMemorySync();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<{ memberName: string; amount: number; digest: string; reason: 'amount' | 'early' }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setChecking(true);
    setError(null);
    setResult(null);
    const response = await fetch('/api/family/check', { method: 'POST' }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setChecking(false);
    if (!response?.ok) {
      setError(body?.error ?? 'Chain data is temporarily unavailable. Try again shortly.');
      return;
    }
    setUnmatched(body.unmatched);
    setResult(body.matched === 0 ? 'No new payments found on Sui.' : `Found ${body.matched} new ${body.matched === 1 ? 'payment' : 'payments'} on Sui. Saving to Walrus Memory…`);
    if (body.matched > 0) void sync();
  }

  return (
    <div className="space-y-lg">
      <MemorySyncStatus />
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Family plans</h1>
        <p className="text-xs text-tertiary">Members pay your vault in USDC on Sui. Kyvo confirms each payment on-chain through Tatum, and remembers who pays late.</p>
      </div>

      {!vault && <p className="rounded-lg border border-utility-warning-200 bg-utility-warning-50 p-md text-sm text-utility-warning-700">Add your vault address on the dashboard first, so Kyvo knows where members&apos; payments arrive.</p>}

      {plans.length > 0 && (
        <div className="flex flex-wrap items-center gap-sm">
          <button onClick={() => void check()} disabled={checking || !vault} className="rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50">
            {checking ? 'Checking Sui…' : 'Check for payments'}
          </button>
          {result && (
            <p role="status" className="text-sm text-secondary">
              {result}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-utility-error-700">
              {error}
            </p>
          )}
        </div>
      )}

      {unmatched.map((item) => (
        <p key={item.digest} className="text-xs text-utility-warning-700">
          {item.memberName} sent {usd(item.amount)}, but it wasn&apos;t counted because {REASONS[item.reason]}.{' '}
          <a href={`https://suiscan.xyz/mainnet/tx/${item.digest}`} target="_blank" rel="noreferrer" className="underline">
            See it on Sui
          </a>
        </p>
      ))}

      {plans.map((plan) => (
        <section key={plan.id} className="rounded-xl border border-secondary bg-primary p-xl shadow-xs" aria-label={plan.merchant}>
          <h2 className="text-heading-xs font-bold text-primary">{plan.merchant}</h2>
          <p className="text-xs text-tertiary">Due monthly, from {shortDate(plan.firstDue)}</p>
          <ul className="divide-y divide-secondary mt-xs">
            {plan.members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm" aria-labelledby="new-plan">
        <h2 id="new-plan" className="text-sm font-semibold text-primary">
          {plans.length ? 'Add another plan' : 'Create your first plan'}
        </h2>
        <NewPlan onCreated={() => void sync()} />
      </section>
    </div>
  );
}
