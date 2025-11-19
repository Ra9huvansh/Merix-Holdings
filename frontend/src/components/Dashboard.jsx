import { useDSCEngine } from "../hooks/useDSCEngine";
import { TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatUnits, formatUSD, formatAddress } from "../utils/formatting";

const Dashboard = () => {
  const { accountInfo, tokenBalances, dscBalance, collateralTokens } = useDSCEngine();

  const getHealthFactorColor = (hf) => {
    if (hf === "∞") return "#10b981";
    const num = parseFloat(hf);
    if (num < 1) return "#ef4444";
    if (num < 2) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="dashboard">
      <h2>Account Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Health Factor</div>
          <div 
            className="stat-value" 
            style={{ color: getHealthFactorColor(accountInfo.healthFactor) }}
          >
            {accountInfo.healthFactor}
          </div>
          <div className="stat-hint">
            {accountInfo.healthFactor === "∞" 
              ? "No debt" 
              : accountInfo.healthFactor < 1 
                ? "⚠️ At risk of liquidation" 
                : "Healthy"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Collateral</div>
          <div className="stat-value">
            {formatUSD(accountInfo.collateralValueInUsd)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">DSC Minted</div>
          <div className="stat-value">
            {formatUnits(accountInfo.totalDscMinted, 18)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">DSC Balance</div>
          <div className="stat-value">
            {formatUnits(dscBalance, 18)}
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Collateral Positions</h3>
        <div className="positions-list">
          {(() => {
            // Get all tokens to display: from contract + from constants
            const allTokens = new Set();
            collateralTokens.forEach(token => allTokens.add(token.toLowerCase()));
            [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean).forEach(token => {
              if (token) allTokens.add(token.toLowerCase());
            });

            if (allTokens.size === 0) {
              return <p className="empty-state">No collateral tokens configured</p>;
            }

            return Array.from(allTokens).map((tokenLower) => {
              const tokenInfo = TOKEN_INFO[tokenLower] || { symbol: "UNKNOWN", decimals: 18 };
              const deposited = accountInfo.collateralBalances[tokenLower] || "0";
              const walletBalance = tokenBalances[tokenLower] || "0";
              
              // Find the original address (with correct case) from collateralTokens or constants
              const tokenAddress = collateralTokens.find(t => t.toLowerCase() === tokenLower) 
                || [WETH_ADDRESS, WBTC_ADDRESS].find(t => t && t.toLowerCase() === tokenLower)
                || tokenLower;

              return (
                <div key={tokenLower} className="position-card">
                  <div className="position-header">
                    <span className="token-symbol">{tokenInfo.symbol}</span>
                    <span className="token-address">{formatAddress(tokenAddress)}</span>
                  </div>
                  <div className="position-details">
                    <div className="position-item">
                      <span>Deposited:</span>
                      <span>{formatUnits(deposited, tokenInfo.decimals)} {tokenInfo.symbol}</span>
                    </div>
                    <div className="position-item">
                      <span>Wallet Balance:</span>
                      <span>{formatUnits(walletBalance, tokenInfo.decimals)} {tokenInfo.symbol}</span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

