import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Collateral() {
  return (
    <div>
      <div className="page-eyebrow">Core Concepts</div>
      <h1 className="page-title">Collateral</h1>
      <p className="page-subtitle">
        Collateral is the crypto you lock up to borrow against. Understanding how it
        works is key to managing your position safely.
      </p>

      <h2 className="section-heading">What is collateral?</h2>
      <p>
        Think of collateral like a pawnshop. You bring in a valuable item — say, a gold watch.
        The pawnshop gives you cash in return. You get the watch back when you return the cash.
        If you never come back, they keep the watch.
      </p>
      <p>
        Merix Holdings works the same way. You bring in WETH or WBTC (valuable crypto assets).
        The protocol gives you DSC (digital dollars) in return. You get your crypto back when
        you return the DSC. If your collateral drops too much in value, the protocol liquidates it
        to protect itself.
      </p>
      <p>
        The key difference from a pawnshop: <strong>no human is involved</strong>. The entire
        process is automated by smart contracts running on Ethereum.
      </p>

      <h2 className="section-heading">Accepted collateral</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Full Name</th>
              <th>What it is</th>
              <th>Contract (Sepolia)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>WETH</strong></td>
              <td>Wrapped Ether</td>
              <td>Ethereum wrapped as an ERC-20 token. Worth exactly 1 ETH at all times.</td>
              <td><code>0xdd13...f0a81</code></td>
            </tr>
            <tr>
              <td><strong>WBTC</strong></td>
              <td>Wrapped Bitcoin</td>
              <td>Bitcoin represented on Ethereum. Worth exactly 1 BTC at all times.</td>
              <td><code>0x8f3C...6A063</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="info" title="Why not plain ETH?">
        Ethereum's native ETH is not an ERC-20 token, so it can't be handled by smart contracts
        the same way. WETH (Wrapped ETH) solves this — it's ETH that's been "wrapped" into a
        standard token format. 1 WETH = 1 ETH, always.
      </Callout>

      <h2 className="section-heading">Why over-collateralize?</h2>
      <p>
        The protocol requires you to lock up <strong>more value than you borrow</strong>. Specifically,
        at least $2 of collateral for every $1 of DSC. This might seem inefficient — why lock $200 to
        get $100? — but it's essential for safety.
      </p>
      <p>
        Crypto prices move fast. If you could borrow $100 against $100 of ETH and ETH dropped 10%,
        your collateral would only be worth $90 — meaning there's not enough to back the $100 you borrowed.
        The protocol would be insolvent.
      </p>
      <p>
        By requiring 200% collateralization, the protocol can absorb a 40% drop in collateral value
        before the backing becomes insufficient. This is the safety buffer that keeps DSC at $1.00.
      </p>

      <div className="formula-box">
        <div className="formula-text">
          Minimum Collateral = DSC Minted × 2<br />
          Maximum DSC = Collateral Value × 50%
        </div>
        <p className="formula-note">The 50% threshold is called the Liquidation Threshold</p>
      </div>

      <h2 className="section-heading">How collateral is valued</h2>
      <p>
        The protocol doesn't guess the price of WETH or WBTC. It reads the price from
        <strong> Chainlink price feeds</strong> — a decentralized network of nodes that
        aggregate prices from dozens of exchanges and publish a tamper-resistant USD price.
      </p>
      <p>
        This happens automatically every time you interact with the protocol. Your collateral's
        USD value is always calculated using the latest on-chain price. If ETH is $3,000,
        1 WETH is worth $3,000 in the protocol's eyes.
      </p>

      <Callout type="warning" title="Collateral value fluctuates">
        Because WETH and WBTC prices change constantly, your health factor changes too —
        even when you're not doing anything. A significant drop in ETH or BTC price can
        push your health factor closer to 1.0. Monitor your position regularly.
      </Callout>

      <h2 className="section-heading">Depositing collateral</h2>
      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">Approve the token</div>
            <p className="step-desc">
              The first time you deposit a token, you need to approve the DSCEngine contract
              to spend it on your behalf. This is a standard ERC-20 step. You'll see an
              "Approve" transaction in MetaMask before the deposit.
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Confirm the deposit</div>
            <p className="step-desc">
              After approval, MetaMask shows the actual deposit transaction. Confirm it.
              Gas fees on Sepolia are free (paid with test ETH).
            </p>
          </div>
        </div>
        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">Check your dashboard</div>
            <p className="step-desc">
              Once the transaction is mined, your dashboard updates to show the new
              collateral balance and your increased borrowing power.
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-heading">Withdrawing collateral</h2>
      <p>
        You can withdraw collateral at any time — <strong>as long as your health factor stays
        above 1.0 after the withdrawal</strong>. If withdrawing would drop your health factor
        below 1.0, the transaction will revert.
      </p>
      <p>
        To withdraw all your collateral, first burn all your outstanding DSC to bring your
        debt to zero. Then you can withdraw 100% of your collateral with no restrictions.
      </p>

      <div className="page-nav">
        <Link to="/concepts/stablecoin" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">The Stablecoin (DSC)</span>
        </Link>
        <Link to="/concepts/health-factor" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Health Factor →</span>
        </Link>
      </div>
    </div>
  )
}
