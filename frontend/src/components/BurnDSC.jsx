import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { formatUnits } from "../utils/formatting";

const BurnDSC = () => {
  const { burnDsc, dscBalance, accountInfo, loading } = useDSCEngine();
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await burnDsc(amount);
      setAmount("");
      alert("DSC burned successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Transaction failed: " + (error.reason || error.message));
    }
  };

  const setMaxAmount = () => {
    setAmount(formatUnits(dscBalance, 18));
  };

  return (
    <div className="action-panel">
      <h2>Burn DSC</h2>
      <p className="panel-description">
        Burn DSC tokens to reduce your debt and improve your health factor.
      </p>

      <div className="info-box">
        <div className="info-item">
          <span>DSC Balance:</span>
          <span>{formatUnits(dscBalance, 18)} DSC</span>
        </div>
        <div className="info-item">
          <span>Current DSC Minted:</span>
          <span>{formatUnits(accountInfo.totalDscMinted, 18)} DSC</span>
        </div>
        <div className="info-item">
          <span>Health Factor:</span>
          <span>{accountInfo.healthFactor}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="action-form">
        <div className="form-group">
          <label>
            DSC Amount to Burn
            <span className="balance-hint">
              Balance: {formatUnits(dscBalance, 18)} DSC
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

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Processing..." : "Burn DSC"}
        </button>
      </form>
    </div>
  );
};

export default BurnDSC;

