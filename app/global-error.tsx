'use client';

import './styles/globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base text-ink antialiased">
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
          <p className="text-xs uppercase tracking-[0.18em] text-accent-bright/80">Orbitfolio</p>
          <h1 className="mt-2 text-2xl font-semibold">App failed to load</h1>
          <p className="mt-2 text-sm text-ink-muted">
            A root-level error occurred. Retry, or reopen the app. Demo holdings stay in
            localStorage on this device.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-slate-600">Reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 min-h-[48px] rounded-2xl bg-accent text-sm font-semibold text-accent-ink"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
