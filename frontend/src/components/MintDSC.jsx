import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { formatUnits } from "../utils/formatting";

const MintDSC = () => {
  const { mintDsc, accountInfo, loading } = useDSCEngine();
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await mintDsc(amount);
      setAmount("");
      alert("DSC minted successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Transaction failed: " + (error.reason || error.message));
    }
  };

  return (
    <div className="action-panel">
      <h2>Mint DSC</h2>
      <p className="panel-description">
        Mint DSC tokens against your deposited collateral. Make sure you have sufficient collateral
        to maintain a healthy health factor.
      </p>

      <div className="info-box">
        <div className="info-item">
          <span>Current Collateral:</span>
          <span>{formatUnits(accountInfo.collateralValueInUsd, 18)} USD</span>
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
          <label>DSC Amount to Mint</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="form-input"
            required
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Processing..." : "Mint DSC"}
        </button>
      </form>
    </div>
  );
};

export default MintDSC;

