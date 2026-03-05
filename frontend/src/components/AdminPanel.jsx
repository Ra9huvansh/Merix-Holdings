import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { YIELD_AGGREGATOR_ABI, REDEMPTION_CONTRACT_ABI, ERC20_ABI } from "../constants/abis";
import {
  YIELD_AGGREGATOR_ADDRESS,
  REDEMPTION_CONTRACT_ADDRESS,
  DSC_TOKEN_ADDRESS,
  WETH_ADDRESS,
} from "../constants/addresses";

const ADMIN_PASSWORD = "14140709";

const WETH_ABI = [
  ...ERC20_ABI,
  { inputs: [], name: "deposit", outputs: [], stateMutability: "payable", type: "function" },
];

const AdminPanel = ({ isOpen, onClose, connectWallet, isConnecting }) => {
  const { signer, account, isConnected } = useWeb3();

  const [authenticated, setAuthenticated]   = useState(false);
  const [passwordInput, setPasswordInput]   = useState("");
  const [authError, setAuthError]           = useState("");

  const [dscReserve,   setDscReserve]   = useState("0");
  const [wethReserve,  setWethReserve]  = useState("0");
  const [totalAssets,  setTotalAssets]  = useState("0");
  const [adminDscBal,  setAdminDscBal]  = useState("0");
  const [adminWethBal, setAdminWethBal] = useState("0");
  const [adminEthBal,  setAdminEthBal]  = useState("0");

  const [dscAmount,  setDscAmount]  = useState("");
  const [wethAmount, setWethAmount] = useState("");
  const [wrapAmount, setWrapAmount] = useState("");

  const [loading,  setLoading]  = useState(false);
  const [txStatus, setTxStatus] = useState({ type: "", msg: "" });

  const fmt = (wei, dp = 4) => {
    try {
      const val = parseFloat(ethers.formatUnits(wei || "0", 18));
      return isNaN(val) ? "0.0000" : val.toFixed(dp);
    } catch { return "0.0000"; }
  };

  const yieldReserve = () => {
    try {
      const total = BigInt(dscReserve);
      const assets = BigInt(totalAssets);
      return total > assets ? (total - assets).toString() : "0";
    } catch { return "0"; }
  };

  const fetchData = async () => {
    if (!isConnected || !signer || !account) return;
    try {
      const vault      = new ethers.Contract(YIELD_AGGREGATOR_ADDRESS,    YIELD_AGGREGATOR_ABI,    signer);
      const redemption = new ethers.Contract(REDEMPTION_CONTRACT_ADDRESS, REDEMPTION_CONTRACT_ABI, signer);
      const dsc        = new ethers.Contract(DSC_TOKEN_ADDRESS,           ERC20_ABI,               signer);
      const weth       = new ethers.Contract(WETH_ADDRESS,                ERC20_ABI,               signer);

      const [dscBal, wethBal, assets, aDsc, aWeth, ethBal] = await Promise.all([
        vault.getVaultDscBalance(),
        redemption.getWethBalance(),
        vault.totalAssets(),
        dsc.balanceOf(account),
        weth.balanceOf(account),
        signer.provider.getBalance(account),
      ]);

      setDscReserve(dscBal.toString());
      setWethReserve(wethBal.toString());
      setTotalAssets(assets.toString());
      setAdminDscBal(aDsc.toString());
      setAdminWethBal(aWeth.toString());
      setAdminEthBal(ethBal.toString());
    } catch (e) {
      console.error("Admin fetch error:", e);
    }
  };

  useEffect(() => {
    if (authenticated && isConnected) {
      fetchData();
      const id = setInterval(fetchData, 15000);
      return () => clearInterval(id);
    }
  }, [authenticated, isConnected, signer, account]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setAuthenticated(false);
      setPasswordInput("");
      setAuthError("");
      setTxStatus({ type: "", msg: "" });
      setDscAmount("");
      setWethAmount("");
      setWrapAmount("");
    }
  }, [isOpen]);

  const handleAuth = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password");
      setPasswordInput("");
    }
  };

  const clearStatus = () => setTxStatus({ type: "", msg: "" });

  const handleFundDsc = async () => {
    if (!dscAmount || parseFloat(dscAmount) <= 0) return;
    setLoading(true); clearStatus();
    try {
      const dsc   = new ethers.Contract(DSC_TOKEN_ADDRESS,        ERC20_ABI,            signer);
      const vault = new ethers.Contract(YIELD_AGGREGATOR_ADDRESS, YIELD_AGGREGATOR_ABI, signer);
      const amt   = ethers.parseUnits(dscAmount, 18);

      const allowance = await dsc.allowance(account, YIELD_AGGREGATOR_ADDRESS);
      if (allowance < amt) {
        const tx = await dsc.approve(YIELD_AGGREGATOR_ADDRESS, ethers.MaxUint256);
        await tx.wait();
      }
      const tx = await vault.fundYieldReserve(amt);
      await tx.wait();
      setTxStatus({ type: "success", msg: `Funded ${dscAmount} DSC to yield reserve` });
      setDscAmount("");
      await fetchData();
    } catch (e) {
      setTxStatus({ type: "error", msg: e.reason || e.message || "Transaction failed" });
    } finally { setLoading(false); }
  };

  const handleFundWeth = async () => {
    if (!wethAmount || parseFloat(wethAmount) <= 0) return;
    setLoading(true); clearStatus();
    try {
      const weth       = new ethers.Contract(WETH_ADDRESS,                ERC20_ABI,               signer);
      const redemption = new ethers.Contract(REDEMPTION_CONTRACT_ADDRESS, REDEMPTION_CONTRACT_ABI, signer);
      const amt        = ethers.parseUnits(wethAmount, 18);

      const allowance = await weth.allowance(account, REDEMPTION_CONTRACT_ADDRESS);
      if (allowance < amt) {
        const tx = await weth.approve(REDEMPTION_CONTRACT_ADDRESS, ethers.MaxUint256);
        await tx.wait();
      }
      const tx = await redemption.fund(amt);
      await tx.wait();
      setTxStatus({ type: "success", msg: `Funded ${wethAmount} WETH to redemption reserve` });
      setWethAmount("");
      await fetchData();
    } catch (e) {
      setTxStatus({ type: "error", msg: e.reason || e.message || "Transaction failed" });
    } finally { setLoading(false); }
  };

  const handleWrapEth = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) return;
    setLoading(true); clearStatus();
    try {
      const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
      const amt  = ethers.parseUnits(wrapAmount, 18);
      const tx   = await weth.deposit({ value: amt });
      await tx.wait();
      setTxStatus({ type: "success", msg: `Wrapped ${wrapAmount} ETH → WETH` });
      setWrapAmount("");
      await fetchData();
    } catch (e) {
      setTxStatus({ type: "error", msg: e.reason || e.message || "Transaction failed" });
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const dscLow  = parseFloat(fmt(yieldReserve())) < 5;
  const wethLow = parseFloat(fmt(wethReserve)) < 0.1;

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="admin-header">
          <div className="admin-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                fill="currentColor" opacity="0.9"/>
            </svg>
            <span>Protocol Admin</span>
          </div>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>

        {/* Password Gate */}
        {!authenticated ? (
          <div className="admin-auth">
            <p className="admin-auth-label">Enter admin password</p>
            <div className="admin-auth-row">
              <input
                type="password"
                className="admin-input"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                autoFocus
              />
              <button className="admin-unlock-btn" onClick={handleAuth}>Unlock</button>
            </div>
            {authError && <p className="admin-error">{authError}</p>}
          </div>

        ) : !isConnected ? (
          /* Not connected */
          <div className="admin-connect-prompt">
            <div className="admin-connect-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="admin-connect-text">Connect your wallet to manage protocol reserves</p>
            <button className="admin-connect-btn" onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>

        ) : (
          /* Main Panel */
          <div className="admin-body">

            {/* Reserve Cards */}
            <div className="admin-section-label">Protocol Reserves</div>
            <div className="admin-reserve-grid">

              {/* DSC Yield Reserve */}
              <div className={`admin-reserve-card ${dscLow ? "card-warn" : ""}`}>
                <div className="admin-reserve-top">
                  <span className="admin-reserve-name">DSC Yield Reserve</span>
                  <span className={`admin-badge ${dscLow ? "badge-warn" : "badge-ok"}`}>
                    {dscLow ? "⚠ Low" : "● Healthy"}
                  </span>
                </div>
                <div className="admin-reserve-amount">{fmt(yieldReserve())} <span>DSC</span></div>
                <div className="admin-reserve-sub">Vault total (incl. deposits): {fmt(dscReserve)} DSC</div>
                <div className="admin-fund-group">
                  <input
                    type="number" min="0" step="any"
                    className="admin-input"
                    placeholder="Amount (DSC)"
                    value={dscAmount}
                    onChange={(e) => setDscAmount(e.target.value)}
                  />
                  <button className="admin-fund-btn" onClick={handleFundDsc} disabled={loading || !dscAmount}>
                    {loading ? "···" : "Fund DSC"}
                  </button>
                </div>
                <div className="admin-wallet-bal">Wallet: {fmt(adminDscBal)} DSC</div>
              </div>

              {/* WETH Redemption Reserve */}
              <div className={`admin-reserve-card ${wethLow ? "card-warn" : ""}`}>
                <div className="admin-reserve-top">
                  <span className="admin-reserve-name">WETH Redemption Reserve</span>
                  <span className={`admin-badge ${wethLow ? "badge-warn" : "badge-ok"}`}>
                    {wethLow ? "⚠ Low" : "● Healthy"}
                  </span>
                </div>
                <div className="admin-reserve-amount">{fmt(wethReserve)} <span>WETH</span></div>
                <div className="admin-reserve-sub">
                  ≈ ${(parseFloat(fmt(wethReserve)) * 2000).toLocaleString()} at $2,000/ETH
                </div>
                <div className="admin-fund-group">
                  <input
                    type="number" min="0" step="any"
                    className="admin-input"
                    placeholder="Amount (WETH)"
                    value={wethAmount}
                    onChange={(e) => setWethAmount(e.target.value)}
                  />
                  <button className="admin-fund-btn" onClick={handleFundWeth} disabled={loading || !wethAmount}>
                    {loading ? "···" : "Fund WETH"}
                  </button>
                </div>
                <div className="admin-wallet-bal">Wallet: {fmt(adminWethBal)} WETH</div>
              </div>
            </div>

            {/* Wrap ETH → WETH */}
            <div className="admin-wrap-card">
              <div className="admin-section-label" style={{ marginBottom: "12px" }}>
                Wrap ETH → WETH
              </div>
              <div className="admin-wrap-row">
                <div className="admin-eth-bal">ETH balance: {fmt(adminEthBal)} ETH</div>
                <div className="admin-wrap-inputs">
                  <input
                    type="number" min="0" step="any"
                    className="admin-input"
                    placeholder="ETH amount to wrap"
                    value={wrapAmount}
                    onChange={(e) => setWrapAmount(e.target.value)}
                  />
                  <button className="admin-wrap-btn" onClick={handleWrapEth} disabled={loading || !wrapAmount}>
                    {loading ? "···" : "Wrap"}
                  </button>
                </div>
              </div>
            </div>

            {/* Tx Status */}
            {txStatus.msg && (
              <div className={`admin-tx-status ${txStatus.type === "success" ? "admin-tx-ok" : "admin-tx-err"}`}>
                {txStatus.msg}
              </div>
            )}

            {/* Connected Account */}
            <div className="admin-account-row">
              <span className="admin-account-dot" />
              <span className="admin-account-addr">{account?.slice(0,6)}...{account?.slice(-4)}</span>
              <span className="admin-account-network">Sepolia</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
