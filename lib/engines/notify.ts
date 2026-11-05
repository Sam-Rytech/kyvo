// What Kyvo tells you on Telegram. Every message has a stable key, so sending the same one
// twice is impossible, however many times the cron fires.
import { approxLocal, shortDate, usd } from '@/lib/format';
import { guardAlerts } from './decline-guard';
import { planStates } from './family';
import { buildFunding } from './forecast';
import { promiseStates } from './promises';
import type { CachedEvent } from './subscriptions';
import { trialStates } from './trials';

const URGENT_HOURS = 48;
const DIGEST_TRIAL_DAYS = 7;

export type Notification = { key: string; text: string };

export type NotifyInput = { events: CachedEvent[]; homeCurrency: string; asOf: string; rate: number | null; vault?: string };

/** Telegram's HTML mode only needs these three escaped. */
export const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildNotifications({ events, homeCurrency, asOf, rate, vault }: NotifyInput): Notification[] {
  const now = new Date(`${asOf}T00:00:00Z`);
  const date = (d: string | null) => shortDate(d, now);
  const local = (amount: number, markup = 0) => approxLocal(amount, rate, homeCurrency, markup);
  const withLocal = (amount: number, markup = 0) => {
    const approx = local(amount, markup);
    return approx ? `${usd(amount)} (${approx})` : usd(amount);
  };

  const funding = buildFunding(events, homeCurrency, asOf);
  const alerts = guardAlerts(events, homeCurrency, asOf);
  const trials = trialStates(events, asOf);
  const promises = promiseStates(events, asOf);
  const plans = planStates(events, asOf, vault);
  const out: Notification[] = [];

  for (const alert of alerts) {
    if (alert.hoursAway > URGENT_HOURS && alert.level !== 'danger') continue;
    const need = alert.shortfall ?? alert.amount;
    const lines = [
      `⚠️ <b>${esc(alert.name)}</b> bills ${usd(alert.amount)} on ${date(alert.nextDate)}.`,
      alert.shortfall !== null ? `Your card looks ${usd(alert.shortfall)} short. Fund ${withLocal(need, alert.markup)}.` : `Fund ${withLocal(need, alert.markup)} if your card doesn't already hold it.`,
    ];
    if (alert.declinesRecent > 0) lines.push(esc(alert.message));
    if (alert.rule) lines.push(esc(alert.rule));
    out.push({ key: `guard:${alert.slug}:${alert.nextDate}`, text: lines.join('\n') });
  }

  for (const trial of trials) {
    if (!trial.remind) continue;
    const lines = [`⏳ <b>${esc(trial.name)}</b> trial ends ${date(trial.endsAt)}, ${trial.daysLeft === 1 ? 'tomorrow' : `in ${trial.daysLeft} days`}.`];
    if (trial.convertsTo) lines.push(`It then costs ${withLocal(trial.convertsTo)}.`);
    if (trial.reason) lines.push(`You started it ${esc(trial.reason)}.`);
    out.push({ key: `trial:${trial.slug}:${trial.daysLeft}`, text: lines.join('\n') });
  }

  for (const promise of promises) {
    if (!promise.resurface || promise.ageDays === null) continue;
    out.push({ key: `promise:${promise.id}:w${Math.floor(promise.ageDays / 7)}`, text: `📌 ${promise.ageDays} days ago you said: "${esc(promise.text)}". Still planning to?` });
  }

  for (const plan of plans) {
    for (const member of plan.members) {
      if (member.status !== 'late' || !member.reminder) continue;
      out.push({
        key: `family:${plan.id}:${member.id}:${member.due}`,
        text: `💸 <b>${esc(member.name)}</b> owes ${usd(member.owed)} for ${esc(plan.merchant)}.\nForward this:\n\n${esc(member.reminder)}`,
      });
    }
  }

  const digest: string[] = [];
  if (funding.total > 0) {
    digest.push(`<b>Fund ${usd(funding.total)} by ${date(funding.fundBy)}</b>${local(funding.total, funding.markup) ? ` (${local(funding.total, funding.markup)})` : ''}`);
    for (const item of funding.items) digest.push(`• ${esc(item.name)}: ${usd(item.amount)} on ${date(item.nextDate)}`);
  }
  for (const alert of alerts) {
    if (alert.declinesRecent > 0) digest.push(`⚠️ ${esc(alert.name)}: ${esc(alert.message)}`);
  }
  for (const trial of trials) {
    if (trial.status === 'active' && (trial.daysLeft as number) <= DIGEST_TRIAL_DAYS) digest.push(`⏳ ${esc(trial.name)} trial ends ${date(trial.endsAt)}`);
  }
  for (const plan of plans) {
    for (const member of plan.members) {
      if (member.status === 'paid') continue;
      const timing = member.status === 'late' ? `${member.daysLate} ${member.daysLate === 1 ? 'day' : 'days'} late` : `due ${date(member.due)}`;
      const history = member.lastLateDays ? `, paid ${member.lastLateDays} ${member.lastLateDays === 1 ? 'day' : 'days'} late last time` : '';
      digest.push(`💸 ${esc(member.name)} owes ${usd(member.owed)} for ${esc(plan.merchant)}, ${timing}${history}`);
    }
  }
  if (digest.length) out.unshift({ key: `digest:${asOf}`, text: digest.join('\n') });

  return out;
}
