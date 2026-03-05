import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function TheStablecoin() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">The Stablecoin — DSC</h1>
      <p className="page-subtitle">
        DSC is the dollar-pegged token at the heart of the Merix Holdings protocol.
        Here's what it is, how it stays at $1.00, and how you get it.
      </p>

      <h2 className="section-heading">What is a stablecoin?</h2>
      <p>
        Most cryptocurrencies swing wildly in price. Bitcoin might be $60,000 today and
        $40,000 next month. That's great for investing — but terrible if you need to
        actually pay for something, or just want to hold value without the stress.
      </p>
      <p>
        A <strong>stablecoin</strong> is a cryptocurrency designed to always be worth $1.00.
        Think of it as a digital dollar that lives on a blockchain. You can send it globally
        in seconds, earn yield on it, and use it in DeFi — all while knowing it won't drop 30%
        overnight.
      </p>

      <h2 className="section-heading">How DSC keeps its $1.00 peg</h2>
      <p>
        Unlike stablecoins backed by actual dollars in a bank account (like USDC), DSC is
        backed by crypto collateral. This sounds risky — but the math makes it rock solid:
      </p>

      <div className="card-grid card-grid-2" style={{ margin: '24px 0' }}>
        <div className="card">
          <div className="card-title">Over-Collateralized</div>
          <p className="card-desc">
            For every $1 of DSC in circulation, there is at least $2 of collateral locked
            in the protocol. Even if the collateral drops 40%, DSC is still fully backed.
          </p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-title">Real-Time Price Feeds</div>
          <p className="card-desc">
            Chainlink oracles feed live ETH/USD and BTC/USD prices into the protocol
            every few minutes. Collateral values are always up-to-date.
          </p>
        </div>
        <div className="card">
          <div className="card-title">Liquidation Mechanism</div>
          <p className="card-desc">
            If a position becomes under-collateralized, it can be liquidated —
            keeping the protocol solvent and DSC's backing strong.
          </p>
        </div>
        <div className="card">
          <div className="card-title">No Governance</div>
          <p className="card-desc">
            No one can change the rules. No vote can reduce your collateral ratio
            or change what DSC is backed by. The rules are written in code.
          </p>
        </div>
      </div>

      <Callout type="info" title="Similar to DAI">
        Merix Holdings is inspired by MakerDAO's DAI stablecoin — but simpler. No governance token,
        no stability fees, no complex multi-collateral system. Just pure, clean math.
      </Callout>

      <h2 className="section-heading">DSC vs other stablecoins</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>DSC</th>
              <th>USDC</th>
              <th>DAI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Backed by</td>
              <td>WETH &amp; WBTC on-chain</td>
              <td>USD in a bank account</td>
              <td>Multiple crypto assets</td>
            </tr>
            <tr>
              <td>Custodian</td>
              <td><strong>No custodian — smart contract</strong></td>
              <td>Circle (company)</td>
              <td>MakerDAO (DAO)</td>
            </tr>
            <tr>
              <td>Can be frozen?</td>
              <td><strong>No</strong></td>
              <td>Yes (by Circle)</td>
              <td>Partially</td>
            </tr>
            <tr>
              <td>Fees</td>
              <td><strong>None</strong></td>
              <td>None</td>
              <td>Stability fee (interest)</td>
            </tr>
            <tr>
              <td>Transparency</td>
              <td>Fully on-chain</td>
              <td>Off-chain audits</td>
              <td>Fully on-chain</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="section-heading">Minting DSC</h2>
      <p>
        You create ("mint") DSC by putting up collateral. The maximum amount you can mint is
        50% of your collateral's current USD value. This ensures the protocol is always
        at least 200% collateralized.
      </p>
      <p>
        Example: If you deposit $1,000 worth of WETH, you can mint up to 500 DSC.
        Each DSC is worth $1.00, so you've essentially borrowed $500 against your $1,000 position.
      </p>

      <Callout type="tip" title="Don't mint the maximum">
        Minting all 500 DSC in the example above would put your health factor at exactly 1.0 —
        dangerously close to liquidation. Mint 60–70% of your maximum to give yourself a safety buffer.
      </Callout>

      <h2 className="section-heading">Burning DSC</h2>
      <p>
        To get your collateral back, you need to "burn" (destroy) your DSC. Burning reduces your
        debt. Once you burn all your DSC, your full collateral is free to withdraw.
      </p>
      <p>
        You can also burn DSC at any time to improve your health factor — useful if the price of
        your collateral drops and your position becomes riskier.
      </p>

      <div className="formula-box">
        <div className="formula-text">
          DSC you can mint = (Collateral Value in USD × 50%)<br />
          Collateral you can withdraw = (DSC Burned / 50%)
        </div>
        <p className="formula-note">The collateral ratio is fixed at 200% — $2 of collateral per $1 of DSC</p>
      </div>

      <h2 className="section-heading">DSC token details</h2>
      <div className="address-row">
        <span className="address-label">Contract Address</span>
        <span className="address-value">0x9AF0bEF4048DCb7a336741058A04B31A35D0A934</span>
      </div>
      <div className="address-row">
        <span className="address-label">Network</span>
        <span className="address-value">Ethereum Sepolia (Chain ID: 11155111)</span>
      </div>
      <div className="address-row">
        <span className="address-label">Token Standard</span>
        <span className="address-value">ERC-20 (Burnable)</span>
      </div>
      <div className="address-row">
        <span className="address-label">Symbol</span>
        <span className="address-value">DSC</span>
      </div>

      <div className="page-nav">
        <Link to="/getting-started" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Getting Started</span>
        </Link>
        <Link to="/concepts/collateral" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Collateral →</span>
        </Link>
      </div>
    </div>
  )
}
