// Provider rules (architecture §7.3). Adding a provider is data, not code.
// null means "couldn't be confirmed": Kyvo then leaves the fee or warning out rather than guessing.
// Checked against live sources on the date below. Providers change their terms, so re-check before a demo.
export const RULES_CHECKED = '2026-11-05';

export type ProviderRule = {
  id: string;
  name: string;
  /** Charged when a payment fails for lack of funds */
  declineFee: { amount: number; currency: string } | null;
  /** Charged on a successful payment */
  txnFee: { flatUsd?: number; pct?: number; minUsd?: number } | null;
  termination: { consecutiveDeclines: number | null; note: string } | null;
  /** Local currency a provider charges above the market rate. Unknown until compared with a real top-up. */
  fundingMarkup: number | null;
  note?: string;
  sources: string[];
};

export const PROVIDERS: ProviderRule[] = [
  {
    id: 'chipper',
    name: 'Chipper',
    declineFee: { amount: 250, currency: 'NGN' },
    txnFee: { flatUsd: 0.9 },
    termination: { consecutiveDeclines: null, note: 'Chipper can revoke a card after repeated declines for lack of funds.' },
    fundingMarkup: null,
    sources: [
      'https://support.chippercash.com/en/articles/7854286-why-was-i-charged-a-fee-for-my-chipper-card-transaction-that-failed-declined-due-to-insufficient-funds',
      'https://support.chippercash.com/en/articles/10655252-update-to-chipper-usd-card-fees',
    ],
  },
  {
    id: 'eversend',
    name: 'Eversend',
    declineFee: { amount: 0.4, currency: 'USD' },
    txnFee: null,
    termination: { consecutiveDeclines: 3, note: 'Eversend ends a card on the third decline in a row, or if the first payment on a new card fails. A success resets the count.' },
    fundingMarkup: null,
    note: "Eversend's own pages disagree: some say $0.35 per decline, and a few older ones say 4 or 5 declines.",
    sources: ['https://help.eversend.co/en/articles/8185032-eversend-virtual-card-fees', 'https://help.eversend.co/en/articles/10051126-reasons-your-card-may-be-deleted'],
  },
  {
    id: 'grey',
    name: 'Grey',
    declineFee: null,
    txnFee: { flatUsd: 0 },
    termination: { consecutiveDeclines: 2, note: 'Grey says two failed payments for lack of funds can get a card flagged or frozen.' },
    fundingMarkup: null,
    sources: ['https://support.grey.co/en/articles/7893790-why-is-my-card-declining', 'https://grey.co/blog/your-comprehensive-guide-to-greys-virtual-card-answers-to-common-questions'],
  },
  {
    id: 'raenest',
    name: 'Raenest',
    declineFee: null,
    txnFee: { flatUsd: 0.5 },
    termination: null,
    fundingMarkup: null,
    sources: ['https://help.raenest.com/en/articles/6391318-virtual-card-charges-on-raenest'],
  },
  {
    id: 'cleva',
    name: 'Cleva',
    declineFee: { amount: 0.5, currency: 'USD' },
    txnFee: null,
    termination: { consecutiveDeclines: null, note: 'Cleva can end a Standard USD card after repeated declines for lack of funds.' },
    fundingMarkup: null,
    note: 'Applies to the Standard USD card. Cleva says its Classic card has no decline fee.',
    sources: ['https://www.getcleva.com/pricing/cards', 'https://help.getcleva.com/en/articles/15113175-the-cleva-card-classic-usd-card'],
  },
  {
    id: 'walllet',
    name: 'walllet',
    declineFee: null,
    txnFee: null,
    termination: null,
    fundingMarkup: null,
    note: 'No public fee schedule could be found.',
    sources: [],
  },
  {
    id: 'bybit',
    name: 'Bybit',
    declineFee: null,
    txnFee: null,
    termination: null,
    fundingMarkup: null,
    note: 'Bybit publishes foreign-exchange fees by region, but no decline fee or card-ending rule. A payment fails when spending power is too low.',
    sources: ['https://www.bybit.com/en/help-center/article/Fees-and-Spending-Limits-Bybit-Card', 'https://bybit.nl/en/help-center/article/FAQ-Bybit-Card-Transaction'],
  },
  {
    id: 'zenith',
    name: 'Zenith Bank',
    declineFee: null,
    txnFee: null,
    termination: null,
    fundingMarkup: null,
    note: 'No current Nigerian fee schedule could be found. A 2022 report put naira cards at a $20 monthly international limit, but larger charges have gone through since, so it is not applied.',
    sources: ['https://www.thecable.ng/?p=672727'],
  },
  {
    id: 'generic',
    name: 'Other bank card',
    declineFee: null,
    txnFee: null,
    termination: null,
    fundingMarkup: null,
    sources: [],
  },
];

// Each confirmed to return a rate from Tatum on Nov 5, 2026.
export const CURRENCIES = ['NGN', 'GHS', 'KES', 'EGP', 'ZAR', 'UGX', 'INR', 'USD'] as const;

/** Only rates seen on a real receipt. Nigeria's 7.5% VAT was added to Claude Pro in October 2026. */
export const VAT_RATES: Record<string, number> = { NGN: 0.075 };

export function getProviderRule(name: string | null | undefined): ProviderRule | null {
  if (!name) return null;
  return PROVIDERS.find((p) => p.name.toLowerCase() === name.toLowerCase() || p.id === name.toLowerCase()) ?? null;
}

/** The fee on a payment, or null if unknown. Never a guess. */
export function transactionFee(rule: ProviderRule | null, amount: number): number | null {
  if (!rule?.txnFee) return null;
  const { flatUsd = 0, pct = 0, minUsd = 0 } = rule.txnFee;
  return Math.round(Math.max(flatUsd + amount * pct, minUsd) * 100) / 100;
}
