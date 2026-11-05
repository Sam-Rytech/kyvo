// Card providers offered at onboarding. Day 3 adds the fee and decline rules
// from architecture §7.3, re-verified against live sources.
export const PROVIDERS = [
  { id: 'chipper', name: 'Chipper' },
  { id: 'eversend', name: 'Eversend' },
  { id: 'grey', name: 'Grey' },
  { id: 'raenest', name: 'Raenest' },
  { id: 'walllet', name: 'walllet' },
  { id: 'cleva', name: 'Cleva' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'zenith', name: 'Zenith Bank' },
  { id: 'generic', name: 'Other bank card' },
] as const;

export const CURRENCIES = ['NGN', 'GHS', 'KES', 'EGP', 'USD'] as const;
