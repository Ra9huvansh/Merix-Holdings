import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function GettingStarted() {
  return (
    <div>
      <div className="page-eyebrow">Introduction</div>
      <h1 className="page-title">Getting Started</h1>
      <p className="page-subtitle">
        From zero to minting your first DSC in five minutes.
        Here's exactly what you need and what to do.
      </p>

      <h2 className="section-heading">What you need</h2>

      <div className="card-grid card-grid-3">
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M16 12h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-title">MetaMask</div>
          <p className="card-desc">A browser wallet. Download from metamask.io if you don't have it.</p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-title">Sepolia Network</div>
          <p className="card-desc">The protocol runs on Ethereum's Sepolia testnet. Switch your wallet to Sepolia.</p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-title">Test ETH + WETH</div>
          <p className="card-desc">Get free Sepolia ETH from a faucet, then wrap it to WETH for use as collateral.</p>
        </div>
      </div>

      <Callout type="info" title="Testnet only">
        Merix Holdings currently runs on Sepolia — Ethereum's test network. This means you use
        test tokens that have no real monetary value. It's a safe environment to learn and experiment.
      </Callout>

      <div className="page-divider" />

      <h2 className="section-heading">Step-by-step guide</h2>

      <div className="steps">
        <div className="step-item">
          <div className="step-number">1</div>
          <div className="step-body">
            <div className="step-title">Install MetaMask</div>
            <p className="step-desc">
              Go to <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">metamask.io</a> and
              install the browser extension. Create a new wallet and save your seed phrase somewhere safe —
              this is your master key. Never share it with anyone.
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">2</div>
          <div className="step-body">
            <div className="step-title">Switch to Sepolia Testnet</div>
            <p className="step-desc">
              Open MetaMask → click the network dropdown at the top → select <strong>Sepolia test network</strong>.
              If you don't see it, go to Settings → Advanced → turn on "Show test networks".
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">3</div>
          <div className="step-body">
            <div className="step-title">Get Sepolia ETH</div>
            <p className="step-desc">
              You need test ETH to pay for gas (transaction fees). Visit a faucet like{' '}
              <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer">sepoliafaucet.com</a>{' '}
              or the <a href="https://faucet.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer">Alchemy Sepolia Faucet</a>.
              Paste your wallet address and receive free test ETH within seconds.
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">4</div>
          <div className="step-body">
            <div className="step-title">Get WETH (Wrapped ETH)</div>
            <p className="step-desc">
              The protocol accepts <strong>WETH</strong> as collateral, not plain ETH.
              WETH is just ETH wrapped in an ERC20 token — they're always worth exactly the same.
              You can get Sepolia WETH from the Uniswap Sepolia interface or directly from the
              WETH contract at <code>0xdd13E55209Fd76AfE204dBda4007C227904f0a81</code>.
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">5</div>
          <div className="step-body">
            <div className="step-title">Connect your wallet</div>
            <p className="step-desc">
              Visit the <a href="https://merix-holdings-nine.vercel.app" target="_blank" rel="noopener noreferrer">Merix Holdings app</a>.
              Click <strong>"Connect Wallet"</strong> on the landing page. MetaMask will pop up — select your account
              and confirm. You'll be taken straight to the dashboard.
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">6</div>
          <div className="step-body">
            <div className="step-title">Deposit Collateral</div>
            <p className="step-desc">
              Navigate to the <strong>Deposit</strong> tab. Select WETH, enter an amount, and click Deposit.
              MetaMask will ask you to approve the token first (a one-time step), then confirm the deposit.
              Once confirmed, your collateral appears on the dashboard.
            </p>
          </div>
        </div>

        <div className="step-item">
          <div className="step-number">7</div>
          <div className="step-body">
            <div className="step-title">Mint DSC</div>
            <p className="step-desc">
              Go to the <strong>Mint DSC</strong> tab. You'll see how much DSC you can safely mint.
              Enter an amount — keep your health factor above 1.5 to stay safe — and confirm.
              DSC tokens will appear in your wallet immediately.
            </p>
          </div>
        </div>
      </div>

      <Callout type="warning" title="Keep your health factor healthy">
        Your health factor must stay above 1.0 at all times. If it drops below 1.0, your position
        can be liquidated. We strongly recommend staying above 1.5 as a safety buffer.
        Read more about the <Link to="/concepts/health-factor">Health Factor</Link>.
      </Callout>

      <Callout type="tip" title="Put your DSC to work">
        Once you've minted DSC, don't let it sit idle. Head to the <strong>Yield</strong> tab
        and deposit your DSC into one of five strategies — XAU, XAG, Aave, Compound, or Uniswap LP —
        to earn passive income completely separate from your collateral position.
        Learn more in the <Link to="/concepts/yield">Yield Aggregator</Link> docs.
      </Callout>

      <div className="page-divider" />

      <h2 className="section-heading">Understanding your dashboard</h2>
      <p>Once connected, your dashboard shows four key numbers:</p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>What it means</th>
              <th>What to aim for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Health Factor</strong></td>
              <td>How safe your position is. Calculated from your collateral value vs your DSC debt.</td>
              <td><span className="badge badge-green">Above 1.5</span></td>
            </tr>
            <tr>
              <td><strong>Total Collateral</strong></td>
              <td>USD value of all assets you've deposited as collateral.</td>
              <td>The higher, the safer</td>
            </tr>
            <tr>
              <td><strong>DSC Minted</strong></td>
              <td>How many DSC tokens you've created (your debt).</td>
              <td>Max 50% of collateral</td>
            </tr>
            <tr>
              <td><strong>DSC Balance</strong></td>
              <td>How many DSC tokens are in your wallet right now.</td>
              <td>Should equal DSC Minted if you haven't spent any</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="page-nav">
        <Link to="/" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Overview</span>
        </Link>
        <Link to="/concepts/stablecoin" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">The Stablecoin (DSC) →</span>
        </Link>
      </div>
    </div>
  )
}
