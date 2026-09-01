import type { Metadata } from 'next';
import LegalPage from '@/app/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy · Orbitfolio',
  description: 'How Orbitfolio stores demo holdings on this device and which optional services run.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        Demo mode does not require an account. Holdings, display currency, and cached scores stay
        in localStorage on this device only. Export, import, or clear them from Settings. We do
        not receive your demo holdings unless you later connect an optional account.
      </p>
      <p>
        The app asks our own server for ticker search, quotes, and analysis. The server fetches
        Yahoo public market data (no Yahoo key). If the operator sets <code>GROQ_API_KEY</code>,
        symbol and score context may be sent to Groq for a short rationale.
      </p>
      <p>
        Optional services, only when their env vars are set: Supabase (login and{' '}
        <code>/api/holdings</code>), Upstash Redis (shared cache and rate limit). Yahoo quotes
        need no key.
      </p>
      <p>
        Hosted deployments may load Vercel Analytics and Speed Insights (Hobby) to measure visits
        and web vitals. No other analytics product is bundled. There is no service worker.
      </p>
      <p>
        Do not put secrets in the repo. See <code>.env.example</code> for the five optional
        variables. This page is not a claim of regulatory registration.
      </p>
    </LegalPage>
  );
}
