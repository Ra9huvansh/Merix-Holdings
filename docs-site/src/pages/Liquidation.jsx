import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Liquidation() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">Liquidation</h1>
      <p className="page-subtitle">
        Liquidation is the protocol's self-defense mechanism. It keeps DSC backed at all times —
        and creates a financial incentive for users to participate.
      </p>

      <h2 className="section-heading">What is liquidation?</h2>
      <p>
        When a user's health factor drops below 1.0, their position becomes
        <strong> under-collateralized</strong> — meaning their collateral is no longer worth enough
        to fully back the DSC they minted. Left unchecked, this would make DSC unreliable.
      </p>
      <p>
        The protocol solves this by allowing anyone — called a <strong>liquidator</strong> — to
        step in and close the risky position. The liquidator repays the user's DSC debt and in
        return receives the user's collateral at a discount. This restores the protocol's solvency.
      </p>

      <Callout type="info" title="Liquidation is not punishment — it's math">
        Liquidation isn't a fine or penalty. It's simply the mechanism that ensures every DSC
        in circulation is always backed by sufficient collateral. It keeps the whole system safe
        for everyone.
      </Callout>

      <h2 className="section-heading">How liquidation works</h2>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">A position goes below 1.0 health factor</div>
            <p className="step-desc">
              Due to a drop in collateral price or excessive DSC minting, a user's health factor
              drops to 1.0 or below. Their position is now eligible for liquidation.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">A liquidator spots the position</div>
            <p className="step-desc">
              The Merix Holdings app shows a live list of at-risk positions in the
              <strong> Liquidate</strong> tab. Anyone can scan this list and choose a position to liquidate.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">Liquidator repays the DSC debt</div>
            <p className="step-desc">
              The liquidator calls the <code>liquidate()</code> function, specifying how much DSC
              they want to repay on behalf of the undercollateralized user. The liquidator must
              hold this DSC in their own wallet.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">4</div>
          <div className="step-body">
            <div className="step-title">Liquidator receives collateral + 10% bonus</div>
            <p className="step-desc">
              In return, the liquidator receives an equivalent amount of the user's collateral —
              plus a <strong>10% liquidation bonus</strong>. This bonus is the profit incentive
              that makes liquidators want to participate.
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-heading">The liquidation bonus — a worked example</h2>
      <p>
        Let's say a user has 1 WETH deposited (ETH = $2,000) and minted 1,000 DSC.
        Their health factor has dropped to 0.95 — they're liquidatable.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>User's collateral</td>
              <td>1 WETH = $2,000</td>
            </tr>
            <tr>
              <td>User's DSC debt</td>
              <td>1,000 DSC = $1,000</td>
            </tr>
            <tr>
              <td>Liquidator repays</td>
              <td>500 DSC ($500)</td>
            </tr>
            <tr>
              <td>Collateral owed to liquidator</td>
              <td>$500 worth of WETH = 0.25 WETH</td>
            </tr>
            <tr>
              <td>10% bonus</td>
              <td>+0.025 WETH ($50)</td>
            </tr>
            <tr>
              <td><strong>Liquidator receives</strong></td>
              <td><strong>0.275 WETH ($550) for $500 spent</strong></td>
            </tr>
            <tr>
              <td>Liquidator profit</td>
              <td><strong><span style={{ color: 'var(--green)' }}>+$50 (10% return)</span></strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="tip" title="Liquidating is profitable">
        Every liquidation earns the liquidator a 10% return on their DSC. If you hold DSC and
        want to earn yield, monitoring the Liquidate tab for opportunities is a free-market strategy.
      </Callout>

      <h2 className="section-heading">Protecting yourself from liquidation</h2>

      <div className="card-grid card-grid-2">
        <div className="card">
          <div className="card-title">Monitor your health factor</div>
          <p className="card-desc">
            Check the dashboard regularly. Your health factor is shown in the header once
            connected. If it's below 1.5, take action.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Don't mint the maximum</div>
          <p className="card-desc">
            Minting 50% of your collateral puts you at exactly 1.0 health factor.
            Aim for 30–40% to give yourself room for price swings.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Burn DSC proactively</div>
          <p className="card-desc">
            If prices drop, burn some DSC before your health factor reaches 1.0.
            It's better to reduce debt early than to get liquidated.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Add more collateral</div>
          <p className="card-desc">
            Depositing more WETH or WBTC instantly increases your health factor.
            Keep some in your wallet as a reserve for volatile periods.
          </p>
        </div>
      </div>

      <Callout type="warning" title="Partial liquidation">
        Liquidators don't have to repay your entire debt. They can choose any amount. This means
        even a partial liquidation reduces your debt and (usually) improves your health factor.
        However, you still lose the collateral corresponding to the liquidated amount plus the bonus.
      </Callout>

      <div className="page-nav">
        <Link to="/concepts/health-factor" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Health Factor</span>
        </Link>
        <Link to="/concepts/yield" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Yield Aggregator →</span>
        </Link>
      </div>
    </div>
  )
}
