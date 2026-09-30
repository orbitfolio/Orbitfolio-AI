'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-base px-6 text-ink">
      <p className="text-xs uppercase tracking-[0.18em] text-accent-bright/80">Orbitfolio</p>
      <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">
        An unexpected error stopped this screen. Your holdings on this device were not deleted.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-slate-600">Reference {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 min-h-[48px] rounded-2xl bg-accent text-sm font-semibold text-accent-ink"
      >
        Try again
      </button>
    </div>
  );
}
