import type { Metadata } from 'next';
import LegalPage from '@/app/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms · Orbitfolio',
  description: 'Orbitfolio terms of use. Research guidance, not investment advice.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        Orbitfolio is a free demo portfolio tracker. It is research software, not a broker, advisor,
        or exchange. Nothing in the app is personalized or regulated investment advice.
      </p>
      <p>
        Public analysis may show an Orbit score (0–10), a client action of Buy, Hold, or Sell, a
        short rationale, and third-party street consensus. Those outputs are mechanical research
        guidance. You decide what, if anything, to do with them.
      </p>
      <p>
        Market prices and fundamentals come from Yahoo public endpoints (no API key). An optional
        Groq key, if the operator sets one, may write a two-sentence rationale; otherwise a
        template is used. Data can be delayed, incomplete, or wrong.
      </p>
      <p>
        Demo holdings live in this browser&apos;s localStorage on this device only. Clearing site
        data, switching browsers, or using another phone removes them. Optional Supabase auth, if
        configured, is separate from the demo store.
      </p>
      <p>
        Orbitfolio is not a registered investment advisor and does not claim registration with any
        securities regulator. Past screens do not predict future results. Use at your own risk.
      </p>
    </LegalPage>
  );
}
