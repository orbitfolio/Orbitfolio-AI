'use client';

import { useEffect, useState } from 'react';
import { inferCurrency } from '@/lib/format';
import { parseHoldingsCsv, type CsvHoldingRow, type CsvParseResult } from '@/lib/holdings/csv';
import { useHoldingsStore } from '@/lib/store/holdings';

export default function ImportCsvSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const holdings = useHoldingsStore((s) => s.holdings);
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!open) {
      setParsed(null);
      setFileName('');
    }
  }, [open]);

  if (!open) return null;

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseHoldingsCsv(text));
  };

  const confirm = () => {
    if (!parsed?.rows.length) return;
    const existingBySymbol = new Map(holdings.map((h) => [h.symbol.toUpperCase(), h]));
    for (const row of parsed.rows) {
      applyRow(row, existingBySymbol, addHolding, updateHolding);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border border-white/[0.08] bg-[#101827] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="mb-3 text-base font-semibold text-white">Import CSV</h2>
        <p className="mb-3 text-xs text-slate-400">
          Columns: ticker, quantity, cost_price, asset_type (optional). Aliases: symbol, qty, avg.
        </p>
        <label className="flex min-h-[48px] items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-teal-200">
          {fileName || 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        {parsed && (
          <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-white/10">
            {parsed.errors.map((err) => (
              <p key={`${err.line}-${err.message}`} className="px-3 py-2 text-xs text-amber-300">
                Line {err.line}: {err.message}
              </p>
            ))}
            {parsed.rows.map((row) => (
              <div key={row.ticker} className="flex justify-between px-3 py-2 text-xs text-slate-300">
                <span className="font-semibold tabular-nums text-white">{row.ticker}</span>
                <span>
                  {row.quantity} @ {row.cost_price} · {row.market} · {row.asset_type}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={!parsed?.rows.length}
          onClick={confirm}
          className="mt-4 min-h-[48px] w-full rounded-xl bg-teal-400 text-sm font-semibold text-[#07201c] disabled:opacity-40"
        >
          Confirm import
        </button>
      </div>
    </div>
  );
}

function applyRow(
  row: CsvHoldingRow,
  existingBySymbol: Map<string, { id: string; name: string }>,
  addHolding: (input: {
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currency: string;
    market: 'US' | 'IN' | 'CA';
    assetType: 'STOCK' | 'ETF' | 'OTHER';
  }) => void,
  updateHolding: (
    id: string,
    patch: Partial<{
      quantity: number;
      averagePrice: number;
      assetType: 'STOCK' | 'ETF' | 'OTHER';
      market: 'US' | 'IN' | 'CA';
      currency: string;
    }>
  ) => void
) {
  const symbol = row.ticker.toUpperCase();
  const existing = existingBySymbol.get(symbol);
  const payload = {
    symbol,
    name: existing?.name || symbol,
    quantity: row.quantity,
    averagePrice: row.cost_price,
    currency: inferCurrency(row.market),
    market: row.market,
    assetType: row.asset_type,
  };
  if (existing) {
    updateHolding(existing.id, payload);
  } else {
    addHolding(payload);
    existingBySymbol.set(symbol, { id: 'pending', name: symbol });
  }
}
