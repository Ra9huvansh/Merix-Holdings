import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatUnits } from "../utils/formatting";

const RedeemCollateral = () => {
  const { redeemCollateral, redeemCollateralForDsc, accountInfo, loading } = useDSCEngine();
  const [selectedToken, setSelectedToken] = useState(WETH_ADDRESS);
  const [amount, setAmount] = useState("");
  const [dscAmount, setDscAmount] = useState("");
  const [mode, setMode] = useState("redeem"); // "redeem" or "redeemAndBurn"

  const availableTokens = [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean);
  const tokenInfo = TOKEN_INFO[selectedToken?.toLowerCase()] || { symbol: "UNKNOWN", decimals: 18 };
  const deposited = accountInfo.collateralBalances[selectedToken?.toLowerCase()] || "0";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      if (mode === "redeem") {
        await redeemCollateral(selectedToken, amount);
        setAmount("");
        alert("Collateral redeemed successfully!");
      } else {
        if (!dscAmount || parseFloat(dscAmount) <= 0) {
          alert("Please enter a valid DSC amount to burn");
          return;
        }
        await redeemCollateralForDsc(selectedToken, amount, dscAmount);
        setAmount("");
        setDscAmount("");
        alert("Collateral redeemed and DSC burned successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Transaction failed: " + (error.reason || error.message));
    }
  };

  const setMaxAmount = () => {
    setAmount(formatUnits(deposited, tokenInfo.decimals));
  };

  return (
    <div className="action-panel">
      <h2>Redeem Collateral</h2>
      
      <div className="mode-toggle">
        <button
          className={mode === "redeem" ? "toggle-button active" : "toggle-button"}
          onClick={() => setMode("redeem")}
        >
          Redeem Only
        </button>
        <button
          className={mode === "redeemAndBurn" ? "toggle-button active" : "toggle-button"}
          onClick={() => setMode("redeemAndBurn")}
        >
          Redeem & Burn DSC
        </button>
      </div>

      <form onSubmit={handleSubmit} className="action-form">
        <div className="form-group">
          <label>Select Token</label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="form-input"
          >
            {availableTokens.map((token) => {
              const info = TOKEN_INFO[token.toLowerCase()];
              return (
                <option key={token} value={token}>
                  {info?.symbol || "UNKNOWN"}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label>
            Amount ({tokenInfo.symbol})
            <span className="balance-hint">
              Deposited: {formatUnits(deposited, tokenInfo.decimals)}
            </span>
          </label>
          <div className="input-with-button">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="form-input"
              required
            />
            <button type="button" onClick={setMaxAmount} className="max-button">
              MAX
            </button>
          </div>
        </div>

        {mode === "redeemAndBurn" && (
          <div className="form-group">
            <label>DSC Amount to Burn</label>
            <input
              type="number"
              step="any"
              value={dscAmount}
              onChange={(e) => setDscAmount(e.target.value)}
              placeholder="0.0"
              className="form-input"
              required
            />
          </div>
        )}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Processing..." : mode === "redeem" ? "Redeem Collateral" : "Redeem & Burn"}
        </button>
      </form>
    </div>
  );
};

export default RedeemCollateral;

