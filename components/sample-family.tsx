'use client';

import { SAMPLE_DATA } from '@/lib/placeholder';

export function SampleFamily() {

  return (
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
  );
}
