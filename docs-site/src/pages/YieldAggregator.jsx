import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function YieldAggregator() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">Yield Aggregator</h1>
      <p className="page-subtitle">
        Put your minted DSC to work. The Yield Aggregator lets you earn passive income
        across multiple strategies — completely separate from your collateral position.
      </p>

      <h2 className="section-heading">What is the Yield Aggregator?</h2>
      <p>
        Once you've minted DSC, you can either hold it, spend it, or — put it to work.
        The Yield Aggregator is a separate smart contract (a <strong>vault</strong>) that
        accepts your DSC and allocates it across yield-generating strategies.
      </p>
      <p>
        In return, you receive <strong>yDSC shares</strong>. These shares represent your
        proportional ownership of the vault. As yield accrues inside the vault, each yDSC
        share becomes worth more DSC. When you withdraw, you get back more DSC than you put in.
      </p>

      <Callout type="tip" title="Zero impact on your collateral">
        Depositing into the Yield Aggregator does not affect your collateral, your DSC debt,
        or your health factor in the slightest. The vault operates on an entirely separate
        contract. You could liquidate someone and earn yield at the same time.
      </Callout>

      <h2 className="section-heading">Available strategies</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Risk</th>
              <th>APY</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>XAU (Gold)</strong></td>
              <td><span className="badge badge-green">Low</span></td>
              <td>4%</td>
              <td>DSC deployed against simulated gold price appreciation</td>
            </tr>
            <tr>
              <td><strong>XAG (Silver)</strong></td>
              <td><span className="badge badge-green">Low</span></td>
              <td>3%</td>
              <td>DSC deployed against simulated silver price appreciation</td>
            </tr>
            <tr>
              <td><strong>Aave Lending</strong></td>
              <td><span className="badge badge-green">Low</span></td>
              <td>5%</td>
              <td>DSC lent out via Aave-style lending simulation</td>
            </tr>
            <tr>
              <td><strong>Compound</strong></td>
              <td><span className="badge badge-orange">Medium</span></td>
              <td>6%</td>
              <td>DSC supplied to a Compound-style money market</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-heading">How yDSC shares work</h2>
      <p>
        The vault uses an ERC4626-style share accounting system. Here's the mechanics in plain English:
      </p>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">First deposit — 1:1 ratio</div>
            <p className="step-desc">
              The very first deposit into an empty vault issues shares at a 1:1 ratio.
              Deposit 100 DSC, receive 100 yDSC shares.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Yield accrues — share price rises</div>
            <p className="step-desc">
              Every time someone interacts with the vault, <code>_harvestAll()</code> runs,
              adding simulated yield to the vault's total assets. The same 100 shares now
              represent more than 100 DSC — the share price has increased.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">Later deposits — fewer shares</div>
            <p className="step-desc">
              If the vault now holds 110 DSC across 100 shares (share price = 1.10),
              a new 100 DSC deposit receives only ~90.9 shares. This is fair — those
              shares are worth 1.10 DSC each, so 90.9 × 1.10 = 100 DSC.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">4</div>
          <div className="step-body">
            <div className="step-title">Withdrawal — shares burned, DSC returned</div>
            <p className="step-desc">
              Burn your yDSC shares and receive DSC proportional to the current share price.
              Your profit is the difference between what you deposited and what you receive.
            </p>
          </div>
        </div>
      </div>

      <div className="formula-box">
        <div className="formula-text">
          DSC received on withdrawal = yDSC shares burned × (totalAssets ÷ totalShares)<br /><br />
          Your profit = DSC received − DSC deposited
        </div>
        <p className="formula-note">totalAssets grows over time as yield accrues — that's how you earn</p>
      </div>

      <h2 className="section-heading">Understanding your Vault Overview</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>yDSC Shares</strong></td>
              <td>How many vault shares you own</td>
            </tr>
            <tr>
              <td><strong>Current Value</strong></td>
              <td>What your shares are worth in DSC right now</td>
            </tr>
            <tr>
              <td><strong>Unrealized Profit</strong></td>
              <td>Current value minus what you deposited — your paper profit</td>
            </tr>
            <tr>
              <td><strong>Realized Profit</strong></td>
              <td>Profit you've already withdrawn</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="info" title="Why is my current value slightly less than what I deposited?">
        This is expected and correct. When you deposit, you receive shares at the current share
        price. If the share price is above 1.0 (because yield has already accrued), you receive
        fewer shares. But those shares will continue to grow. Over time, your current value will
        exceed your deposit.
      </Callout>

      <h2 className="section-heading">Redeem DSC as Collateral</h2>
      <p>
        The vault also has a <strong>Redeem DSC → Collateral</strong> tab. This lets you take
        your withdrawn DSC profits and convert them directly into WETH or WBTC collateral —
        compounding your position without extra steps.
      </p>

      <div className="page-nav">
        <Link to="/concepts/liquidation" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Liquidation</span>
        </Link>
        <Link to="/reference/contracts" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Smart Contracts →</span>
        </Link>
      </div>
    </div>
  )
}
