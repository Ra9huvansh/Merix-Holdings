import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function HealthFactor() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">Health Factor</h1>
      <p className="page-subtitle">
        The health factor is the single most important number in your position.
        It tells you exactly how safe — or risky — your collateral is.
      </p>

      <h2 className="section-heading">What is the health factor?</h2>
      <p>
        Think of the health factor like a credit score — except it's completely transparent,
        calculated by math in real time, and the rules never change.
      </p>
      <p>
        A health factor <strong>above 1.0</strong> means your position is safe.
        A health factor <strong>at or below 1.0</strong> means you can be liquidated.
        It's that simple.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Safe</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>&gt; 1.5</div>
          <div className="stat-sub">Comfortable buffer</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Caution</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>1.0–1.5</div>
          <div className="stat-sub">Monitor closely</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Danger</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>&lt; 1.0</div>
          <div className="stat-sub">Can be liquidated</div>
        </div>
      </div>

      <h2 className="section-heading">How it's calculated</h2>
      <p>
        The formula is straightforward:
      </p>

      <div className="formula-box">
        <div className="formula-text">
          Health Factor = (Collateral Value USD × Liquidation Threshold) ÷ DSC Minted<br /><br />
          Liquidation Threshold = 50% (0.5)
        </div>
        <p className="formula-note">
          If DSC Minted is 0, your health factor is effectively infinite — no debt, no risk.
        </p>
      </div>

      <h3 className="sub-heading">Worked example</h3>
      <p>Let's say you deposit 1 WETH when ETH is worth $3,000:</p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Collateral deposited</td>
              <td>1 WETH</td>
            </tr>
            <tr>
              <td>Collateral value (USD)</td>
              <td>$3,000</td>
            </tr>
            <tr>
              <td>Liquidation threshold</td>
              <td>50%</td>
            </tr>
            <tr>
              <td>DSC minted</td>
              <td>1,000 DSC ($1,000)</td>
            </tr>
            <tr>
              <td><strong>Health factor</strong></td>
              <td><strong>($3,000 × 0.5) ÷ $1,000 = <span style={{ color: 'var(--green)' }}>1.5</span></strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        A health factor of 1.5 means your position could absorb a 33% drop in ETH price before
        it becomes liquidatable. If ETH drops from $3,000 to $2,000:
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value (after 33% drop)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Collateral value (USD)</td>
              <td>$2,000</td>
            </tr>
            <tr>
              <td>DSC minted</td>
              <td>1,000 DSC (unchanged)</td>
            </tr>
            <tr>
              <td><strong>Health factor</strong></td>
              <td><strong>($2,000 × 0.5) ÷ $1,000 = <span style={{ color: 'var(--orange)' }}>1.0</span></strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="danger" title="At 1.0, liquidation is possible">
        The moment your health factor hits 1.0 or below, your position is open to liquidation.
        Liquidators can repay your DSC and claim your collateral plus a 10% bonus.
      </Callout>

      <h2 className="section-heading">What moves your health factor?</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Action / Event</th>
              <th>Effect on Health Factor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deposit more collateral</td>
              <td><span className="badge badge-green">Increases</span></td>
            </tr>
            <tr>
              <td>Burn DSC (reduce debt)</td>
              <td><span className="badge badge-green">Increases</span></td>
            </tr>
            <tr>
              <td>Collateral price goes up</td>
              <td><span className="badge badge-green">Increases</span></td>
            </tr>
            <tr>
              <td>Mint more DSC</td>
              <td><span className="badge badge-red">Decreases</span></td>
            </tr>
            <tr>
              <td>Withdraw collateral</td>
              <td><span className="badge badge-red">Decreases</span></td>
            </tr>
            <tr>
              <td>Collateral price goes down</td>
              <td><span className="badge badge-red">Decreases</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-heading">How to improve your health factor</h2>
      <p>
        You have two options when your health factor is getting low:
      </p>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">Burn DSC (reduce your debt)</div>
            <p className="step-desc">
              Go to the <strong>Burn DSC</strong> tab and burn some or all of your outstanding DSC.
              This directly reduces your debt, which mathematically increases your health factor.
              This is the most direct fix.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Deposit more collateral</div>
            <p className="step-desc">
              Go to the <strong>Deposit</strong> tab and add more WETH or WBTC. More collateral
              means a higher numerator in the health factor formula, which raises the health factor.
            </p>
          </div>
        </div>
      </div>

      <Callout type="tip" title="Best practice">
        Keep your health factor above 1.5 at all times. This gives you a 33% buffer against
        price drops. If you're sleeping well and not watching charts, aim for 2.0 or above.
      </Callout>

      <div className="page-nav">
        <Link to="/concepts/collateral" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Collateral</span>
        </Link>
        <Link to="/concepts/liquidation" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Liquidation →</span>
        </Link>
      </div>
    </div>
  )
}
