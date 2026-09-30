import Link from 'next/link';
import OrbitMark from '@/app/components/OrbitMark';
import ComplianceFooter from '@/app/components/ComplianceFooter';
import GuidanceBadge from '@/app/components/GuidanceBadge';
import Card from '@/app/components/Card';

export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col bg-base text-ink">
      <main className="mx-auto flex w-full max-w-app lg:max-w-5xl flex-1 flex-col px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <OrbitMark className="h-10 w-10" />
          <span className="text-sm uppercase tracking-[0.2em] text-accent-bright">Orbitfolio</span>
        </div>
        <h1 className="mt-8 text-4xl font-semibold leading-tight">
          See every holding through three lenses.
        </h1>
        <p className="mt-4 text-base text-ink-muted">
          Technicals, fundamentals, and third-party analyst consensus — scored into a client action (Buy / Hold /
          Sell) as research guidance, not personalized regulated advice.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['Technicals', 'Fundamentals', 'Analyst consensus'].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-line/10 bg-card px-3 py-1.5 text-xs text-accent-bright"
            >
              {chip}
            </span>
          ))}
        </div>

        <Card className="mt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Sample rating · not live data</p>
              <p className="mt-1 font-semibold tabular-nums text-ink">AAPL</p>
              <p className="text-xs text-ink-muted">Apple Inc.</p>
            </div>
            <GuidanceBadge label="Mixed" score={6.4} action="Hold" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted">
            <div className="rounded-xl border border-line/[0.06] px-2 py-2">
              <p className="text-ink-faint">Technical</p>
              <p className="mt-0.5 tabular-nums text-ink">6.1</p>
            </div>
            <div className="rounded-xl border border-line/[0.06] px-2 py-2">
              <p className="text-ink-faint">Fundamental</p>
              <p className="mt-0.5 tabular-nums text-ink">6.8</p>
            </div>
            <div className="rounded-xl border border-line/[0.06] px-2 py-2">
              <p className="text-ink-faint">Analyst</p>
              <p className="mt-0.5 tabular-nums text-ink">6.2</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Illustrative mock only — no live prices. Client action is research guidance, not regulated advice.
          </p>
        </Card>

        <Link
          href="/dashboard"
          className="mt-10 flex min-h-[52px] items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-ink no-underline"
        >
          Open app
        </Link>
        <p className="mt-4 text-center text-xs text-ink-faint">
          100% free demo. Android-first PWA. No account required.
        </p>
      </main>
      <ComplianceFooter />
    </div>
  );
}
