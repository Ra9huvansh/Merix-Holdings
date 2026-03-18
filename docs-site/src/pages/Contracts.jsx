import { Link } from 'react-router-dom'
import Callout from '../components/Callout'

export default function Contracts() {
  return (
    <div>
      <div className="page-eyebrow">Protocol Reference</div>
      <h1 className="page-title">Smart Contracts</h1>
      <p className="page-subtitle">
        Every contract address, key function, and on-chain event — all in one place.
      </p>

      <h2 className="section-heading">Deployed contracts (Sepolia)</h2>

      <div className="address-row">
        <span className="address-label">DSCEngine</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0x9E1D25C37bf92AC2353df4802E123f7D070f4931" target="_blank" rel="noopener noreferrer">
            0x9E1D25C37bf92AC2353df4802E123f7D070f4931
          </a>
        </span>
      </div>
      <div className="address-row">
        <span className="address-label">DecentralizedStableCoin</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0x467C5F2153c11feC84A60ea45b28a19F47DA0b15" target="_blank" rel="noopener noreferrer">
            0x467C5F2153c11feC84A60ea45b28a19F47DA0b15
          </a>
        </span>
      </div>
      <div className="address-row">
        <span className="address-label">YieldAggregator</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0x088025Beb69c5691145c8d6DC43138eF8C4A4d41" target="_blank" rel="noopener noreferrer">
            0x088025Beb69c5691145c8d6DC43138eF8C4A4d41
          </a>
        </span>
      </div>
      <div className="address-row">
        <span className="address-label">RedemptionContract</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0xFe35219450b891dcb01EcADC59A0e4aD044295f2" target="_blank" rel="noopener noreferrer">
            0xFe35219450b891dcb01EcADC59A0e4aD044295f2
          </a>
        </span>
      </div>
      <div className="address-row">
        <span className="address-label">WETH (Sepolia)</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0xdd13E55209Fd76AfE204dBda4007C227904f0a81" target="_blank" rel="noopener noreferrer">
            0xdd13E55209Fd76AfE204dBda4007C227904f0a81
          </a>
        </span>
      </div>
      <div className="address-row">
        <span className="address-label">WBTC (Sepolia)</span>
        <span className="address-value">
          <a href="https://sepolia.etherscan.io/address/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" target="_blank" rel="noopener noreferrer">
            0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
          </a>
        </span>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">DSCEngine.sol</h2>
      <p>
        The core of the protocol. All collateral management, minting, burning, and liquidation
        logic lives here. It owns the DSC token contract — only DSCEngine can mint or burn DSC.
      </p>

      <h3 className="sub-heading">Write functions</h3>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>depositCollateral</code></td>
              <td><code>tokenAddress, amount</code></td>
              <td>Lock WETH or WBTC into the protocol. Increases your borrowing power.</td>
            </tr>
            <tr>
              <td><code>mintDsc</code></td>
              <td><code>amountDscToMint</code></td>
              <td>Create DSC tokens against your deposited collateral. Health factor must remain above 1.0.</td>
            </tr>
            <tr>
              <td><code>redeemCollateral</code></td>
              <td><code>tokenAddress, amount</code></td>
              <td>Withdraw collateral. Reverts if health factor would drop below 1.0.</td>
            </tr>
            <tr>
              <td><code>burnDsc</code></td>
              <td><code>amount</code></td>
              <td>Destroy DSC to reduce your debt. Improves health factor.</td>
            </tr>
            <tr>
              <td><code>depositCollateralAndMintDsc</code></td>
              <td><code>token, collatAmount, dscAmount</code></td>
              <td>Convenience function — deposit and mint in a single transaction.</td>
            </tr>
            <tr>
              <td><code>redeemCollateralForDsc</code></td>
              <td><code>token, collatAmount, dscAmount</code></td>
              <td>Convenience function — burn DSC and redeem collateral in one transaction.</td>
            </tr>
            <tr>
              <td><code>liquidate</code></td>
              <td><code>collateral, user, debtToCover</code></td>
              <td>Repay a user's DSC debt and claim their collateral + 10% bonus. User must have health factor below 1.0.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="sub-heading">Read functions</h3>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Returns</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>getHealthFactor(user)</code></td>
              <td><code>uint256</code></td>
              <td>Returns health factor scaled to 1e18. Value below 1e18 = liquidatable.</td>
            </tr>
            <tr>
              <td><code>getAccountInformation(user)</code></td>
              <td><code>totalDscMinted, collateralValueInUsd</code></td>
              <td>Returns DSC debt and total collateral value for any address.</td>
            </tr>
            <tr>
              <td><code>getAccountCollateralValue(user)</code></td>
              <td><code>uint256</code></td>
              <td>Total USD value of all collateral held by a user.</td>
            </tr>
            <tr>
              <td><code>getCollateralBalanceOfUser(user, token)</code></td>
              <td><code>uint256</code></td>
              <td>How much of a specific token a user has deposited.</td>
            </tr>
            <tr>
              <td><code>getUsdValue(token, amount)</code></td>
              <td><code>uint256</code></td>
              <td>Convert a token amount to its current USD value via Chainlink.</td>
            </tr>
            <tr>
              <td><code>getTokenAmountFromUsd(token, usdAmount)</code></td>
              <td><code>uint256</code></td>
              <td>Convert a USD amount to the equivalent token amount.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="sub-heading">Events</h3>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Parameters</th>
              <th>Emitted when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>CollateralDeposited</code></td>
              <td><code>user, token, amount</code></td>
              <td>Any collateral deposit succeeds</td>
            </tr>
            <tr>
              <td><code>CollateralRedeemed</code></td>
              <td><code>redeemedFrom, redeemedTo, token, amount</code></td>
              <td>Collateral is withdrawn or liquidated</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">DecentralizedStableCoin.sol</h2>
      <p>
        The ERC-20 token contract for DSC. Owned exclusively by <code>DSCEngine</code>.
        Users can call <code>burn()</code> directly to destroy their own tokens.
        Only <code>DSCEngine</code> can call <code>mint()</code>.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Access</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>mint(to, amount)</code></td>
              <td>Owner only (DSCEngine)</td>
              <td>Creates new DSC tokens. Called when a user mints via the engine.</td>
            </tr>
            <tr>
              <td><code>burn(amount)</code></td>
              <td>Token holder</td>
              <td>Destroys DSC from the caller's balance.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">YieldAggregator.sol</h2>
      <p>
        The ERC4626-style vault for DSC yield. Fully independent from <code>DSCEngine</code>.
        Tracks <code>realizedProfit</code> per user — profit earned on withdrawals that can
        be converted to WETH collateral via <code>RedemptionContract</code>.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Access</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>depositToStrategy(strategyId, amount)</code></td>
              <td>Public</td>
              <td>Deposit DSC into a specific yield strategy. Mints proportional yDSC shares.</td>
            </tr>
            <tr>
              <td><code>withdrawFromStrategy(strategyId, dscAmount)</code></td>
              <td>Public</td>
              <td>Withdraw DSC from a strategy. Profit above principal is added to <code>realizedProfit</code>.</td>
            </tr>
            <tr>
              <td><code>withdrawRemainingShares()</code></td>
              <td>Public</td>
              <td>Burns all remaining yDSC shares when strategy deposits are zero. Recovers residual yield shares that would otherwise be stuck.</td>
            </tr>
            <tr>
              <td><code>deductRealizedProfit(user, amount)</code></td>
              <td>RedemptionContract only</td>
              <td>Reduces a user's realized profit balance after a successful redemption, preventing double-spend.</td>
            </tr>
            <tr>
              <td><code>fundYieldReserve(amount)</code></td>
              <td>Owner only</td>
              <td>Pre-fund the vault with DSC to back yield payouts.</td>
            </tr>
            <tr>
              <td><code>setRedemptionContract(address)</code></td>
              <td>Owner only</td>
              <td>Authorises the RedemptionContract to call <code>deductRealizedProfit</code>.</td>
            </tr>
            <tr>
              <td><code>getUserInfo(user)</code></td>
              <td>View</td>
              <td>Returns shares, principal, realizedProfit, and current value for any address.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="page-divider" />

      <h2 className="section-heading">RedemptionContract.sol</h2>
      <p>
        Converts a user's realized yield profit (in DSC) into WETH collateral directly inside DSCEngine.
        The DSC is burned permanently and equivalent WETH — priced via the <strong>live Chainlink oracle</strong> — is
        deposited as collateral on the user's behalf, immediately improving their health factor.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Access</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>redeemDscForWeth(dscAmount)</code></td>
              <td>Public</td>
              <td>Burns DSC and deposits equivalent WETH as collateral. Amount must not exceed caller's <code>realizedProfit</code> in YieldAggregator.</td>
            </tr>
            <tr>
              <td><code>fund(wethAmount)</code></td>
              <td>Owner only</td>
              <td>Pre-funds the contract with WETH to back future redemptions.</td>
            </tr>
            <tr>
              <td><code>getWethBalance()</code></td>
              <td>View</td>
              <td>Returns current WETH reserve held by the contract.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="warning" title="Redemption cap enforced on-chain">
        <code>redeemDscForWeth</code> will revert with <code>ExceedsRealizedProfit</code> if you attempt
        to redeem more DSC than your recorded realized profit in YieldAggregator. You cannot redeem
        DSC that came from minting or other sources — only earned yield profit qualifies.
      </Callout>

      <Callout type="info">
        All contracts are open source. View and verify the code on{' '}
        <a href="https://github.com/Ra9huvansh/Merix-Holdings" target="_blank" rel="noopener noreferrer">GitHub</a>.
      </Callout>

      <div className="page-nav">
        <Link to="/concepts/yield" className="page-nav-link">
          <span className="page-nav-direction">← Previous</span>
          <span className="page-nav-title">Yield Aggregator</span>
        </Link>
        <Link to="/reference/security" className="page-nav-link next">
          <span className="page-nav-direction">Next</span>
          <span className="page-nav-title">Security →</span>
        </Link>
      </div>
    </div>
  )
}
