import Link from 'next/link';
import OrbitMark from '@/app/components/OrbitMark';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-base px-6 text-ink">
      <OrbitMark className="h-10 w-10" />
      <h1 className="mt-6 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm text-ink-muted">
        That URL is not part of Orbitfolio. Empty holdings are not an error — add tickers from
        Holdings if your list is blank.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 flex min-h-[48px] items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-ink no-underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
