import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatAddress } from "../utils/formatting";

const Liquidation = () => {
  const { liquidate, loading } = useDSCEngine();
  const [collateralAddress, setCollateralAddress] = useState(WETH_ADDRESS);
  const [userAddress, setUserAddress] = useState("");
  const [debtToCover, setDebtToCover] = useState("");

  const availableTokens = [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean);
  const tokenInfo = TOKEN_INFO[collateralAddress?.toLowerCase()] || { symbol: "UNKNOWN" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42) {
      alert("Please enter a valid user address");
      return;
    }
    if (!debtToCover || parseFloat(debtToCover) <= 0) {
      alert("Please enter a valid debt amount");
      return;
    }

    try {
      await liquidate(collateralAddress, userAddress, debtToCover);
      setUserAddress("");
      setDebtToCover("");
      alert("Liquidation successful! You received a 10% bonus.");
    } catch (error) {
      console.error("Error:", error);
      alert("Transaction failed: " + (error.reason || error.message));
    }
  };

  return (
    <div className="action-panel">
      <h2>Liquidate Position</h2>
      <p className="panel-description">
        Liquidate undercollateralized positions. You'll receive a 10% bonus on the collateral
        you liquidate. The user must have a health factor below 1.0.
      </p>

      <div className="warning-box">
        <strong>⚠️ Warning:</strong> Only liquidate positions with health factor &lt; 1.0.
        You need to have enough DSC to cover the debt.
      </div>

      <form onSubmit={handleSubmit} className="action-form">
        <div className="form-group">
          <label>Collateral Token</label>
          <select
            value={collateralAddress}
            onChange={(e) => setCollateralAddress(e.target.value)}
            className="form-input"
          >
            {availableTokens.map((token) => {
              const info = TOKEN_INFO[token.toLowerCase()];
              return (
                <option key={token} value={token}>
                  {info?.symbol || "UNKNOWN"} ({formatAddress(token)})
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label>User Address to Liquidate</label>
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="0x..."
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label>DSC Debt to Cover</label>
          <input
            type="number"
            step="any"
            value={debtToCover}
            onChange={(e) => setDebtToCover(e.target.value)}
            placeholder="0.0"
            className="form-input"
            required
          />
          <small className="form-hint">
            Amount of DSC you want to burn to cover the user's debt
          </small>
        </div>

        <button type="submit" className="submit-button danger" disabled={loading}>
          {loading ? "Processing..." : "Liquidate"}
        </button>
      </form>
    </div>
  );
};

export default Liquidation;

