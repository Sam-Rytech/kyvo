'use client';

import { SAMPLE_DATA } from '@/lib/placeholder';

export default function ProofPage() {

  return (
<div className="space-y-lg">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
    <div>
      <h1 className="text-heading-xs font-semibold text-primary">Proof</h1>
      <p className="text-xs text-tertiary">
        Walrus memory records and Sui transactions behind every number
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
      <div className="text-xs uppercase tracking-wider text-tertiary">Memory store</div>
      <div className="text-heading-xs font-semibold text-primary mt-xxs">
        Walrus Memory
      </div>
    </div>
    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
      <div className="text-xs uppercase tracking-wider text-tertiary">Last write</div>
      <div className="text-heading-xs font-semibold text-primary mt-xxs">
        {SAMPLE_DATA.proof.lastAttestationTime}
      </div>
    </div>
  </div>

  <div className="rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden">
    <div className="p-md border-b border-secondary">
      <h2 className="text-sm font-semibold text-primary">Memory records</h2>
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
  );
}
