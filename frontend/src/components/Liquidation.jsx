import { useState } from "react";
import { ethers } from "ethers";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatAddress, formatUSD, formatHealthFactor } from "../utils/formatting";

const Liquidation = () => {
  const { liquidate, loading, fetchAtRiskPositions } = useDSCEngine();
  const [collateralAddress, setCollateralAddress] = useState(WETH_ADDRESS);
  const [userAddress, setUserAddress] = useState("");
  const [debtToCover, setDebtToCover] = useState("");

  const [atRiskPositions, setAtRiskPositions] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const availableTokens = [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean);

  const handleScan = async () => {
    setScanning(true);
    try {
      const positions = await fetchAtRiskPositions();
      setAtRiskPositions(positions);
      setScanned(true);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectPosition = (position) => {
    setUserAddress(position.address);
    setDebtToCover("");
  };

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
      setAtRiskPositions([]);
      setScanned(false);
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
        <strong>Warning:</strong> Only liquidate positions with health factor &lt; 1.0.
        You need to have enough DSC to cover the debt.
      </div>

      {/* At-Risk Position Scanner */}
      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          className="submit-button"
          onClick={handleScan}
          disabled={scanning}
          style={{ marginBottom: "1rem" }}
        >
          {scanning ? "Scanning blockchain..." : "Scan for At-Risk Positions"}
        </button>

        {scanned && atRiskPositions.length === 0 && (
          <p style={{ color: "#4ade80", fontSize: "0.875rem" }}>
            No positions with health factor below 1.0 found.
          </p>
        )}

        {atRiskPositions.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem", color: "#f59e0b" }}>
              {atRiskPositions.length} at-risk position{atRiskPositions.length > 1 ? "s" : ""} found. Click a row to pre-fill the form.
            </p>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#9ca3af" }}>Address</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#9ca3af" }}>Collateral (USD)</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#9ca3af" }}>Debt (DSC)</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", color: "#9ca3af" }}>Health Factor</th>
                  <th style={{ padding: "0.5rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {atRiskPositions.map((pos) => (
                  <tr
                    key={pos.address}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelectPosition(pos)}
                  >
                    <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>
                      {formatAddress(pos.address)}
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>
                      {formatUSD(pos.collateralValueInUsd)}
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>
                      {parseFloat(ethers.formatUnits(pos.totalDscMinted, 18)).toFixed(4)} DSC
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "right", color: "#ef4444", fontWeight: "bold" }}>
                      {formatHealthFactor(pos.healthFactor)}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        className="submit-button danger"
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                        onClick={(e) => { e.stopPropagation(); handleSelectPosition(pos); }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Liquidation Form */}
      <form onSubmit={handleSubmit} className="action-form">
        <div className="form-group">
          <label>Collateral Token to Receive</label>
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
            placeholder="0x... (select from table above or enter manually)"
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

