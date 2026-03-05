import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Overview() {
  return (
    <div>
      <div className="page-eyebrow">Introduction</div>
      <h1 className="page-title">What is Merix Holdings?</h1>
      <p className="page-subtitle">
        A decentralized protocol that lets you borrow dollar-pegged stablecoins against
        your crypto assets — without selling them. No banks. No middlemen. Just math.
      </p>

      <div className="overview-hero">
        <div className="overview-hero-title">Start earning with your crypto today</div>
        <p className="overview-hero-desc">
          Lock WETH or WBTC as collateral, mint DSC stablecoins, and deploy them across
          multiple yield strategies — all while keeping full ownership of your assets.
        </p>
        <a href="https://merix-holdings-nine.vercel.app" target="_blank" rel="noopener noreferrer" className="overview-hero-cta">
          Open the App
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Collateral Ratio</div>
          <div className="stat-value">200%</div>
          <div className="stat-sub">minimum over-collateralization</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Yield Strategies</div>
          <div className="stat-value">4+</div>
          <div className="stat-sub">XAU, XAG, Aave, Compound</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Liquidation Bonus</div>
          <div className="stat-value">10%</div>
          <div className="stat-sub">earned by liquidators</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Protocol Fees</div>
          <div className="stat-value">0%</div>
          <div className="stat-sub">no fees, ever</div>
        </div>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">The problem with crypto</h2>
      <p>
        Crypto assets like Ethereum and Bitcoin are excellent stores of value — but they are
        volatile. If you need liquidity today, your only option is to sell. And selling means
        giving up future gains, triggering a taxable event, and losing your position entirely.
      </p>
      <p>
        Traditional banks solve this with loans — you put up your house as collateral and get
        cash. But banks require trust, paperwork, credit checks, and charge interest. There is
        no bank-free way to do the same with crypto.
      </p>
      <p>
        <strong>Merix Holdings solves this.</strong> Lock your crypto as collateral, mint
        dollar-pegged stablecoins instantly, and use them however you want — all without
        selling a single token.
      </p>

      <h2 className="section-heading">How it works in three steps</h2>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">Deposit Collateral</div>
            <p className="step-desc">
              Send WETH (wrapped Ethereum) or WBTC (wrapped Bitcoin) to the protocol.
              Your assets are locked in a smart contract — no human can touch them.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Mint DSC</div>
            <p className="step-desc">
              Based on the value of your collateral, you can mint DSC — a token worth
              exactly $1.00. You can mint up to 50% of your collateral's USD value.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">Use, Earn, or Redeem</div>
            <p className="step-desc">
              Deploy DSC in yield strategies to earn passive income, or simply hold it as
              a stable store of value. When you're done, burn DSC to unlock your collateral.
            </p>
          </div>
        </div>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">Why Merix Holdings?</h2>

      <div className="card-grid card-grid-2">
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-title">Non-Custodial</div>
          <p className="card-desc">Your collateral lives in auditable smart contracts. No company holds your assets.</p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-title">Always On</div>
          <p className="card-desc">Smart contracts run 24/7. Mint at 3am on a Sunday. No business hours.</p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.75"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/>
            </svg>
          </div>
          <div className="card-title">Fully Transparent</div>
          <p className="card-desc">Every transaction is on-chain and verifiable. All code is open source on GitHub.</p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-title">Zero Fees</div>
          <p className="card-desc">Merix Holdings charges no protocol fees. You only pay standard Ethereum gas.</p>
        </div>
      </div>

      <Callout type="info" title="New to DeFi?">
        Start with the <Link to="/getting-started">Getting Started</Link> guide — it walks you through
        connecting your wallet and making your first deposit in under 5 minutes.
      </Callout>

      <div className="page-nav">
        <div style={{ flex: 1 }} />
        <Link to="/getting-started" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Getting Started →</span>
        </Link>
      </div>
    </div>
  )
}
