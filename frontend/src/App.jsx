import { useState } from "react";
import { useWeb3 } from "./hooks/useWeb3";
import { useDSCEngine } from "./hooks/useDSCEngine";
import { CHAIN_ID } from "./constants/addresses";
import { getNetworkName, getNetworkColor } from "./utils/network";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import DepositCollateral from "./components/DepositCollateral";
import MintDSC from "./components/MintDSC";
import RedeemCollateral from "./components/RedeemCollateral";
import BurnDSC from "./components/BurnDSC";
import Liquidation from "./components/Liquidation";
import TransactionVerifier from "./components/TransactionVerifier";
import YieldTerminal from "./components/YieldTerminal";
import AdminPanel from "./components/AdminPanel";
import "./App.css";

function App() {
  const { account, isConnected, connectWallet, disconnectWallet, isConnecting } = useWeb3();
  const { accountInfo, loading } = useDSCEngine();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminOpen, setAdminOpen] = useState(false);

  if (!isConnected) {
    return <LandingPage connectWallet={connectWallet} isConnecting={isConnecting} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="url(#gradient)" opacity="0.9"/>
                <path d="M16 8L20 16L16 20L12 16L16 8Z" fill="white" opacity="0.95"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="brand-name">Merix Holdings</h1>
          </div>
          <div className="header-right">
            <div className="network-badge" style={{ backgroundColor: getNetworkColor(CHAIN_ID) }}>
              {getNetworkName(CHAIN_ID)}
            </div>
            <div className="account-info">
              <span className="account-address">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
            </div>
            <div className="health-factor-badge">
              <span className="health-label">Health</span>
              <span className="health-value">{accountInfo.healthFactor}</span>
            </div>
            <button
              className="admin-header-btn"
              onClick={() => setAdminOpen(true)}
              title="Admin Panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                  fill="currentColor" opacity="0.85"/>
              </svg>
              Admin
            </button>
            <button
              className="disconnect-button"
              onClick={disconnectWallet}
              title="Disconnect wallet"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2L2 6L6 10M2 6H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-container">
          <button 
            className={activeTab === "dashboard" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("dashboard")}
          >
            <span>Dashboard</span>
          </button>
          <button 
            className={activeTab === "deposit" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("deposit")}
          >
            <span>Deposit</span>
          </button>
          <button 
            className={activeTab === "mint" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("mint")}
          >
            <span>Mint DSC</span>
          </button>
          <button 
            className={activeTab === "redeem" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("redeem")}
          >
            <span>Redeem</span>
          </button>
          <button 
            className={activeTab === "burn" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("burn")}
          >
            <span>Burn DSC</span>
          </button>
          <button
            className={activeTab === "liquidate" ? "nav-button active" : "nav-button"}
            onClick={() => setActiveTab("liquidate")}
          >
            <span>Liquidate</span>
          </button>
          <button
            className={activeTab === "yield" ? "nav-button active yield-nav-button" : "nav-button yield-nav-button"}
            onClick={() => setActiveTab("yield")}
          >
            <span>Yield</span>
          </button>
          <div className="nav-divider"></div>
          <button 
            className={`verify-tx-nav-button ${activeTab === "verify" ? "active" : ""}`}
            onClick={() => setActiveTab("verify")}
            title="Transaction Security Verifier"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Verify TX</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Processing transaction...</p>
          </div>
        )}
        
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "deposit" && <DepositCollateral />}
        {activeTab === "mint" && <MintDSC />}
        {activeTab === "redeem" && <RedeemCollateral />}
        {activeTab === "burn" && <BurnDSC />}
        {activeTab === "liquidate" && <Liquidation />}
        {activeTab === "yield" && <YieldTerminal />}
        {activeTab === "verify" && <TransactionVerifier />}
      </main>

      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        connectWallet={connectWallet}
        isConnecting={isConnecting}
      />
    </div>
  );
}

export default App;

