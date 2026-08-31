'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/app/components/AppShell';
import AddHoldingSheet from '@/app/components/AddHoldingSheet';
import ImportCsvSheet from '@/app/components/ImportCsvSheet';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import { formatMoney, formatNumber } from '@/lib/format';
import { HOLDINGS_CSV_TEMPLATE } from '@/lib/holdings/csv';
import { useHoldingsStore, type Holding } from '@/lib/store/holdings';

export default function HoldingsPage() {
  const holdings = useHoldingsStore((s) => s.holdings);
  const quotes = useHoldingsStore((s) => s.quotes);
  const analyses = useHoldingsStore((s) => s.analyses);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([HOLDINGS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbitfolio-holdings-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Holdings">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setCsvOpen(true)}
          className="min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-slate-200"
        >
          Import CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="min-h-[44px] rounded-xl bg-teal-400 text-sm font-semibold text-[#07201c]"
        >
          Add
        </button>
      </div>
      <button
        type="button"
        onClick={downloadTemplate}
        className="mb-4 text-left text-xs text-teal-300 underline-offset-2 hover:underline"
      >
        Download CSV template
      </button>

      {holdings.length === 0 ? (
        <section className="rounded-2xl border border-white/[0.08] bg-[#101827] p-6 text-center">
          <p className="text-sm text-slate-300">No holdings yet.</p>
          <p className="mt-1 text-xs text-slate-500">Add a ticker or import a CSV to start scoring.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCsvOpen(true)}
              className="min-h-[44px] rounded-xl border border-white/15 text-sm text-slate-200"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="min-h-[44px] rounded-xl bg-teal-400 text-sm font-semibold text-[#07201c]"
            >
              Add holding
            </button>
          </div>
        </section>
      ) : (
        <ul className="space-y-2">
          {holdings.map((h) => {
            const q = quotes[h.symbol];
            const g = analyses[h.symbol]?.analysis.guidance;
            const px = q?.price ?? null;
            return (
              <li key={h.id} className="rounded-2xl border border-white/[0.08] bg-[#101827] p-3">
                <Link href={`/analysis/${encodeURIComponent(h.symbol)}`} className="block no-underline">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold tabular-nums text-white">{h.symbol}</p>
                      <p className="text-xs text-slate-400">{h.name}</p>
                    </div>
                    <GuidanceBadge label={g?.label} score={g?.orbitScore} action={g?.action} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                    <span>Qty {formatNumber(h.quantity, 2)}</span>
                    <span>Avg {formatMoney(h.averagePrice, h.currency)}</span>
                    <span className="text-right text-white">
                      {px != null ? formatMoney(px, q?.currency || h.currency) : '—'}
                    </span>
                  </div>
                </Link>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="min-h-[40px] flex-1 rounded-xl border border-white/10 text-xs text-slate-300"
                    onClick={() => {
                      setEditing(h);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="min-h-[40px] flex-1 rounded-xl border border-rose-400/20 text-xs text-rose-300"
                    onClick={() => removeHolding(h.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AddHoldingSheet open={open} editing={editing} onClose={() => setOpen(false)} />
      <ImportCsvSheet open={csvOpen} onClose={() => setCsvOpen(false)} />
    </AppShell>
  );
}
