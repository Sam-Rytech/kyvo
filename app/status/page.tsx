'use client';

import { SAMPLE_DATA } from '@/lib/placeholder';

export default function StatusPage() {

  return (
<div className="space-y-lg">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
    <div>
      <h1 className="text-heading-xs font-semibold text-primary">Status</h1>
      <p className="text-xs text-tertiary">
        Response times for the services Kyvo depends on
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
  );
}
