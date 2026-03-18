import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Redemption() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">Redemption Contract</h1>
      <p className="page-subtitle">
        Convert your realized yield profit directly into WETH collateral — burning DSC
        and improving your health factor in a single transaction.
      </p>

      <h2 className="section-heading">What does it do?</h2>
      <p>
        After withdrawing from the Yield Aggregator and realizing a profit, you hold extra DSC
        in your wallet. The <strong>Redemption Contract</strong> lets you convert that profit DSC
        into WETH collateral deposited directly inside DSCEngine — without any manual steps.
      </p>
      <p>
        The DSC is <strong>permanently burned</strong> (reducing total supply) and the equivalent
        value in WETH is deposited as collateral on your behalf. Your health factor improves
        immediately.
      </p>

      <Callout type="tip" title="One transaction, two effects">
        A single call to <code>redeemDscForWeth</code> burns your DSC <em>and</em> increases
        your collateral. You don't need to acquire WETH separately or make a second deposit.
      </Callout>

      <h2 className="section-heading">How it works — step by step</h2>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">Profit cap check</div>
            <p className="step-desc">
              The contract reads your <code>realizedProfit</code> balance from <code>YieldAggregator</code>.
              If your requested amount exceeds it, the transaction reverts immediately with
              <code> ExceedsRealizedProfit</code>. You can only redeem DSC you actually earned as yield —
              not DSC from minting or any other source.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Live price conversion</div>
            <p className="step-desc">
              The WETH amount is calculated using the <strong>live Chainlink ETH/USD price feed</strong>
              via <code>DSCEngine.getTokenAmountFromUsd()</code>. There is no hardcoded price —
              you always get the market rate at the time of the transaction.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">DSC burned</div>
            <p className="step-desc">
              Your DSC is transferred to DSCEngine and burned via <code>burnExternal()</code>.
              This reduces total DSC supply but does <em>not</em> reduce your <code>s_DSCMinted</code>
              debt — the burned DSC came from yield profit, not from your own minted position.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">4</div>
          <div className="step-body">
            <div className="step-title">WETH deposited as collateral</div>
            <p className="step-desc">
              The contract calls <code>DSCEngine.depositCollateralFor(user, WETH, wethOut)</code>,
              crediting the WETH directly to your collateral balance. Your health factor
              improves instantly.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">5</div>
          <div className="step-body">
            <div className="step-title">Realized profit decremented</div>
            <p className="step-desc">
              Finally, <code>YieldAggregator.deductRealizedProfit(user, amount)</code> is called,
              reducing your on-chain realized profit balance by the redeemed amount.
              This prevents you from redeeming the same profit twice.
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-heading">The profit cap — why it exists</h2>
      <p>
        Without a cap, any DSC holder could call <code>redeemDscForWeth</code> with arbitrary amounts —
        draining the WETH reserve and depositing collateral they didn't earn through yield.
        The <code>realizedProfit</code> mapping in <code>YieldAggregator</code> acts as a strict
        on-chain allowance: it only grows when you withdraw more from the vault than you deposited,
        and it shrinks every time you redeem.
      </p>

      <Callout type="warning" title="realizedProfit ≠ DSC balance">
        Having DSC in your wallet does not mean you can redeem it here. Only DSC earned as
        yield profit — tracked by <code>realizedProfit[user]</code> in YieldAggregator — qualifies.
        The UI shows your available realized profit and disables the button if you exceed it.
      </Callout>

      <h2 className="section-heading">What it does NOT do</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Burns profit DSC</td>
              <td>✅ Yes — DSC supply decreases</td>
            </tr>
            <tr>
              <td>Reduces your <code>s_DSCMinted</code> debt</td>
              <td>❌ No — use <code>burnDsc()</code> for that</td>
            </tr>
            <tr>
              <td>Affects your health factor</td>
              <td>✅ Yes — collateral increases, so health factor improves</td>
            </tr>
            <tr>
              <td>Allows redeeming minted DSC as collateral</td>
              <td>❌ No — only realized yield profit qualifies</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-heading">Contract address (Sepolia)</h2>

      <div className="address-row">
        <span className="address-label">RedemptionContract</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0xFe35219450b891dcb01EcADC59A0e4aD044295f2" target="_blank" rel="noopener noreferrer">
            0xFe35219450b891dcb01EcADC59A0e4aD044295f2
          </a>
        </span>
      </div>

      <div className="page-nav">
        <Link to="/concepts/yield" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Yield Aggregator</span>
        </Link>
        <Link to="/reference/contracts" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Smart Contracts →</span>
        </Link>
      </div>
    </div>
  )
}
