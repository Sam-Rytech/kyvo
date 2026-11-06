'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type WhyRecord = { sentence: string; blobId: string };

export type WhyContent = {
  title: string;
  summary?: string;
  /** Each line of the sum, in order. */
  rows?: { label: string; value: string; total?: boolean; note?: string; small?: boolean; grand?: boolean }[];
  notes?: string[];
  records: WhyRecord[];
};

type WhyContextValue = {
  /** Every number traced to records on Walrus */
  openWhy: (content: WhyContent) => void;
};

const WhyContext = createContext<WhyContextValue | null>(null);

export function useWhy() {
  const value = useContext(WhyContext);
  if (!value) throw new Error('useWhy must be used inside WhyProvider');
  return value;
}

const shortBlob = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`;

function Records({ records, open }: { records: WhyRecord[]; open: boolean }) {
  return (
    <details open={open}>
      <summary className="cursor-pointer font-bold">
        {records.length} {records.length === 1 ? 'record' : 'records'} on Walrus
      </summary>
      <ul className="mt-xs space-y-sm">
        {records.map((record) => (
          <li key={record.blobId} className="slip-small">
            <p>{record.sentence}</p>
            <a href={`https://walruscan.com/mainnet/blob/${record.blobId}`} target="_blank" rel="noreferrer" className="font-bold underline text-primary">
              {shortBlob(record.blobId)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function WhyProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<WhyContent | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const value = useMemo(
    () => ({
      openWhy: (next: WhyContent) => {
        opener.current = document.activeElement as HTMLElement | null;
        setContent(next);
      },
    }),
    [],
  );

  const close = () => {
    setContent(null);
    opener.current?.focus();
  };

  useEffect(() => {
    if (!content) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [content]);

  const rows = content?.rows ?? [];

  return (
    <WhyContext.Provider value={value}>
      {children}
      {content && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <button aria-label="Close panel" tabIndex={-1} onClick={close} className="absolute inset-0 bg-overlay opacity-70" />
          <aside role="dialog" aria-modal="true" aria-labelledby="why-title" className="relative flex h-full w-full max-w-md flex-col bg-secondary overflow-y-auto">
            <div className="flex items-center justify-between gap-md p-lg">
              <h2 id="why-title" className="section-title">
                Why this number?
              </h2>
              <button onClick={close} autoFocus className="p-xs rounded-lg" aria-label="Close">
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            <div className="px-lg pb-xl space-y-md">
              {content.summary && <p className="text-sm text-secondary">{content.summary}</p>}

              <div className="slip">
                <p className="text-center font-bold tracking-[0.08em]">KYVO</p>
                <p className="text-center slip-small mb-md">{content.title}</p>

                {rows.map((row) =>
                  row.grand ? (
                    <p key={row.label} className="slip-grand">
                      {row.value}
                    </p>
                  ) : (
                    <div key={row.label}>
                      {row.total && <hr className="slip-rule" />}
                      <div className={`flex justify-between gap-md ${row.total ? 'font-bold text-[0.9375rem]' : ''} ${row.small ? 'slip-small' : ''}`}>
                        <span>{row.label}</span>
                        <span className="text-right whitespace-nowrap">{row.value}</span>
                      </div>
                      {row.note && <p className="slip-small mb-xs">{row.note}</p>}
                    </div>
                  ),
                )}

                {content.notes && content.notes.length > 0 && (
                  <>
                    <hr className="slip-rule" />
                    <div className="space-y-xs">
                      {content.notes.map((note) => (
                        <p key={note} className="slip-small">
                          {note}
                        </p>
                      ))}
                    </div>
                  </>
                )}

                {content.records.length > 0 && (
                  <>
                    <hr className="slip-rule" />
                    <Records records={content.records} open={rows.length === 0} />
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </WhyContext.Provider>
  );
}
