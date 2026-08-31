'use client';

import Link from 'next/link';
import OrbitMark from '@/app/components/OrbitMark';
import ComplianceFooter from '@/app/components/ComplianceFooter';

const hasSupabase = Boolean(
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
);

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#070B14]">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        <OrbitMark className="h-12 w-12" />
        <h1 className="mt-4 text-3xl font-semibold text-white">Orbitfolio</h1>
        <p className="mt-2 text-sm text-slate-400">
          Track a demo portfolio with guidance from technicals, fundamentals, and third-party consensus.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 flex min-h-[52px] items-center justify-center rounded-2xl bg-teal-400 text-sm font-semibold text-[#07201c] no-underline"
        >
          Continue with demo
        </Link>
        {hasSupabase && (
          <div className="mt-3 grid gap-2">
            <a
              href="/api/auth/callback?provider=google"
              className="flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 text-sm text-white no-underline"
            >
              Continue with Google
            </a>
            <a
              href="/api/auth/callback?provider=github"
              className="flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 text-sm text-white no-underline"
            >
              Continue with GitHub
            </a>
          </div>
        )}
      </main>
      <ComplianceFooter />
    </div>
  );
}
