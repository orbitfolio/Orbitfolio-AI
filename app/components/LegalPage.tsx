import Link from 'next/link';
import OrbitMark from '@/app/components/OrbitMark';
import ComplianceFooter from '@/app/components/ComplianceFooter';

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#070B14] text-white">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <OrbitMark className="h-8 w-8" />
          <span className="text-sm uppercase tracking-[0.2em] text-teal-300">Orbitfolio</span>
        </Link>
        <h1 className="mt-8 text-3xl font-semibold leading-tight">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
        <p className="mt-8 text-xs text-slate-500">
          <Link href="/dashboard">Back to the app</Link>
          {' · '}
          <Link href="/terms">Terms</Link>
          {' · '}
          <Link href="/privacy">Privacy</Link>
          {' · '}
          <Link href="/compliance">Compliance</Link>
        </p>
      </main>
      <ComplianceFooter />
    </div>
  );
}
