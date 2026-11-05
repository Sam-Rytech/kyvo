export interface ChargeDue {
  id: string;
  merchant: string;
  category: string;
  amountUsd: number;
  amountLocal: number; // in NGN
  localCurrency: string;
  dueDate: string; // e.g. "Tomorrow", "In 2 days", "Friday"
  exactDate: string; // "Nov 7, 2026"
  cardName: string;
  cardLast4: string;
  status: 'safe' | 'warning' | 'critical';
  confidenceScore: number; // percentage
  sourceEmails: number;
}

export interface Subscription {
  id: string;
  merchant: string;
  description: string;
  category: string;
  amountUsd: number;
  amountLocal: number;
  localCurrency: string;
  nextChargeDate: string;
  cycle: string;
  cardAssigned: string;
  cardLast4: string;
  priceChange?: {
    fromUsd: number;
    toUsd: number;
    effectiveDate: string;
  };
  billingEmailSnippet: string;
  lastBilledActual: number;
  taxBufferEstimate: number;
}

export interface Trial {
  id: string;
  service: string;
  reasonStarted: string;
  startedDate: string;
  endDate: string;
  countdownDays: number;
  convertsToUsd: number;
  convertsToLocal: number;
  localCurrency: string;
  cardAttached: string;
  cardLast4: string;
  cancellationDifficulty: '1-click' | 'chat-only' | 'email-needed';
}

export interface VirtualCard {
  id: string;
  name: string;
  provider: string; // e.g., "Chipper Cash", "Geegpay", "Eversend", "Barter"
  last4: string;
  balanceUsd: number;
  balanceLocal: number;
  localCurrency: string;
  servicesHolding: string[];
  isStale: boolean;
  staleNote?: string;
  expiry: string;
  declineFeeWarning: string;
}

export interface FamilyMember {
  name: string;
  shareUsd: number;
  shareLocal: number;
  status: 'paid' | 'late' | 'pending';
  lastHistory: string;
  contactNote: string;
}

export interface FamilyPlan {
  id: string;
  planName: string;
  service: string;
  totalUsd: number;
  totalLocal: number;
  localCurrency: string;
  adminName: string;
  members: FamilyMember[];
  nextDueDate: string;
}

export interface WrappedReport {
  month: string;
  accuracyRate: number; // 98.4%
  averageErrorUsd: number; // $0.42
  feesSavedUsd: number;
  totalSubscriptionsManaged: number;
  totalFundedUsd: number;
  cardsSavedFromDecline: number;
  insights: string[];
}

export interface ServiceStatus {
  service: string;
  category: string;
  status: 'operational' | 'degraded' | 'delayed';
  lastResponseTimeMs: number;
  lastSyncAgo: string;
  reliabilityScore: string;
}

export interface ProofRecord {
  id: string;
  type: string;
  service: string;
  extractedDate: string;
  sourceDigest: string;
  chainTxHash: string;
  chainNetwork: string;
  verifiedStatus: 'attested' | 'anchored';
}

export interface WhyBreakdown {
  targetId: string;
  headline: string;
  targetAmountUsd: number;
  targetAmountLocal: number;
  localCurrency: string;
  confidence: string;
  baseCharge: number;
  crossBorderBuffer: number;
  vatBuffer: number;
  exchangeRateUsed: number; // e.g. 1550 NGN/USD
  historicalRecords: {
    date: string;
    description: string;
    billedUsd: number;
    emailSubject: string;
    variance: string;
  }[];
}

export const SAMPLE_DATA = {
  hero: {
    recommendedFundingUsd: 61.40,
    recommendedFundingLocal: 95170,
    localCurrency: 'NGN',
    deadlineDay: 'Friday',
    deadlineDate: 'Nov 6, 2026',
    warningHighlight: 'Netflix is due in 2 days and your card is $4.10 short',
  },
  vault: {
    usdcBalance: 245.80,
    runwayMonths: 3.4,
    monthlyBurnUsd: 72.30,
    lastRefillDate: 'Oct 28, 2026',
  },
  accuracyTrend: [
    { month: 'Jun', errorUsd: 3.40, baselineErrorUsd: 8.90 },
    { month: 'Jul', errorUsd: 2.10, baselineErrorUsd: 7.80 },
    { month: 'Aug', errorUsd: 1.60, baselineErrorUsd: 8.20 },
    { month: 'Sep', errorUsd: 0.95, baselineErrorUsd: 6.50 },
    { month: 'Oct', errorUsd: 0.42, baselineErrorUsd: 7.10 },
    { month: 'Nov (est)', errorUsd: 0.28, baselineErrorUsd: 6.90 },
  ],
  upcomingCharges: [
    {
      id: 'ch-1',
      merchant: 'Netflix Standard (HD)',
      category: 'Entertainment',
      amountUsd: 15.49,
      amountLocal: 24010,
      localCurrency: 'NGN',
      dueDate: 'In 2 days',
      exactDate: 'Nov 7, 2026',
      cardName: 'Chipper Primary',
      cardLast4: '4821',
      status: 'critical',
      confidenceScore: 99,
      sourceEmails: 14,
    },
    {
      id: 'ch-2',
      merchant: 'ChatGPT Plus',
      category: 'Productivity',
      amountUsd: 20.00,
      amountLocal: 31000,
      localCurrency: 'NGN',
      dueDate: 'In 4 days',
      exactDate: 'Nov 9, 2026',
      cardName: 'Geegpay Work',
      cardLast4: '9103',
      status: 'warning',
      confidenceScore: 97,
      sourceEmails: 11,
    },
    {
      id: 'ch-3',
      merchant: 'Spotify Duo',
      category: 'Audio',
      amountUsd: 14.99,
      amountLocal: 23235,
      localCurrency: 'NGN',
      dueDate: 'Friday',
      exactDate: 'Nov 6, 2026',
      cardName: 'Chipper Primary',
      cardLast4: '4821',
      status: 'safe',
      confidenceScore: 99,
      sourceEmails: 19,
    },
    {
      id: 'ch-4',
      merchant: 'AWS Cloud Hosting',
      category: 'Infrastructure',
      amountUsd: 10.92,
      amountLocal: 16926,
      localCurrency: 'NGN',
      dueDate: 'In 6 days',
      exactDate: 'Nov 11, 2026',
      cardName: 'Geegpay Work',
      cardLast4: '9103',
      status: 'safe',
      confidenceScore: 94,
      sourceEmails: 8,
    },
  ] as ChargeDue[],
  subscriptions: [
    {
      id: 'sub-1',
      merchant: 'Netflix Standard',
      description: 'Stream on 2 devices in HD',
      category: 'Entertainment',
      amountUsd: 17.99,
      amountLocal: 27885,
      localCurrency: 'NGN',
      nextChargeDate: 'Nov 7, 2026',
      cycle: 'Monthly',
      cardAssigned: 'Chipper Primary',
      cardLast4: '4821',
      priceChange: {
        fromUsd: 15.49,
        toUsd: 17.99,
        effectiveDate: 'Upcoming bill',
      },
      billingEmailSnippet: 'Notice of price adjustment detected from info@mailer.netflix.com on Oct 14.',
      lastBilledActual: 15.49,
      taxBufferEstimate: 1.25,
    },
    {
      id: 'sub-2',
      merchant: 'ChatGPT Plus (OpenAI)',
      description: 'GPT-4o, Canvas & Advanced Voice',
      category: 'AI & Productivity',
      amountUsd: 20.00,
      amountLocal: 31000,
      localCurrency: 'NGN',
      nextChargeDate: 'Nov 9, 2026',
      cycle: 'Monthly',
      cardAssigned: 'Geegpay Work',
      cardLast4: '9103',
      billingEmailSnippet: 'Stripe receipt OpenAI, LLC recurring monthly billing receipt.',
      lastBilledActual: 20.00,
      taxBufferEstimate: 0.00,
    },
    {
      id: 'sub-3',
      merchant: 'Spotify Duo',
      description: '2 premium accounts for couples',
      category: 'Music',
      amountUsd: 14.99,
      amountLocal: 23235,
      localCurrency: 'NGN',
      nextChargeDate: 'Nov 6, 2026',
      cycle: 'Monthly',
      cardAssigned: 'Chipper Primary',
      cardLast4: '4821',
      billingEmailSnippet: 'Spotify AB e-receipt confirms scheduled renewal Nov 6.',
      lastBilledActual: 14.99,
      taxBufferEstimate: 0.00,
    },
    {
      id: 'sub-4',
      merchant: 'Amazon Web Services (AWS)',
      description: 'EC2 t4g.micro + S3 backup storage',
      category: 'Developer Tools',
      amountUsd: 10.92,
      amountLocal: 16926,
      localCurrency: 'NGN',
      nextChargeDate: 'Nov 11, 2026',
      cycle: 'Monthly',
      cardAssigned: 'Geegpay Work',
      cardLast4: '9103',
      priceChange: {
        fromUsd: 8.40,
        toUsd: 10.92,
        effectiveDate: 'Usage increase detected',
      },
      billingEmailSnippet: 'AWS Billing invoice alert: estimated month-to-date charges $10.92.',
      lastBilledActual: 8.40,
      taxBufferEstimate: 0.82,
    },
    {
      id: 'sub-5',
      merchant: 'GitHub Copilot Individual',
      description: 'AI code assistant plugin',
      category: 'Developer Tools',
      amountUsd: 10.00,
      amountLocal: 15500,
      localCurrency: 'NGN',
      nextChargeDate: 'Nov 19, 2026',
      cycle: 'Monthly',
      cardAssigned: 'Geegpay Work',
      cardLast4: '9103',
      billingEmailSnippet: 'GitHub Inc payment receipt for user subscription.',
      lastBilledActual: 10.00,
      taxBufferEstimate: 0.00,
    },
  ] as Subscription[],
  trials: [
    {
      id: 'tr-1',
      service: 'Claude Pro (Anthropic)',
      reasonStarted: 'Test Claude 3.5 Sonnet coding capabilities on client project',
      startedDate: 'Oct 29, 2026',
      endDate: 'Nov 12, 2026',
      countdownDays: 7,
      convertsToUsd: 20.00,
      convertsToLocal: 31000,
      localCurrency: 'NGN',
      cardAttached: 'Geegpay Work',
      cardLast4: '9103',
      cancellationDifficulty: '1-click',
    },
    {
      id: 'tr-2',
      service: 'Linear Standard',
      reasonStarted: 'Evaluating sprint management for 4-person design team',
      startedDate: 'Oct 23, 2026',
      endDate: 'Nov 6, 2026',
      countdownDays: 1,
      convertsToUsd: 32.00,
      convertsToLocal: 49600,
      localCurrency: 'NGN',
      cardAttached: 'Chipper Primary',
      cardLast4: '4821',
      cancellationDifficulty: '1-click',
    },
    {
      id: 'tr-3',
      service: 'The Economist Digital Edition',
      reasonStarted: 'Needed US election special report edition',
      startedDate: 'Oct 15, 2026',
      endDate: 'Nov 15, 2026',
      countdownDays: 10,
      convertsToUsd: 18.90,
      convertsToLocal: 29295,
      localCurrency: 'NGN',
      cardAttached: 'Eversend Backup',
      cardLast4: '3049',
      cancellationDifficulty: 'chat-only',
    },
  ] as Trial[],
  cards: [
    {
      id: 'card-1',
      name: 'Chipper Primary (Virtual Visa)',
      provider: 'Chipper Cash',
      last4: '4821',
      balanceUsd: 11.39,
      balanceLocal: 17654,
      localCurrency: 'NGN',
      servicesHolding: ['Netflix', 'Spotify Duo', 'Linear', 'DigitalOcean', 'Notion', 'Figma'],
      isStale: false,
      expiry: '09/28',
      declineFeeWarning: '$2.00 non-sufficient funds penalty per decline',
    },
    {
      id: 'card-2',
      name: 'Geegpay Work (Mastercard)',
      provider: 'Geegpay Africa',
      last4: '9103',
      balanceUsd: 38.50,
      balanceLocal: 59675,
      localCurrency: 'NGN',
      servicesHolding: ['ChatGPT Plus', 'AWS Cloud', 'GitHub Copilot'],
      isStale: false,
      expiry: '11/27',
      declineFeeWarning: '$1.50 decline charge & card lock after 2 attempts',
    },
    {
      id: 'card-3',
      name: 'Eversend Backup (Virtual Visa)',
      provider: 'Eversend',
      last4: '3049',
      balanceUsd: 1.20,
      balanceLocal: 1860,
      localCurrency: 'NGN',
      servicesHolding: ['The Economist', 'Old Heroku Addon', 'Coursera'],
      isStale: true,
      staleNote: 'stale, unused since August',
      expiry: '04/27',
      declineFeeWarning: '$3.00 inactive card retry fee',
    },
  ] as VirtualCard[],
  familyPlans: [
    {
      id: 'fam-1',
      planName: 'Family Spotify Duo & Apple One',
      service: 'Spotify & Apple Services',
      totalUsd: 34.98,
      totalLocal: 54219,
      localCurrency: 'NGN',
      adminName: 'You (Organizer)',
      nextDueDate: 'Nov 6, 2026',
      members: [
        {
          name: 'Tunde Adeleke',
          shareUsd: 11.66,
          shareLocal: 18073,
          status: 'paid',
          lastHistory: 'paid on time via bank transfer',
          contactNote: 'WhatsApp reminder sent Nov 1',
        },
        {
          name: 'Ngozi Okafor',
          shareUsd: 11.66,
          shareLocal: 18073,
          status: 'late',
          lastHistory: 'paid 2 days late last time',
          contactNote: 'Sent 2 Telegram pings',
        },
        {
          name: 'You (Organizer)',
          shareUsd: 11.66,
          shareLocal: 18073,
          status: 'paid',
          lastHistory: 'covered via Chipper Primary',
          contactNote: 'Account holder',
        },
      ],
    },
    {
      id: 'fam-2',
      planName: 'Design Team Figma & Midjourney',
      service: 'Design Shared Suite',
      totalUsd: 48.00,
      totalLocal: 74400,
      localCurrency: 'NGN',
      adminName: 'You (Organizer)',
      nextDueDate: 'Nov 14, 2026',
      members: [
        {
          name: 'Ibrahim Bello',
          shareUsd: 24.00,
          shareLocal: 37200,
          status: 'pending',
          lastHistory: 'paid 4 days late last time',
          contactNote: 'Pending crypto USDT reimbursement',
        },
        {
          name: 'You (Organizer)',
          shareUsd: 24.00,
          shareLocal: 37200,
          status: 'paid',
          lastHistory: 'charged on Geegpay Work',
          contactNote: 'Host account',
        },
      ],
    },
  ] as FamilyPlan[],
  wrapped: {
    month: 'October 2026',
    accuracyRate: 98.4,
    averageErrorUsd: 0.42,
    feesSavedUsd: 14.50,
    totalSubscriptionsManaged: 5,
    totalFundedUsd: 68.20,
    cardsSavedFromDecline: 2,
    insights: [
      'Predicted Netflix tax surcharge of $1.25 with zero shortfall',
      'Caught Linear trial 24h before renewal, avoiding an accidental $32.00 charge',
      'Saved ₦22,475 in penalty fees across Chipper and Eversend virtual cards',
    ],
  } as WrappedReport,
  statusList: [
    {
      service: 'Google Workspace IMAP Sync',
      category: 'Billing Email Ingestion',
      status: 'operational',
      lastResponseTimeMs: 142,
      lastSyncAgo: '3m ago',
      reliabilityScore: '99.98%',
    },
    {
      service: 'Tatum Sui gateway',
      category: 'Blockchain Ledger Anchors',
      status: 'operational',
      lastResponseTimeMs: 89,
      lastSyncAgo: '1m ago',
      reliabilityScore: '100%',
    },
    {
      service: 'Chipper Cash Virtual Card Balance Gateway',
      category: 'Card Provider Webhooks',
      status: 'operational',
      lastResponseTimeMs: 310,
      lastSyncAgo: '12m ago',
      reliabilityScore: '99.4%',
    },
    {
      service: 'Geegpay Card Telemetry',
      category: 'Card Provider Webhooks',
      status: 'operational',
      lastResponseTimeMs: 278,
      lastSyncAgo: '7m ago',
      reliabilityScore: '99.7%',
    },
    {
      service: 'Eversend Telemetry Relay',
      category: 'Card Provider Webhooks',
      status: 'degraded',
      lastResponseTimeMs: 820,
      lastSyncAgo: '42m ago',
      reliabilityScore: '94.2%',
    },
    {
      service: 'FX Spot Oracle (USD/NGN, USD/KES, USD/GHS)',
      category: 'Exchange Rate Memory',
      status: 'operational',
      lastResponseTimeMs: 64,
      lastSyncAgo: 'Just now',
      reliabilityScore: '99.99%',
    },
  ] as ServiceStatus[],
  proof: {
    memoryCount: 148,
    lastAttestationTime: 'Today at 04:12 UTC',
    records: [
      {
        id: 'REC-2026-9941',
        type: 'Tax & VAT Extractor',
        service: 'Netflix Standard',
        extractedDate: 'Oct 14, 2026',
        sourceDigest: 'sha256:7b919d3fca804c86e24f...',
        chainTxHash: '0x8f4c2e6b91d8a342981014e390c58741348bdf614451ec028a39e8',
        chainNetwork: 'Sui mainnet',
        verifiedStatus: 'attested',
      },
      {
        id: 'REC-2026-9812',
        type: 'Price Bump Warning Rule',
        service: 'AWS Cloud EC2',
        extractedDate: 'Oct 11, 2026',
        sourceDigest: 'sha256:1a842f928e08d51190bc...',
        chainTxHash: '0x33b81ca849f8721ad0421e48fbb29147029514782bb1479831a291',
        chainNetwork: 'Sui mainnet',
        verifiedStatus: 'anchored',
      },
      {
        id: 'REC-2026-9764',
        type: 'Trial Terms Parsing',
        service: 'Linear Standard',
        extractedDate: 'Oct 23, 2026',
        sourceDigest: 'sha256:4d701e91c7f3941bca61...',
        chainTxHash: '0xaa1894b92c4e8574169c9b139df3019842a78103328e75294021bb',
        chainNetwork: 'Sui mainnet',
        verifiedStatus: 'attested',
      },
      {
        id: 'REC-2026-9630',
        type: 'Exchange Rate Slippage Guard',
        service: 'ChatGPT Plus',
        extractedDate: 'Oct 09, 2026',
        sourceDigest: 'sha256:9c426e810a911f99c824...',
        chainTxHash: '0x174092bba4019ef84a179603e8571029bb14051a82f348123cba98',
        chainNetwork: 'Sui mainnet',
        verifiedStatus: 'anchored',
      },
    ] as ProofRecord[],
  },
  whyBreakdowns: {
    default: {
      targetId: 'hero-fund',
      headline: 'Hero Recommendation: Fund $61.40 by Friday',
      targetAmountUsd: 61.40,
      targetAmountLocal: 95170,
      localCurrency: 'NGN',
      confidence: '99.4% confidence based on 148 parsed billing emails',
      baseCharge: 56.40,
      crossBorderBuffer: 3.20,
      vatBuffer: 1.80,
      exchangeRateUsed: 1550,
      historicalRecords: [
        {
          date: 'Nov 2, 2026',
          description: 'Observed Netflix $17.99 + $1.25 international transaction fee pattern from Oct statement',
          billedUsd: 19.24,
          emailSubject: 'Netflix: Payment scheduled for Nov 7',
          variance: '+$2.50 vs summer bills (price hike confirmed)',
        },
        {
          date: 'Nov 1, 2026',
          description: 'Spotify Duo monthly renewal: historically clears exactly at $14.99 on the 6th',
          billedUsd: 14.99,
          emailSubject: 'Your Spotify receipt for Duo',
          variance: '$0.00 variance',
        },
        {
          date: 'Oct 30, 2026',
          description: 'ChatGPT Plus regular cycle $20.00 on 9th + $4.10 shortfall buffer for Card 4821',
          billedUsd: 20.00,
          emailSubject: 'OpenAI, LLC: Invoice #INV-2026-10',
          variance: '$0.00 variance',
        },
      ],
    } as WhyBreakdown,
  },
};
