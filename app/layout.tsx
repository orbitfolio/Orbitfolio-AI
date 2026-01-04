import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles/globals.css';
import ComplianceFooter from './components/ComplianceFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Orbitfolio - Portfolio Analyzer & Tracker',
  description: 'Track stocks, mutual funds & crypto across India, US & Canada with real-time analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <div className="flex-grow">
            {children}
          </div>
          <ComplianceFooter />
        </div>
      </body>
    </html>
  );
}

