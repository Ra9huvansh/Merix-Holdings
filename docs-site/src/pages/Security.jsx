import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Security() {
  return (
    <div>
      <div className="page-eyebrow">Protocol Reference</div>
      <h1 className="page-title">Security</h1>
      <p className="page-subtitle">
        Every layer of Merix Holdings is built with security as the primary concern.
        Here's exactly what protects your assets.
      </p>

      <h2 className="section-heading">Security model overview</h2>

      <div className="card-grid card-grid-2">
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-title">Non-Custodial</div>
          <p className="card-desc">
            Your collateral is held in smart contract code, not by a company.
            No employee can access, freeze, or move your assets.
          </p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-title">Reentrancy Protected</div>
          <p className="card-desc">
            All state-changing functions use OpenZeppelin's <code>ReentrancyGuard</code>,
            preventing attacks where malicious contracts try to re-enter during execution.
          </p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-title">No Admin Keys</div>
          <p className="card-desc">
            The protocol has no pause button, no upgrade function, no emergency backdoor.
            Once deployed, the rules are permanent and immutable.
          </p>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.75"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/>
            </svg>
          </div>
          <div className="card-title">Fully Open Source</div>
          <p className="card-desc">
            Every line of code is public on GitHub. Anyone can verify the logic,
            check for vulnerabilities, and confirm the contract does what it says.
          </p>
        </div>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">Chainlink price feeds & oracle security</h2>
      <p>
        The protocol relies on accurate price data to calculate collateral values and health factors.
        Bad price data could allow undercollateralized minting or unjust liquidations.
        Merix Holdings addresses this with multiple layers:
      </p>

      <h3 className="sub-heading">Decentralized aggregation</h3>
      <p>
        Chainlink aggregates prices from dozens of independent data sources and nodes.
        No single exchange or data provider can manipulate the reported price. The final
        price is the median of all contributing nodes, making it extremely resistant to
        flash loan attacks and market manipulation.
      </p>

      <h3 className="sub-heading">Staleness checks</h3>
      <p>
        <code>OracleLib.sol</code> wraps every Chainlink call with a staleness check.
        If a price feed hasn't updated within the expected heartbeat window, the entire
        protocol enters a paused state — it stops accepting deposits, mints, and liquidations.
      </p>
      <p>
        This prevents a scenario where stale prices allow someone to exploit the system
        by depositing collateral at an outdated (inflated) price.
      </p>

      <pre><code>{`// OracleLib staleness check
function staleCheckLatestRoundData(AggregatorV3Interface feed)
    public view returns (uint80, int256, uint256, uint256, uint80)
{
    (, int256 price,, uint256 updatedAt,) = feed.latestRoundData();
    uint256 secondsSince = block.timestamp - updatedAt;
    if (secondsSince > TIMEOUT) revert OracleLib__StalePrice();
    return feed.latestRoundData();
}`}</code></pre>

      <div className="page-divider" />

      <h2 className="section-heading">Over-collateralization as a security buffer</h2>
      <p>
        The 200% collateralization requirement is itself a security mechanism. Even in a
        scenario where the oracle is slightly off, or a large liquidation needs to be
        processed, the extra collateral provides a cushion that protects DSC holders.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Collateral drop scenario</th>
              <th>At 200% collateral</th>
              <th>DSC still fully backed?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10% price drop</td>
              <td>180% collateral remaining</td>
              <td><span className="badge badge-green">Yes</span></td>
            </tr>
            <tr>
              <td>25% price drop</td>
              <td>150% collateral remaining</td>
              <td><span className="badge badge-green">Yes</span></td>
            </tr>
            <tr>
              <td>40% price drop</td>
              <td>120% collateral remaining</td>
              <td><span className="badge badge-green">Yes</span></td>
            </tr>
            <tr>
              <td>49% price drop</td>
              <td>102% collateral remaining</td>
              <td><span className="badge badge-green">Yes (barely)</span></td>
            </tr>
            <tr>
              <td>50%+ price drop</td>
              <td>Below 100%</td>
              <td><span className="badge badge-orange">Liquidation must occur before this point</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="info" title="Liquidation kicks in before insolvency">
        Positions become liquidatable at a health factor of 1.0 — which corresponds to a
        50% drop in collateral from the point of maximum minting. In practice, the market
        liquidates risky positions long before they become insolvent.
      </Callout>

      <div className="page-divider" />

      <h2 className="section-heading">Access control</h2>
      <p>
        The only privileged action in the protocol is minting DSC — and only
        <code> DSCEngine</code> (the owner of the DSC token) can do this. There is no way
        for a human to call <code>mint()</code> directly. All other functions are permissionless.
      </p>

      <h2 className="section-heading">Health factor enforcement</h2>
      <p>
        Every function that could make a position less safe — minting DSC, withdrawing
        collateral, or partially closing a position — checks the health factor
        <strong> after</strong> the operation would take effect. If the resulting health
        factor is below 1.0, the entire transaction reverts. It is mathematically impossible
        to put your position below 1.0 voluntarily.
      </p>

      <h2 className="section-heading">Invariant tests</h2>
      <p>
        The codebase includes Foundry invariant tests that run 128 rounds at depth 128,
        verifying that critical properties of the protocol can never be violated — for example,
        that the total DSC supply can never exceed the total collateral value.
      </p>

      <pre><code>{`// foundry.toml invariant configuration
[invariant]
runs = 128
depth = 128
fail_on_revert = true`}</code></pre>

      <div className="page-nav">
        <Link to="/reference/contracts" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Smart Contracts</span>
        </Link>
        <Link to="/faq" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">FAQ →</span>
        </Link>
      </div>
    </div>
  )
}
