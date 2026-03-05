import { useState } from "react";
import { useDSCEngine } from "../hooks/useDSCEngine";
import { useYieldAggregator } from "../hooks/useYieldAggregator";
import { formatUnits } from "../utils/formatting";

const YieldTerminal = () => {
  const { accountInfo, fetchAccountInfo } = useDSCEngine();
  const {
    loading,
    vaultInfo,
    strategies,
    userStrategyDeposits,
    depositToStrategy,
    withdrawFromStrategy,
    redeemDscForWeth,
  } = useYieldAggregator();

  const [activeTab, setActiveTab] = useState("strategies");
  const [modal, setModal] = useState(null); // { type, strategyId?, strategyName? }
  const [inputAmount, setInputAmount] = useState("");
  const [txError, setTxError] = useState("");
  const [txSuccess, setTxSuccess] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (wei, dp = 4) => {
    const val = parseFloat(formatUnits(wei || "0"));
    return isNaN(val) ? "0.0000" : val.toFixed(dp);
  };

  const fmtAPY = (apyBps) => (Number(apyBps) / 100).toFixed(0) + "%";

  const getRiskColor = (risk) => {
    if (risk === "High") return "#ef4444";
    if (risk === "Medium") return "#f59e0b";
    return "#10b981";
  };

  const getHealthColor = () => {
    if (accountInfo.healthFactor === "∞") return "#10b981";
    const hf = parseFloat(accountInfo.healthFactor);
    if (hf < 1) return "#ef4444";
    if (hf < 2) return "#f59e0b";
    return "#10b981";
  };

  const getUnrealizedProfit = () => {
    const cv = BigInt(vaultInfo.currentValue || "0");
    const pp = BigInt(vaultInfo.userPrincipal || "0");
    return cv > pp ? (cv - pp).toString() : "0";
  };

  // Proportional per-strategy current value estimate:
  // stratValue = stratDeposited × (currentValue / userPrincipal)
  const getStrategyCurrentValue = (stratId) => {
    const deposited = BigInt(userStrategyDeposits[stratId] || "0");
    const principal = BigInt(vaultInfo.userPrincipal || "0");
    const currentValue = BigInt(vaultInfo.currentValue || "0");
    if (deposited === 0n || principal === 0n) return deposited.toString();
    return ((deposited * currentValue) / principal).toString();
  };

  const getWethPreview = () => {
    const amt = parseFloat(inputAmount);
    if (!amt || amt <= 0) return "0";
    return (amt / 2000).toFixed(6);
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openModal = (type, strategyId = null, strategyName = null) => {
    setModal({ type, strategyId, strategyName });
    setInputAmount("");
    setTxError("");
    setTxSuccess("");
  };

  const closeModal = () => {
    setModal(null);
    setInputAmount("");
    setTxError("");
    setTxSuccess("");
  };

  const handleAction = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setTxError("Enter a valid amount");
      return;
    }
    setTxError("");
    setTxSuccess("");
    try {
      if (modal.type === "deposit") {
        await depositToStrategy(modal.strategyId, inputAmount);
        setTxSuccess(`Deposited ${inputAmount} DSC to ${modal.strategyName}`);
      } else if (modal.type === "withdraw") {
        await withdrawFromStrategy(modal.strategyId, inputAmount);
        setTxSuccess(`Withdrew ${inputAmount} DSC from ${modal.strategyName}`);
      } else if (modal.type === "redeem") {
        await redeemDscForWeth(inputAmount);
        // Refresh DSCEngine state so dashboard shows updated collateral/health factor
        await fetchAccountInfo();
        setTxSuccess(
          `Redeemed ${inputAmount} DSC — ${getWethPreview()} WETH added as collateral`
        );
      }
    } catch (err) {
      setTxError(err.reason || err.message || "Transaction failed");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="yield-terminal">

      {/* Header */}
      <div className="yield-header">
        <h2 className="yield-title">Yield Aggregator Terminal</h2>
        <p className="yield-subtitle">
          Invest DSC across simulated strategies. Yield accounting is completely
          separate from your collateral position — health factor is unaffected.
        </p>
      </div>

      {/* Stat Row */}
      <div className="yield-stats-wrapper">
        <div className="yield-stat-group">
          <div className="yield-group-label">Collateral Position (unchanged by yield)</div>
          <div className="yield-stat-row">
            <div className="yield-stat-card">
              <span className="ysc-label">DSC Debt</span>
              <span className="ysc-value">{fmt(accountInfo.totalDscMinted)} DSC</span>
            </div>
            <div className="yield-stat-card">
              <span className="ysc-label">Health Factor</span>
              <span className="ysc-value" style={{ color: getHealthColor() }}>
                {accountInfo.healthFactor}
              </span>
            </div>
          </div>
        </div>

        <div className="yield-stat-group">
          <div className="yield-group-label">Vault Overview (yDSC)</div>
          <div className="yield-stat-row">
            <div className="yield-stat-card">
              <span className="ysc-label">yDSC Shares</span>
              <span className="ysc-value">{fmt(vaultInfo.userShares)}</span>
            </div>
            <div className="yield-stat-card">
              <span className="ysc-label">Current Value</span>
              <span className="ysc-value">{fmt(vaultInfo.currentValue)} DSC</span>
            </div>
            <div className="yield-stat-card accent-green">
              <span className="ysc-label">Unrealized Profit</span>
              <span className="ysc-value positive">+{fmt(getUnrealizedProfit())} DSC</span>
            </div>
            <div className="yield-stat-card accent-green">
              <span className="ysc-label">Realized Profit</span>
              <span className="ysc-value positive">+{fmt(vaultInfo.realizedProfit)} DSC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="yield-subtabs">
        <button
          className={`yield-subtab ${activeTab === "strategies" ? "active" : ""}`}
          onClick={() => setActiveTab("strategies")}
        >
          Strategy Allocation
        </button>
        <button
          className={`yield-subtab ${activeTab === "realized" ? "active" : ""}`}
          onClick={() => setActiveTab("realized")}
        >
          Realized Profits
        </button>
        <button
          className={`yield-subtab ${activeTab === "redeem" ? "active" : ""}`}
          onClick={() => setActiveTab("redeem")}
        >
          Redeem DSC → Collateral
        </button>
      </div>

      {/* Strategy Allocation */}
      {activeTab === "strategies" && (
        <div className="yield-section">
          <div className="strat-table-wrap">
            <div className="strat-table-head">
              <span>Strategy</span>
              <span>Risk</span>
              <span>APY</span>
              <span>Your Deposit</span>
              <span>Current Value</span>
              <span>Actions</span>
            </div>
            {strategies.map((s) => (
              <div key={s.id} className="strat-table-row">
                <span className="strat-name">{s.name}</span>
                <span className="strat-risk" style={{ color: getRiskColor(s.riskLevel) }}>
                  {s.riskLevel}
                </span>
                <span className="strat-apy">{fmtAPY(s.apyBps)}</span>
                <span className="strat-deposited">
                  {fmt(userStrategyDeposits[s.id] || "0")} DSC
                </span>
                <span className="strat-value">
                  {fmt(getStrategyCurrentValue(s.id))} DSC
                </span>
                <span className="strat-actions">
                  <button
                    className="strat-btn deposit-btn"
                    onClick={() => openModal("deposit", s.id, s.name)}
                  >
                    Deposit
                  </button>
                  <button
                    className="strat-btn withdraw-btn"
                    onClick={() => openModal("withdraw", s.id, s.name)}
                    disabled={
                      !userStrategyDeposits[s.id] ||
                      userStrategyDeposits[s.id] === "0"
                    }
                  >
                    Withdraw
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="vault-totals-bar">
            <div className="vault-total-item">
              <span className="vt-label">Vault Total Shares (yDSC)</span>
              <span className="vt-value">{fmt(vaultInfo.totalShares)}</span>
            </div>
            <div className="vault-total-divider" />
            <div className="vault-total-item">
              <span className="vt-label">Vault Total Assets</span>
              <span className="vt-value">{fmt(vaultInfo.totalAssets)} DSC</span>
            </div>
            <div className="vault-total-divider" />
            <div className="vault-total-item">
              <span className="vt-label">Simulated Assets (incl. pending yield)</span>
              <span className="vt-value">{fmt(vaultInfo.simulatedTotalAssets)} DSC</span>
            </div>
          </div>
        </div>
      )}

      {/* Realized Profits */}
      {activeTab === "realized" && (
        <div className="yield-section">
          <div className="realized-card">
            <div className="realized-row">
              <span className="rr-label">Total DSC Invested (Principal)</span>
              <span className="rr-value">{fmt(vaultInfo.userPrincipal)} DSC</span>
            </div>
            <div className="realized-row">
              <span className="rr-label">Current Portfolio Value</span>
              <span className="rr-value">{fmt(vaultInfo.currentValue)} DSC</span>
            </div>
            <div className="realized-divider" />
            <div className="realized-row highlight">
              <span className="rr-label">Unrealized Profit</span>
              <span className="rr-value positive">+{fmt(getUnrealizedProfit())} DSC</span>
            </div>
            <div className="realized-row highlight">
              <span className="rr-label">Total Realized Profit (withdrawn)</span>
              <span className="rr-value positive">+{fmt(vaultInfo.realizedProfit)} DSC</span>
            </div>
            <div className="realized-note">
              Profit is realized when you withdraw from a strategy and receive more DSC
              than your original deposit. Use the{" "}
              <strong>Redeem DSC → Collateral</strong> tab to convert realized profit
              into WETH collateral, burning the DSC in the process.
            </div>
          </div>
        </div>
      )}

      {/* Redeem DSC → Collateral */}
      {activeTab === "redeem" && (
        <div className="yield-section">
          <div className="redeem-card">
            <div className="redeem-card-header">Redeem Profit DSC → WETH Collateral</div>
            <p className="redeem-desc">
              Send your profit DSC to the Redemption Contract. The DSC is burned
              permanently and equivalent WETH is deposited directly as collateral
              into DSCEngine on your behalf — improving your health factor immediately.
            </p>
            <div className="info-box" style={{ marginBottom: "24px" }}>
              <div className="info-item">
                <span>Simulated ETH Price</span>
                <span>$2,000 / ETH</span>
              </div>
              <div className="info-item">
                <span>Exchange Rate</span>
                <span>2,000 DSC = 1 WETH collateral</span>
              </div>
              <div className="info-item">
                <span>Your Realized Profit</span>
                <span>{fmt(vaultInfo.realizedProfit)} DSC</span>
              </div>
            </div>
            <button className="submit-button" onClick={() => openModal("redeem")}>
              Redeem DSC → Collateral
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modal.type === "deposit" && `Deposit to ${modal.strategyName}`}
              {modal.type === "withdraw" && `Withdraw from ${modal.strategyName}`}
              {modal.type === "redeem" && "Redeem DSC → Collateral"}
            </div>

            {modal.type === "redeem" && (
              <div className="modal-info">
                DSC is burned. Equivalent WETH is deposited as collateral at $2,000/ETH.
              </div>
            )}

            <div className="form-group">
              <label>DSC Amount</label>
              <input
                type="number"
                step="any"
                min="0"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="form-input"
                autoFocus
              />
            </div>

            {modal.type === "redeem" && inputAmount && parseFloat(inputAmount) > 0 && (
              <div className="modal-preview">
                You will receive: <strong>{getWethPreview()} WETH</strong> as collateral
              </div>
            )}

            {txError && <div className="tx-error">{txError}</div>}
            {txSuccess && <div className="tx-success">{txSuccess}</div>}

            <div className="modal-actions">
              <button
                className="submit-button"
                onClick={handleAction}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : modal.type === "deposit"
                  ? "Deposit"
                  : modal.type === "withdraw"
                  ? "Withdraw"
                  : "Redeem & Burn DSC"}
              </button>
              <button className="cancel-button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldTerminal;
