import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/app/components/LegalPage';

export const metadata: Metadata = {
  title: 'Compliance · Orbitfolio',
  description: 'Orbitfolio is not investment advice. Read terms and privacy.',
};

export default function CompliancePage() {
  return (
    <LegalPage title="Compliance">
      <p>
        <strong className="text-white">This is not investment advice.</strong> Orbitfolio is a
        research demo. Client actions (Buy / Hold / Sell) are score-derived guidance, not an order,
        solicitation, or personalized recommendation.
      </p>
      <p>
        Public analysis may show the Orbit score, Buy/Hold/Sell, a short rationale, and street
        consensus from third-party data. Scoring weights and formula stay off that screen. Portfolio
        health uses A+ to F as a grade, not a trade.
      </p>
      <p>
        Holdings persist in localStorage on this device. Market data is Yahoo free-tier. Groq is
        optional. Orbitfolio does not claim to be a registered advisor with any regulator.
      </p>
      <p>
        Read the <Link href="/terms">terms of use</Link> and <Link href="/privacy">privacy
        notice</Link> for data handling and limits.
      </p>
    </LegalPage>
  );
}
