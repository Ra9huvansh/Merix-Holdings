import { useState } from 'react'
import { Link } from 'react-router-dom'

const faqs = [
  {
    q: "Is my collateral safe? Can Merix Holdings take my crypto?",
    a: "No. Your collateral is held in a smart contract on Ethereum — not by Merix Holdings or any company. The code is open source and verifiable on Etherscan. There is no admin function to withdraw user collateral. The only way collateral leaves the contract is if you redeem it yourself or if your position is liquidated (which only happens if your health factor drops below 1.0 due to price movements)."
  },
  {
    q: "What happens if ETH crashes 50%?",
    a: "If ETH drops 50% and you were at maximum borrowing capacity (health factor = 1.0), your position would be eligible for liquidation. A liquidator would repay some of your DSC debt and take your collateral plus a 10% bonus. This is why we strongly recommend never minting the maximum amount — keep your health factor above 1.5 to absorb price drops. If your health factor is 2.0 or above, even a 50% drop in ETH leaves you with a health factor of 1.0, which is still safe."
  },
  {
    q: "Can I lose more than I put in?",
    a: "No. Your maximum loss is your deposited collateral. You cannot lose more than what you put in. In the worst case (complete collateral liquidation), you keep all the DSC you minted and lose the corresponding collateral. Since you minted at most 50% of your collateral's value, the DSC you have is worth at least as much as what was taken."
  },
  {
    q: "What's the difference between DSC and USDC?",
    a: "USDC is backed by real US dollars held in a bank account by a company called Circle. Circle can freeze your USDC if ordered to by a government. Merix Holdings' DSC is backed by crypto collateral in a smart contract — no company holds it, no one can freeze it, and it's fully transparent on-chain. The tradeoff is that DSC requires over-collateralization to maintain its peg, while USDC is backed 1:1."
  },
  {
    q: "Is there a protocol fee or interest rate?",
    a: "No. Merix Holdings charges zero protocol fees. You don't pay interest on your DSC debt. The only costs are standard Ethereum gas fees for transactions, which on the Sepolia testnet are paid with free test ETH."
  },
  {
    q: "What is WETH and why can't I just use ETH?",
    a: "ETH is Ethereum's native currency — it predates the ERC-20 token standard and doesn't conform to it. WETH (Wrapped ETH) is ETH that's been deposited into a smart contract in exchange for an ERC-20 token worth exactly 1 ETH. Smart contracts can easily handle ERC-20 tokens but require special handling for native ETH. WETH simplifies everything. 1 WETH = 1 ETH at all times — you can convert between them instantly and for free (only gas)."
  },
  {
    q: "How does the Yield Aggregator earn yield?",
    a: "The Yield Aggregator uses simulated yield strategies that grow the vault's total assets over time. On every deposit or withdrawal, a harvest function runs that adds simulated yield based on each strategy's configured APY and the time elapsed. This grows the share price — meaning each yDSC share buys progressively more DSC over time. The owner pre-funds the vault with DSC to ensure withdrawals including yield can always be processed."
  },
  {
    q: "Can I deposit into the Yield Aggregator and still be safe from liquidation?",
    a: "Yes, completely. The Yield Aggregator operates on a separate contract that has nothing to do with DSCEngine. Depositing DSC into the vault does not affect your collateral balance, your DSC debt, or your health factor. Your collateral position and your yield position are entirely independent."
  },
  {
    q: "How do I become a liquidator?",
    a: "Go to the Liquidate tab in the app. The scanner automatically fetches all positions with a health factor below 1.0. Select a position, enter how much debt you want to cover, and confirm the transaction. You need to hold the DSC you're repaying in your wallet. In return, you receive the equivalent collateral value plus a 10% bonus — a guaranteed profit on every successful liquidation."
  },
  {
    q: "How does the AI Transaction Verifier work?",
    a: "The Verify TX tab lets you paste any Ethereum transaction hash or raw calldata. The tool extracts the 4-byte function selector, resolves it against the protocol's ABI and the 4byte.directory database, then sends the full calldata to a large language model (locally via Ollama, or via Groq as a cloud fallback). The LLM analyzes the transaction for suspicious patterns and returns a risk rating from Safe to Critical. This helps you verify transactions before signing them in MetaMask."
  },
  {
    q: "Is this on mainnet? Can I use real money?",
    a: "Currently, Merix Holdings is deployed on Ethereum's Sepolia testnet only. All tokens have no real monetary value. Mainnet deployment is a future milestone. Do not attempt to use real ETH or BTC with this protocol."
  },
  {
    q: "Where is the source code?",
    a: "The full source code is available on GitHub at github.com/Ra9huvansh/Merix-Holdings. The smart contracts are in the src/ directory, the frontend in frontend/, and the documentation site in docs-site/."
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        {q}
        <svg className="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="faq-answer">
        <p>{a}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  return (
    <div>
      <div className="page-eyebrow">Help</div>
      <h1 className="page-title">Frequently Asked Questions</h1>
      <p className="page-subtitle">
        Everything you need to know before putting your money to work.
        Can't find an answer? Reach out on{' '}
        <a href="https://x.com/Raghuvansh95" target="_blank" rel="noopener noreferrer">Twitter</a>.
      </p>

      <div style={{ marginTop: '32px' }}>
        {faqs.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="page-divider" />

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px',
        textAlign: 'center',
        marginTop: '48px'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: '12px'
        }}>
          Ready to get started?
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
          Connect your wallet and start minting stablecoins against your crypto assets today.
        </p>
        <a
          href="https://merix-holdings.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: '24px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 0.15s ease'
          }}
        >
          Launch the App
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      <div className="page-nav">
        <Link to="/reference/security" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Security</span>
        </Link>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  )
}
