import React, { useState } from 'react';
import {
  Calendar,
  CreditCard,
  Clock,
  Users,
  Award,
  Activity,
  ShieldCheck,
  LayoutDashboard,
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Moon,
  Sun,
  X,
  RefreshCw,
  Search,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { SAMPLE_DATA, ChargeDue, Subscription, Trial, VirtualCard, FamilyPlan } from './lib/placeholder';

type PageRoute = 'dashboard' | 'subscriptions' | 'trials' | 'cards' | 'family' | 'wrapped' | 'status' | 'proof';

export default function App() {
  const [activeTab, setActiveTab] = useState<PageRoute>('dashboard');
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState<boolean>(false);
  const [whySubject, setWhySubject] = useState<string>('Fund $61.40 by Friday');
  const [ignoreMemory, setIgnoreMemory] = useState<boolean>(false);

  // Total Recall state
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false);
  const [recallProgress, setRecallProgress] = useState<'idle' | 'scanning' | 'done'>('idle');

  // View state simulator for Empty / Loading / Error
  const [simulatedState, setSimulatedState] = useState<'normal' | 'loading' | 'empty' | 'error'>('normal');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const openWhyModal = (subject: string) => {
    setWhySubject(subject);
    setIsWhyPanelOpen(true);
  };

  const handleStartRecall = () => {
    setRecallProgress('scanning');
    setTimeout(() => {
      setRecallProgress('done');
      setTimeout(() => {
        setIsRecallModalOpen(false);
        setRecallProgress('idle');
      }, 1500);
    }, 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
    { id: 'trials', label: 'Trials', icon: Clock },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'wrapped', label: 'Wrapped', icon: Award },
    { id: 'status', label: 'Status', icon: Activity },
    { id: 'proof', label: 'Proof', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-secondary text-primary font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-secondary bg-primary shrink-0 p-xl justify-between">
        <div className="space-y-xl">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs">
              <div className="w-8 h-8 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand font-bold text-md shadow-xs">
                K
              </div>
              <div>
                <span className="font-bold text-heading-xs tracking-tight text-primary">Kyvo</span>
                <span className="ml-xs text-xs py-xxs px-xs rounded-full bg-utility-brand-50 text-utility-brand-700 border border-utility-brand-200 font-medium">
                  Sample data
                </span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-xs rounded-lg text-tertiary hover:text-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-fg-tertiary" /> : <Moon className="w-4 h-4 text-fg-tertiary" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-xxs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as PageRoute)}
                  className={`w-full flex items-center gap-sm px-lg py-sm rounded-lg text-sm font-medium border focus-visible:ring-2 focus-visible:ring-focus-ring ${
                    isActive
                      ? 'bg-secondary text-brand-primary font-semibold border-secondary shadow-xs'
                      : 'text-secondary hover:text-primary hover:bg-secondary-hover border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-fg-brand-primary' : 'text-fg-quaternary'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Total Recall Trigger & State Simulator */}
        <div className="space-y-md pt-lg border-t border-secondary">
          {/* Total Recall Button */}
          <button
            onClick={() => setIsRecallModalOpen(true)}
            className="w-full flex items-center justify-between p-sm rounded-lg border border-secondary bg-primary hover:bg-secondary-hover text-primary text-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <div className="flex items-center gap-xs">
              <RotateCcw className="w-4 h-4 text-fg-brand-primary shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-primary">Total Recall</div>
                <div className="text-tertiary text-xs">Re-parse 148 receipts</div>
              </div>
            </div>
            <span className="text-quaternary font-mono text-xs">⌘R</span>
          </button>

          {/* Developer / Demo State Switcher */}
          <div className="bg-secondary p-xs rounded-lg border border-secondary">
            <div className="text-xs uppercase tracking-wider text-quaternary font-medium px-xs mb-xxs">
              View Simulator
            </div>
            <div className="grid grid-cols-4 gap-xxs">
              {(['normal', 'loading', 'empty', 'error'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSimulatedState(mode)}
                  className={`px-xs py-xxs rounded-md text-xs capitalize font-medium border ${
                    simulatedState === mode
                      ? 'bg-primary text-brand-primary border-secondary shadow-xs'
                      : 'text-tertiary hover:text-primary border-transparent'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-lg py-sm bg-primary border-b border-secondary sticky top-0 z-30">
          <div className="flex items-center gap-xs">
            <div className="w-7 h-7 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand font-bold text-sm shadow-xs">
              K
            </div>
            <span className="font-bold text-heading-xs tracking-tight text-primary">Kyvo</span>
            <span className="text-xs py-xxs px-xs rounded-full bg-utility-brand-50 text-utility-brand-700 border border-utility-brand-200">
              Sample data
            </span>
          </div>
          <div className="flex items-center gap-xs">
            <button
              onClick={() => setIsRecallModalOpen(true)}
              className="p-xs rounded-lg text-secondary hover:text-primary bg-primary border border-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
              title="Total Recall"
            >
              <RotateCcw className="w-4 h-4 text-fg-brand-primary shrink-0" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-xs rounded-lg text-secondary hover:text-primary bg-primary border border-secondary focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-fg-tertiary shrink-0" /> : <Moon className="w-4 h-4 text-fg-tertiary shrink-0" />}
            </button>
          </div>
        </header>

        {/* Global Urgent Banner */}
        {simulatedState === 'normal' && (
          <div className="bg-utility-warning-50 border-b border-utility-warning-200 px-lg py-xs text-xs text-utility-warning-700 flex items-center justify-between">
            <div className="flex items-center gap-xs mx-auto max-w-5xl w-full">
              <AlertTriangle className="w-4 h-4 text-fg-warning-primary shrink-0" />
              <span>
                <strong className="font-semibold">Urgent Card Alert:</strong> Netflix is due in 2 days and your Chipper card is $4.10 short of the estimated price-adjusted charge.
              </span>
              <button
                onClick={() => openWhyModal('Netflix $4.10 Shortfall')}
                className="ml-auto underline font-medium hover:text-primary shrink-0"
              >
                Inspect
              </button>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 p-lg md:p-2xl max-w-6xl w-full mx-auto pb-24 md:pb-12">
          {simulatedState === 'loading' && (
            <div className="space-y-xl animate-pulse">
              <div className="h-28 bg-tertiary rounded-xl w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                <div className="h-40 bg-tertiary rounded-xl" />
                <div className="h-40 bg-tertiary rounded-xl" />
                <div className="h-40 bg-tertiary rounded-xl" />
              </div>
              <div className="h-64 bg-tertiary rounded-xl" />
            </div>
          )}

          {simulatedState === 'error' && (
            <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-xl text-center max-w-lg mx-auto my-12">
              <AlertTriangle className="w-8 h-8 text-fg-error-primary mx-auto mb-sm" />
              <h3 className="text-heading-xs font-semibold text-utility-error-700 mb-xs">
                Unable to sync billing memory
              </h3>
              <p className="text-sm text-utility-error-700 mb-md">
                We could not establish connection to the email extraction agent or the local FX oracle. Your cards and subscriptions are temporarily frozen.
              </p>
              <button
                onClick={() => setSimulatedState('normal')}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Retry Connection
              </button>
            </div>
          )}

          {simulatedState === 'empty' && (
            <div className="bg-primary border border-secondary rounded-xl p-2xl text-center max-w-md mx-auto my-12 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-md">
                <Search className="w-6 h-6 text-fg-quaternary shrink-0" />
              </div>
              <h3 className="text-heading-xs font-semibold text-primary mb-xs">
                No active records detected
              </h3>
              <p className="text-sm text-secondary mb-lg">
                Connect your billing forwarding email address to start parsing recurring invoices and predicting declines.
              </p>
              <button
                onClick={() => setSimulatedState('normal')}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Restore Sample Data
              </button>
            </div>
          )}

          {simulatedState === 'normal' && (
            <>
              {/* PAGE 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-xl">
                  {/* Hero Sentence Card */}
                  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-md">
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-wider text-tertiary mb-xs">
                          Immediate Action Plan
                        </div>
                        <div className="flex items-baseline flex-wrap gap-x-sm gap-y-xs">
                          <h1 className="text-heading-xl font-bold text-primary font-mono tracking-tight">
                            Fund $61.40 by {SAMPLE_DATA.hero.deadlineDay}
                          </h1>
                          <span className="text-secondary text-lg font-mono">
                            ≈ ₦{SAMPLE_DATA.hero.recommendedFundingLocal.toLocaleString()}
                          </span>
                          <button
                            onClick={() => openWhyModal('Fund $61.40 by Friday')}
                            className="inline-flex items-center gap-xxs text-sm font-semibold text-brand-primary hover:underline ml-xs focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                          >
                            <span>Why?</span>
                            <HelpCircle className="w-4 h-4 text-fg-brand-primary shrink-0" />
                          </button>
                        </div>
                        <p className="text-sm text-secondary mt-xs">
                          Covers 3 subscriptions due within 7 days + estimated VAT buffer & foreign fee allowance.
                        </p>
                      </div>

                      <div className="flex items-center gap-xs shrink-0">
                        <button
                          onClick={() => openWhyModal('Chipper Virtual Card Funding Details')}
                          className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          Fund Cards Now
                        </button>
                      </div>
                    </div>

                    {/* Warning Card */}
                    <div className="mt-lg p-md rounded-lg bg-utility-warning-50 border border-utility-warning-200 flex items-start gap-sm">
                      <AlertTriangle className="w-5 h-5 text-fg-warning-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-utility-warning-700">
                          {SAMPLE_DATA.hero.warningHighlight}
                        </div>
                        <div className="text-xs text-utility-warning-700 mt-xxs">
                          Chipper Primary (ending in 4821) has $11.39 available. Projected billing is $15.49 + $1.25 fee = $16.74. Decline fee if not topped up: $2.00.
                        </div>
                      </div>
                      <button
                        onClick={() => openWhyModal('Netflix $4.10 Deficit Detail')}
                        className="text-xs font-semibold text-utility-warning-700 underline shrink-0 hover:text-primary"
                      >
                        Inspect Breakdown
                      </button>
                    </div>
                  </div>

                  {/* Grid: 7-Day Charges & USDC Vault */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                    {/* Left: 7 Days Upcoming Charges */}
                    <div className="lg:col-span-2 rounded-xl border border-secondary bg-primary p-xl shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-md">
                          <div>
                            <h2 className="text-heading-xs font-semibold text-primary">Charges Due in Next 7 Days</h2>
                            <p className="text-xs text-tertiary">Real billing dates learned from prior merchant emails</p>
                          </div>
                          <span className="text-xs font-mono font-medium text-secondary bg-secondary px-xs py-xxs rounded">
                            4 items
                          </span>
                        </div>

                        <div className="space-y-xs">
                          {SAMPLE_DATA.upcomingCharges.map((charge) => (
                            <div
                              key={charge.id}
                              className="p-md rounded-lg border border-secondary bg-secondary hover:bg-secondary-hover transition-colors flex items-center justify-between gap-md"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-xs">
                                  <span className="text-sm font-semibold text-primary truncate">
                                    {charge.merchant}
                                  </span>
                                  {charge.status === 'critical' && (
                                    <span className="inline-flex items-center rounded-full border border-utility-error-200 bg-utility-error-50 px-md py-xxs text-xs font-medium text-utility-error-700">
                                      Shortfall
                                    </span>
                                  )}
                                  {charge.status === 'warning' && (
                                    <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                                      Tight Buffer
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-tertiary flex items-center gap-xs mt-xxs">
                                  <span>{charge.dueDate} ({charge.exactDate})</span>
                                  <span>•</span>
                                  <span>Paid via {charge.cardName} (••{charge.cardLast4})</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold font-mono text-primary">
                                  ${charge.amountUsd.toFixed(2)}
                                </div>
                                <div className="text-xs font-mono text-tertiary">
                                  ≈ ₦{charge.amountLocal.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-md mt-md border-t border-secondary flex items-center justify-between text-xs text-tertiary">
                        <span>All amounts factor in historical bank conversion slippage</span>
                        <button
                          onClick={() => setActiveTab('subscriptions')}
                          className="font-medium text-brand-primary hover:underline flex items-center gap-xxs"
                        >
                          View all subscriptions <ChevronRight className="w-4 h-4 text-fg-brand-primary shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Right: USDC Vault Card */}
                    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-sm">
                          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                            Reserve Vault
                          </span>
                          <span className="inline-flex items-center rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
                            Auto-Refill Ready
                          </span>
                        </div>

                        <div className="mb-md">
                          <div className="text-heading-md font-bold font-mono text-primary">
                            ${SAMPLE_DATA.vault.usdcBalance.toFixed(2)}{' '}
                            <span className="text-xs font-sans font-normal text-tertiary">USDC</span>
                          </div>
                          <div className="text-sm font-mono text-secondary mt-xxs">
                            ≈ ₦{(SAMPLE_DATA.vault.usdcBalance * 1550).toLocaleString()}
                          </div>
                        </div>

                        <div className="p-md rounded-lg bg-secondary border border-secondary space-y-xs">
                          <div className="flex justify-between text-xs">
                            <span className="text-secondary">Runway Remaining:</span>
                            <span className="font-semibold text-primary font-mono">
                              {SAMPLE_DATA.vault.runwayMonths} months
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-secondary">Avg Monthly Burn:</span>
                            <span className="font-mono text-primary">
                              ${SAMPLE_DATA.vault.monthlyBurnUsd.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-secondary">Last Topped Up:</span>
                            <span className="text-tertiary">{SAMPLE_DATA.vault.lastRefillDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-md pt-md border-t border-secondary">
                        <button
                          onClick={() => openWhyModal('USDC Reserve Buffer Calculation')}
                          className="w-full inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          <span>Manage Vault Deposit</span>
                          <ArrowUpRight className="w-4 h-4 text-fg-quaternary shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Forecast Accuracy Line Chart Section */}
                  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-lg">
                      <div>
                        <div className="flex items-center gap-xs">
                          <h2 className="text-heading-xs font-semibold text-primary">Forecast Accuracy</h2>
                          <span className="inline-flex items-center rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
                            Avg error $0.42/mo
                          </span>
                        </div>
                        <p className="text-xs text-tertiary mt-xxs">
                          Comparison of prediction error with Kyvo billing memory vs blind naive recurring assumptions
                        </p>
                      </div>

                      {/* Ignore Memory Toggle */}
                      <div className="flex items-center gap-xs bg-secondary p-xs rounded-lg border border-secondary shrink-0">
                        <span className="text-xs text-secondary font-medium">Ignore memory</span>
                        <button
                          onClick={() => setIgnoreMemory(!ignoreMemory)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            ignoreMemory ? 'bg-brand-solid' : 'bg-tertiary'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-primary shadow ring-0 transition duration-200 ease-in-out ${
                              ignoreMemory ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Chart Visualization */}
                    <div className="pt-sm">
                      <div className="h-44 flex items-end gap-md sm:gap-xl border-b border-secondary pb-xs px-xs">
                        {SAMPLE_DATA.accuracyTrend.map((item) => {
                          const shownError = ignoreMemory ? item.baselineErrorUsd : item.errorUsd;
                          const heightPct = Math.min(100, Math.round((shownError / 10) * 100));

                          return (
                            <div key={item.month} className="flex-1 flex flex-col items-center gap-xs group">
                              <span className="text-xs font-mono text-tertiary group-hover:text-primary transition-colors">
                                ${shownError.toFixed(2)}
                              </span>
                              <div className="w-full max-w-[40px] bg-secondary rounded-t-md flex items-end h-32 relative">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md transition-all duration-300 ${
                                    ignoreMemory
                                      ? 'bg-utility-error-200 hover:bg-utility-error-500'
                                      : 'bg-brand-solid hover:bg-brand-solid-hover'
                                  }`}
                                />
                              </div>
                              <span className="text-xs font-medium text-secondary">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-tertiary pt-sm">
                        <div className="flex items-center gap-md">
                          <div className="flex items-center gap-xs">
                            <span className={`w-3 h-3 rounded-sm ${ignoreMemory ? 'bg-utility-error-200' : 'bg-brand-solid'}`} />
                            <span>{ignoreMemory ? 'Naive Baseline Error (No Memory)' : 'Kyvo Learned Memory Error'}</span>
                          </div>
                        </div>
                        <span className="text-xs">Values represented in USD variance per month</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 2: SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Active Subscriptions</h1>
                      <p className="text-xs text-tertiary">
                        Learned recurring schedules, tax increments, and card routing
                      </p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="text-xs px-sm py-xs bg-primary border border-secondary rounded-lg text-secondary font-mono">
                        5 tracking
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden">
                    <div className="divide-y divide-secondary">
                      {SAMPLE_DATA.subscriptions.map((sub) => (
                        <div key={sub.id} className="p-xl hover:bg-secondary transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-md">
                            <div className="space-y-xs">
                              <div className="flex items-center gap-xs flex-wrap">
                                <span className="font-bold text-primary text-md">{sub.merchant}</span>
                                <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                                  {sub.category}
                                </span>
                                {sub.priceChange && (
                                  <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-mono font-semibold text-utility-warning-700">
                                    ${sub.priceChange.fromUsd.toFixed(2)} → ${sub.priceChange.toUsd.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-secondary">{sub.description}</p>
                              <div className="text-xs text-tertiary flex items-center gap-xs pt-xxs">
                                <span>Charged to <strong className="text-primary font-medium">{sub.cardAssigned}</strong> (••{sub.cardLast4})</span>
                                <span>•</span>
                                <span>Next: <strong className="text-primary font-medium">{sub.nextChargeDate}</strong></span>
                              </div>
                              <div className="text-xs text-quaternary bg-secondary px-xs py-xxs rounded-md border border-secondary inline-block mt-xs">
                                📬 {sub.billingEmailSnippet}
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex flex-col justify-between items-end">
                              <div>
                                <div className="text-heading-xs font-mono font-bold text-primary">
                                  ${sub.amountUsd.toFixed(2)}
                                </div>
                                <div className="text-xs font-mono text-tertiary">
                                  ≈ ₦{sub.amountLocal.toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => openWhyModal(`Subscription Analysis: ${sub.merchant}`)}
                                className="text-xs text-brand-primary hover:underline font-medium mt-md"
                              >
                                View receipts & why
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: TRIALS */}
              {activeTab === 'trials' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Free Trials & Evaluations</h1>
                      <p className="text-xs text-tertiary">
                        Countdowns to auto-conversion dates, cancel effort ratings, and why you started them
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    {SAMPLE_DATA.trials.map((trial) => (
                      <div
                        key={trial.id}
                        className="rounded-xl border border-secondary bg-primary p-xl shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-xs">
                            <span className="text-sm font-bold text-primary">{trial.service}</span>
                            <span className={`inline-flex items-center rounded-full px-md py-xxs text-xs font-semibold ${
                              trial.countdownDays <= 2
                                ? 'bg-utility-error-50 text-utility-error-700 border border-utility-error-200'
                                : 'bg-utility-warning-50 text-utility-warning-700 border border-utility-warning-200'
                            }`}>
                              {trial.countdownDays === 1 ? '1 day left' : `${trial.countdownDays} days left`}
                            </span>
                          </div>

                          <div className="p-xs rounded-lg bg-secondary border border-secondary my-sm">
                            <span className="text-xs uppercase tracking-wider text-quaternary font-medium block">
                              Reason started
                            </span>
                            <p className="text-xs text-secondary mt-xxs italic">
                              "{trial.reasonStarted}"
                            </p>
                          </div>

                          <div className="space-y-xs text-xs mt-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary">Converts to:</span>
                              <span className="font-mono font-bold text-primary">
                                ${trial.convertsToUsd.toFixed(2)}{' '}
                                <span className="font-normal text-tertiary">
                                  (≈ ₦{trial.convertsToLocal.toLocaleString()})
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Charged card:</span>
                              <span className="text-primary font-medium">
                                {trial.cardAttached} (••{trial.cardLast4})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary">Cancel difficulty:</span>
                              <span className="text-primary font-medium capitalize">
                                {trial.cancellationDifficulty.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-md pt-md border-t border-secondary flex items-center justify-between">
                          <button
                            onClick={() => openWhyModal(`Trial: ${trial.service}`)}
                            className="text-xs text-brand-primary hover:underline font-medium"
                          >
                            Inspect alert
                          </button>
                          <button className="inline-flex items-center rounded-lg bg-primary px-lg py-sm text-xs font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring">
                            Dismiss alert
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGE 4: CARDS */}
              {activeTab === 'cards' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Virtual Cards & Exposure</h1>
                      <p className="text-xs text-tertiary">
                        Track which merchants hold your card numbers to prevent surprise renewal fees
                      </p>
                    </div>
                  </div>

                  <div className="space-y-md">
                    {SAMPLE_DATA.cards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-xl border border-secondary bg-primary p-xl shadow-xs hover:border-brand transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
                          <div className="space-y-xs">
                            <div className="flex items-center gap-xs flex-wrap">
                              <h2 className="text-heading-xs font-bold text-primary">{card.name}</h2>
                              <span className="text-xs font-mono text-tertiary">••{card.last4}</span>
                              <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                                {card.provider}
                              </span>
                              {card.isStale && (
                                <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                                  {card.staleNote}
                                </span>
                              )}
                            </div>

                            {/* Services Holding Headline */}
                            <div className="text-sm font-semibold text-primary pt-xs">
                              {card.servicesHolding.length} services hold Card {card.name.includes('Primary') ? 'A' : card.name.includes('Work') ? 'B' : 'C'}:
                            </div>

                            <div className="flex flex-wrap gap-xs pt-xxs">
                              {card.servicesHolding.map((srv) => (
                                <span
                                  key={srv}
                                  className="text-xs px-sm py-xxs rounded-md bg-secondary border border-secondary text-secondary"
                                >
                                  {srv}
                                </span>
                              ))}
                            </div>

                            <div className="text-xs text-utility-error-700 flex items-center gap-xs pt-xs">
                              <AlertTriangle className="w-4 h-4 text-fg-error-primary shrink-0" />
                              <span>{card.declineFeeWarning}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs uppercase tracking-wider text-tertiary">Current Balance</div>
                            <div className="text-heading-sm font-mono font-bold text-primary">
                              ${card.balanceUsd.toFixed(2)}
                            </div>
                            <div className="text-xs font-mono text-tertiary">
                              ≈ ₦{card.balanceLocal.toLocaleString()}
                            </div>
                            <button
                              onClick={() => openWhyModal(`Card Balance Audit: ${card.name}`)}
                              className="text-xs text-brand-primary hover:underline font-medium mt-sm inline-block"
                            >
                              Audit card history
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGE 5: FAMILY */}
              {activeTab === 'family' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Shared & Family Plans</h1>
                      <p className="text-xs text-tertiary">
                        Member shares, settlement tracking, and lateness history
                      </p>
                    </div>
                  </div>

                  <div className="space-y-lg">
                    {SAMPLE_DATA.familyPlans.map((plan) => (
                      <div key={plan.id} className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-md border-b border-secondary">
                          <div>
                            <h2 className="text-heading-xs font-bold text-primary">{plan.planName}</h2>
                            <p className="text-xs text-tertiary">
                              Next global renewal: {plan.nextDueDate} • Admin: {plan.adminName}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-heading-xs font-mono font-bold text-primary">
                              ${plan.totalUsd.toFixed(2)}
                            </span>
                            <span className="text-xs font-mono text-tertiary block">
                              ≈ ₦{plan.totalLocal.toLocaleString()} / mo total
                            </span>
                          </div>
                        </div>

                        {/* Members List */}
                        <div className="divide-y divide-secondary mt-xs">
                          {plan.members.map((member) => (
                            <div key={member.name} className="py-md flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                              <div>
                                <div className="flex items-center gap-xs">
                                  <span className="text-sm font-semibold text-primary">{member.name}</span>
                                  {member.status === 'paid' && (
                                    <span className="inline-flex items-center rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
                                      Paid
                                    </span>
                                  )}
                                  {member.status === 'late' && (
                                    <span className="inline-flex items-center rounded-full border border-utility-error-200 bg-utility-error-50 px-md py-xxs text-xs font-medium text-utility-error-700">
                                      Late
                                    </span>
                                  )}
                                  {member.status === 'pending' && (
                                    <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-tertiary mt-xxs">
                                  {member.lastHistory} • <span className="text-secondary">{member.contactNote}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-sm font-mono font-bold text-primary">
                                  ${member.shareUsd.toFixed(2)}
                                </span>
                                <span className="text-xs font-mono text-tertiary block">
                                  ≈ ₦{member.shareLocal.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGE 6: WRAPPED */}
              {activeTab === 'wrapped' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Monthly Wrapped</h1>
                      <p className="text-xs text-tertiary">
                        Shareable performance report for {SAMPLE_DATA.wrapped.month}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs max-w-2xl mx-auto space-y-xl">
                    <div className="text-center space-y-xs pb-lg border-b border-secondary">
                      <span className="text-xs uppercase tracking-widest text-tertiary font-semibold">
                        Kyvo Monthly Scorecard
                      </span>
                      <div className="text-heading-2xl font-mono font-bold text-brand-primary">
                        {SAMPLE_DATA.wrapped.accuracyRate}%
                      </div>
                      <div className="text-sm font-medium text-secondary">
                        Forecast Accuracy Rate across all recurring cards
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-md text-center">
                      <div className="p-md rounded-lg bg-secondary border border-secondary">
                        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Avg Error</div>
                        <div className="text-heading-sm font-mono font-bold text-primary mt-xxs">
                          ${SAMPLE_DATA.wrapped.averageErrorUsd.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-md rounded-lg bg-secondary border border-secondary">
                        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Fees Prevented</div>
                        <div className="text-heading-sm font-mono font-bold text-utility-success-700 mt-xxs">
                          ${SAMPLE_DATA.wrapped.feesSavedUsd.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-md rounded-lg bg-secondary border border-secondary col-span-2 sm:col-span-1">
                        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Declines Avoided</div>
                        <div className="text-heading-sm font-mono font-bold text-primary mt-xxs">
                          {SAMPLE_DATA.wrapped.cardsSavedFromDecline} cards
                        </div>
                      </div>
                    </div>

                    <div className="space-y-xs">
                      <div className="text-xs uppercase tracking-wider font-semibold text-tertiary mb-xs">
                        Learned Memory Highlights
                      </div>
                      {SAMPLE_DATA.wrapped.insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-xs text-xs text-secondary p-xs bg-secondary rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-fg-success-primary shrink-0 mt-0.5" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-md border-t border-secondary flex items-center justify-between">
                      <span className="text-xs text-tertiary">Share report to Telegram channel</span>
                      <button className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-xs font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring">
                        Copy Report Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 7: STATUS */}
              {activeTab === 'status' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">System Telemetry & Status</h1>
                      <p className="text-xs text-tertiary">
                        Monitoring response latency and synchronization across external billing APIs
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10 bg-secondary">
                          <tr className="border-b border-secondary text-left">
                            <th className="px-3xl py-md text-sm font-semibold text-quaternary">Service Component</th>
                            <th className="px-3xl py-md text-sm font-semibold text-quaternary">Subsystem</th>
                            <th className="px-3xl py-md text-sm font-semibold text-quaternary">Health</th>
                            <th className="px-3xl py-md text-sm font-semibold text-quaternary font-mono text-right">Response Time</th>
                            <th className="px-3xl py-md text-sm font-semibold text-quaternary text-right">Reliability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SAMPLE_DATA.statusList.map((svc) => (
                            <tr key={svc.service} className="border-b border-secondary hover:bg-secondary-hover transition-colors">
                              <td className="px-3xl py-xl text-md text-primary font-medium">{svc.service}</td>
                              <td className="px-3xl py-xl text-md text-tertiary">{svc.category}</td>
                              <td className="px-3xl py-xl text-md text-tertiary">
                                {svc.status === 'operational' ? (
                                  <span className="inline-flex items-center gap-xs rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success-primary" />
                                    Operational
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-xs rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-warning-primary" />
                                    Degraded
                                  </span>
                                )}
                              </td>
                              <td className="px-3xl py-xl text-md font-mono text-right text-primary">
                                {svc.lastResponseTimeMs} ms
                              </td>
                              <td className="px-3xl py-xl text-md font-mono text-right text-tertiary">
                                {svc.reliabilityScore}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 8: PROOF */}
              {activeTab === 'proof' && (
                <div className="space-y-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                    <div>
                      <h1 className="text-heading-xs font-semibold text-primary">Cryptographic Proof & Memory</h1>
                      <p className="text-xs text-tertiary">
                        Attested record IDs and blockchain transaction links anchoring billing memories
                      </p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="text-xs px-sm py-xs bg-primary border border-secondary rounded-lg text-secondary font-mono">
                        {SAMPLE_DATA.proof.memoryCount} Memories Stored
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
                      <div className="text-xs uppercase tracking-wider text-tertiary">Total Stored Records</div>
                      <div className="text-heading-md font-mono font-bold text-primary mt-xxs">
                        {SAMPLE_DATA.proof.memoryCount}
                      </div>
                    </div>
                    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
                      <div className="text-xs uppercase tracking-wider text-tertiary">Anchor Provider</div>
                      <div className="text-heading-xs font-semibold text-primary mt-xxs">
                        Tatum Ledger Gateway
                      </div>
                    </div>
                    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
                      <div className="text-xs uppercase tracking-wider text-tertiary">Last Attestation</div>
                      <div className="text-heading-xs font-semibold text-primary mt-xxs">
                        {SAMPLE_DATA.proof.lastAttestationTime}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden">
                    <div className="p-md border-b border-secondary">
                      <h2 className="text-sm font-semibold text-primary">Attested Memory Records</h2>
                    </div>
                    <div className="divide-y divide-secondary">
                      {SAMPLE_DATA.proof.records.map((rec) => (
                        <div key={rec.id} className="p-xl hover:bg-secondary transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-xs">
                            <div>
                              <div className="flex items-center gap-xs">
                                <span className="font-mono font-bold text-primary text-xs">{rec.id}</span>
                                <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                                  {rec.type}
                                </span>
                                <span className="text-xs font-medium text-primary">
                                  {rec.service}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-tertiary mt-xxs">
                                Digest: {rec.sourceDigest} • Extracted: {rec.extractedDate}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono text-brand-primary block truncate max-w-xs">
                                {rec.chainTxHash}
                              </span>
                              <span className="text-xs text-tertiary">
                                {rec.chainNetwork}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Mobile Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary border-t border-secondary px-xs py-xxs z-30 flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as PageRoute)}
                className={`flex flex-col items-center py-xs px-xxs transition-colors ${
                  isActive ? 'text-brand-primary font-semibold' : 'text-quaternary hover:text-primary'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-fg-brand-primary' : 'text-fg-quaternary'}`} />
                <span className="text-xs mt-xxs">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* "Why?" Drawer Side Panel */}
      {isWhyPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-overlay opacity-90 flex justify-end">
          <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-xl">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div>
                <div className="flex items-center gap-xs">
                  <HelpCircle className="w-5 h-5 text-fg-brand-primary shrink-0" />
                  <h2 className="text-heading-xs font-bold text-primary">Why this number?</h2>
                </div>
                <p className="mt-xs text-sm text-tertiary">Inspect historical email digests, slippage buffers, and VAT rules.</p>
              </div>
              <button
                onClick={() => setIsWhyPanelOpen(false)}
                className="p-xs text-tertiary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-xl space-y-lg">
              <div>
                <span className="text-xs uppercase tracking-wider text-tertiary font-semibold">Calculation Subject</span>
                <div className="text-heading-xs font-bold text-primary mt-xxs">{whySubject}</div>
                <div className="text-xs text-secondary mt-xs bg-secondary p-xs rounded-lg border border-secondary">
                  {SAMPLE_DATA.whyBreakdowns.default.confidence}
                </div>
              </div>

              {/* Breakdown Math */}
              <div className="p-xl rounded-lg bg-secondary border border-secondary space-y-xs text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Base Subscription Total:</span>
                  <span className="font-mono text-primary font-semibold">${SAMPLE_DATA.whyBreakdowns.default.baseCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Cross-Border Card Buffer:</span>
                  <span className="font-mono text-primary font-semibold">+${SAMPLE_DATA.whyBreakdowns.default.crossBorderBuffer.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">VAT & Regional Fee Surcharge:</span>
                  <span className="font-mono text-primary font-semibold">+${SAMPLE_DATA.whyBreakdowns.default.vatBuffer.toFixed(2)}</span>
                </div>
                <div className="border-t border-secondary pt-xs flex justify-between font-bold text-sm">
                  <span className="text-primary">Recommended Top-Up:</span>
                  <span className="font-mono text-brand-primary">${SAMPLE_DATA.whyBreakdowns.default.targetAmountUsd.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs font-mono text-tertiary">
                  ≈ ₦{SAMPLE_DATA.whyBreakdowns.default.targetAmountLocal.toLocaleString()} @ 1550 NGN/USD spot
                </div>
              </div>

              {/* Source Records */}
              <div className="space-y-xs">
                <span className="text-xs uppercase tracking-wider text-tertiary font-semibold">
                  Extracted Billing Receipts
                </span>
                {SAMPLE_DATA.whyBreakdowns.default.historicalRecords.map((rec, idx) => (
                  <div key={idx} className="p-sm rounded-lg bg-secondary border border-secondary text-xs space-y-xxs">
                    <div className="flex justify-between font-semibold text-primary">
                      <span>{rec.emailSubject}</span>
                      <span className="font-mono">${rec.billedUsd.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-secondary">{rec.description}</p>
                    <div className="text-xs text-utility-warning-700 font-medium">
                      {rec.variance}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="flex justify-end gap-sm border-t border-secondary p-xl">
              <button
                onClick={() => setIsWhyPanelOpen(false)}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Close Audit Trail
              </button>
            </footer>
          </aside>
        </div>
      )}

      {/* Total Recall Modal */}
      {isRecallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay opacity-90 p-md">
          <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-primary shadow-2xl border border-secondary">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div className="flex items-center gap-xs">
                <RotateCcw className="w-5 h-5 text-fg-brand-primary shrink-0" />
                <h2 className="text-heading-xs font-bold text-primary">Total Recall Sync</h2>
              </div>
              <button
                onClick={() => setIsRecallModalOpen(false)}
                className="p-xs text-tertiary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>

            <div className="p-xl">
              {recallProgress === 'idle' && (
                <>
                  <p className="text-sm text-secondary">
                    Triggering Total Recall will re-read all historical billing receipts, recalculate currency conversion slippage, and re-anchor memory proofs to the Tatum ledger.
                  </p>
                  <footer className="flex justify-end gap-sm border-t border-secondary pt-xl mt-xl">
                    <button
                      onClick={() => setIsRecallModalOpen(false)}
                      className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartRecall}
                      className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      Confirm Re-Scan
                    </button>
                  </footer>
                </>
              )}

              {recallProgress === 'scanning' && (
                <div className="py-xl text-center space-y-sm">
                  <RefreshCw className="w-8 h-8 text-fg-brand-primary animate-spin mx-auto shrink-0" />
                  <div className="text-sm font-semibold text-primary">Re-parsing 148 email receipts...</div>
                  <div className="text-xs text-tertiary">Recalculating VAT and foreign merchant transaction variance</div>
                </div>
              )}

              {recallProgress === 'done' && (
                <div className="py-xl text-center space-y-xs">
                  <Check className="w-8 h-8 text-fg-success-primary mx-auto shrink-0" />
                  <div className="text-sm font-semibold text-primary">Total Recall Complete</div>
                  <div className="text-xs text-secondary">Forecast weights updated across all 5 virtual cards.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
