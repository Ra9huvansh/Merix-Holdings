import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatUnits } from "../utils/formatting";

const DepositCollateral = () => {
  const { depositCollateral, depositCollateralAndMintDsc, tokenBalances, loading } = useDSCEngine();
  const [selectedToken, setSelectedToken] = useState(WETH_ADDRESS);
  const [amount, setAmount] = useState("");
  const [dscAmount, setDscAmount] = useState("");
  const [mode, setMode] = useState("deposit"); // "deposit" or "depositAndMint"

  const availableTokens = [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean);
  const tokenInfo = TOKEN_INFO[selectedToken?.toLowerCase()] || { symbol: "UNKNOWN", decimals: 18 };
  const balance = tokenBalances[selectedToken?.toLowerCase()] || "0";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      if (mode === "deposit") {
        await depositCollateral(selectedToken, amount);
        setAmount("");
        alert("Collateral deposited successfully!");
      } else {
        if (!dscAmount || parseFloat(dscAmount) <= 0) {
          alert("Please enter a valid DSC amount to mint");
          return;
        }
        await depositCollateralAndMintDsc(selectedToken, amount, dscAmount);
        setAmount("");
        setDscAmount("");
        alert("Collateral deposited and DSC minted successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Transaction failed: " + (error.reason || error.message));
    }
  };

  const setMaxAmount = () => {
    setAmount(formatUnits(balance, tokenInfo.decimals));
  };

  return (
    <div className="action-panel">
      <h2>Deposit Collateral</h2>
      
      <div className="mode-toggle">
        <button
          className={mode === "deposit" ? "toggle-button active" : "toggle-button"}
          onClick={() => setMode("deposit")}
        >
          Deposit Only
        </button>
        <button
          className={mode === "depositAndMint" ? "toggle-button active" : "toggle-button"}
          onClick={() => setMode("depositAndMint")}
        >
          Deposit & Mint DSC
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
              Balance: {formatUnits(balance, tokenInfo.decimals)}
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

        {mode === "depositAndMint" && (
          <div className="form-group">
            <label>DSC Amount to Mint</label>
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
          {loading ? "Processing..." : mode === "deposit" ? "Deposit Collateral" : "Deposit & Mint"}
        </button>
      </form>
    </div>
  );
};

export default DepositCollateral;

