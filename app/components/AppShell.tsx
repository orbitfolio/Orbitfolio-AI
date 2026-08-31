'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OrbitMark from './OrbitMark';
import CompactDisclaimer from './CompactDisclaimer';

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function HoldingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
    </svg>
  );
}

function AnalysisIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function AppShell({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const dashActive = pathname === '/dashboard';
  const holdingsActive = pathname === '/holdings' || pathname.startsWith('/holdings/');
  const analysisActive = pathname === '/analysis' || pathname.startsWith('/analysis/');
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-orbit">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.08] bg-[#070B14]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <OrbitMark className="h-7 w-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-teal-300/80">Orbitfolio</p>
          <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
        </div>
        {action}
      </header>
      <main className="flex-1 px-4 py-4 pb-40">{children}</main>
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto mx-auto max-w-lg border-t border-white/[0.08] bg-[#070B14]/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur">
          <CompactDisclaimer />
          <nav
            aria-label="Primary"
            className="grid grid-cols-4 px-2"
          >
            <Link
              href="/dashboard"
              aria-current={dashActive ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                dashActive ? 'text-teal-300' : 'text-slate-400'
              }`}
            >
              <DashboardIcon />
              Dashboard
            </Link>
            <Link
              href="/holdings"
              aria-current={holdingsActive ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                holdingsActive ? 'text-teal-300' : 'text-slate-400'
              }`}
            >
              <HoldingsIcon />
              Holdings
            </Link>
            <Link
              href="/analysis"
              aria-current={analysisActive ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                analysisActive ? 'text-teal-300' : 'text-slate-400'
              }`}
            >
              <AnalysisIcon />
              Analysis
            </Link>
            <Link
              href="/settings"
              aria-current={settingsActive ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                settingsActive ? 'text-teal-300' : 'text-slate-400'
              }`}
            >
              <SettingsIcon />
              Settings
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
