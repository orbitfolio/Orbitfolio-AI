'use client';

import { useEffect, useState } from 'react';
import { inferCurrency, inferMarket } from '@/lib/format';
import { suggestFromCatalog, type SuggestHit } from '@/lib/market/ticker-suggest';
import { useHoldingsStore, type Holding } from '@/lib/store/holdings';

export default function AddHoldingSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Holding | null;
}) {
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SuggestHit[]>([]);
  const [symbol, setSymbol] = useState(editing?.symbol ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [quantity, setQuantity] = useState(editing?.quantity?.toString() ?? '');
  const [averagePrice, setAveragePrice] = useState(editing?.averagePrice?.toString() ?? '');
  const [searching, setSearching] = useState(false);
  const [kbPad, setKbPad] = useState(0);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSymbol(editing?.symbol ?? '');
    setName(editing?.name ?? '');
    setQuantity(editing?.quantity?.toString() ?? '');
    setAveragePrice(editing?.averagePrice?.toString() ?? '');
    setQ('');
    setHits([]);
    setSaveError('');
  }, [open, editing]);

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbPad(overlap);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open || editing) return;
    const term = q.trim();
    if (term.length < 1) {
      setHits([]);
      return;
    }
    setHits(suggestFromCatalog(term, 12));
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=12`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length) {
          setHits(json.data);
        }
      } catch {
        /* keep local catalog hits */
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q, open, editing]);

  if (!open) return null;

  const save = () => {
    const qty = Number(quantity);
    const px = Number(averagePrice);
    if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(px) || px < 0) {
      setSaveError('Enter a ticker, quantity greater than 0, and a cost price.');
      return;
    }
    setSaveError('');
    const market = inferMarket(symbol);
    const payload = {
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      quantity: qty,
      averagePrice: px,
      currency: inferCurrency(market),
      market,
      assetType: 'STOCK' as const,
    };
    if (editing) updateHolding(editing.id, payload);
    else addHolding(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/60"
      style={{ paddingBottom: kbPad }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-app rounded-t-3xl border border-line/[0.08] bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line/20" />
        <h2 className="mb-3 text-base font-semibold text-ink">{editing ? 'Edit holding' : 'Add holding'}</h2>
        {!editing && (
          <label className="mb-2 block text-xs text-ink-muted">
            Search ticker
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="RBC, Royal, TD, Toronto, AAPL"
              autoComplete="off"
              autoCorrect="off"
              className="mt-1 w-full rounded-xl border border-line/10 bg-base px-3 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
        )}
        {searching && <p className="text-xs text-ink-faint">Searching…</p>}
        {!searching && q.trim().length > 0 && hits.length === 0 && (
          <p className="mb-2 text-xs text-warning/80">No matching tickers. Try the full name or exchange ticker.</p>
        )}
        {Array.isArray(hits) && hits.length > 0 && (
          <ul className="mb-3 max-h-56 overflow-auto rounded-xl border border-line/10">
            {hits.map((hit) => (
              <li key={hit.symbol}>
                <button
                  type="button"
                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-line/5"
                  onClick={() => {
                    setSymbol(hit.symbol);
                    setName(hit.name);
                    setHits([]);
                    setQ('');
                  }}
                >
                  <span className="min-w-0">
                    <span className="block font-medium tabular-nums">{hit.symbol}</span>
                    <span className="block truncate text-xs text-ink-muted">{hit.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{hit.exchange}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-muted">
            Symbol
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-line/10 bg-base px-3 py-3 text-sm text-ink outline-none"
            />
          </label>
          <label className="text-xs text-ink-muted">
            Quantity
            <input
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line/10 bg-base px-3 py-3 text-sm text-ink outline-none tabular-nums"
            />
          </label>
          <label className="col-span-2 text-xs text-ink-muted">
            Average cost
            <input
              inputMode="decimal"
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line/10 bg-base px-3 py-3 text-sm text-ink outline-none tabular-nums"
            />
          </label>
        </div>
        {saveError && <p className="mt-2 text-xs text-warning">{saveError}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-xl border border-line/15 text-sm font-semibold text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="min-h-[48px] rounded-xl bg-accent text-sm font-semibold text-accent-ink"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
