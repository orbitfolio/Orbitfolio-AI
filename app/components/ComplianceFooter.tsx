"use client";

const ComplianceFooter = () => {
  return (
    <footer className="compliance-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="logo-text">OrbitFolio AI</h2>
            <p className="tagline">Intelligent Portfolio Analysis</p>
          </div>

          <div className="footer-compliance">
            <div className="disclaimer-title">Legal Disclaimer</div>
            <p className="disclaimer-text">
              OrbitFolio provides analytical tools for informational purposes only.
              <strong> This is not investment advice.</strong> Public analysis may show a score,
              Buy/Hold/Sell, a short rationale, and street consensus. Past performance does not
              guarantee future results. Consult a qualified financial advisor. Orbitfolio is not a
              registered investment advisor.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OrbitFolio AI. All rights reserved.</p>
          <div className="footer-links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/compliance">Compliance</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Colors resolve through the semantic tokens so this footer follows
         * the active theme (was one-off dark-only neutrals). */
        .compliance-footer {
          background: rgb(var(--c-card));
          color: rgb(var(--c-ink-muted));
          padding: 4rem 2rem 2rem;
          border-top: 1px solid rgb(var(--c-line) / 0.1);
          font-family: 'Inter', sans-serif;
          margin-top: auto;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 4rem;
          margin-bottom: 3rem;
        }
        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: rgb(var(--c-accent-bright));
          background: linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent-bright)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .tagline {
          font-size: 0.9rem;
          opacity: 0.8;
        }
        .disclaimer-title {
          font-weight: 700;
          color: rgb(var(--c-ink));
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.8rem;
        }
        .disclaimer-text {
          font-size: 0.85rem;
          line-height: 1.6;
          color: rgb(var(--c-ink-muted));
        }
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 2rem;
          border-top: 1px solid rgb(var(--c-line) / 0.12);
          font-size: 0.8rem;
        }
        .footer-links {
          display: flex;
          gap: 1.5rem;
        }
        .footer-links a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: rgb(var(--c-ink));
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default ComplianceFooter;
