'use client';

import { SAMPLE_DATA } from '@/lib/placeholder';
import { useWhy } from '@/components/why-panel';

export default function TrialsPage() {
  const { openWhyModal } = useWhy();

  return (
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
  );
}
