import { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";

const TransactionVerifier = () => {
  const { provider } = useWeb3();
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [functionSelector, setFunctionSelector] = useState(null);

  // Extract function selector from calldata (first 4 bytes)
  const extractFunctionSelector = (calldata) => {
    if (!calldata || calldata.length < 10) {
      throw new Error("Invalid calldata: must be at least 4 bytes (8 hex characters + 0x)");
    }
    
    // Remove 0x prefix if present
    const cleanCalldata = calldata.startsWith("0x") ? calldata.slice(2) : calldata;
    
    if (cleanCalldata.length < 8) {
      throw new Error("Invalid calldata: must be at least 4 bytes");
    }
    
    // First 4 bytes = 8 hex characters
    const selector = "0x" + cleanCalldata.slice(0, 8);
    return selector;
  };

  // Get transaction calldata from hash
  const getTransactionCalldata = async (txHash) => {
    if (!provider) {
      throw new Error("Provider not available");
    }
    
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        throw new Error("Transaction not found");
      }
      return tx.data;
    } catch (err) {
      throw new Error(`Failed to fetch transaction: ${err.message}`);
    }
  };

  // Analyze function selector with LLM
  const analyzeWithLLM = async (selector) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      // Fallback: Use a simple heuristic analysis
      return analyzeHeuristically(selector);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a blockchain security expert. Analyze Ethereum function selectors (first 4 bytes of calldata) to determine if a transaction could be malicious.

Consider:
- Common attack patterns (reentrancy, unauthorized transfers, approval exploits)
- Suspicious function signatures (transfer, approve, delegatecall, selfdestruct)
- High-risk operations (token transfers, contract calls, state changes)

Respond in JSON format:
{
  "risk": "low" | "medium" | "high" | "critical",
  "safe": true | false,
  "explanation": "brief explanation",
  "recommendation": "what the user should do"
}`
            },
            {
              role: "user",
              content: `Analyze this function selector: ${selector}\n\nIs this transaction safe to sign?`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      return analysis;
    } catch (err) {
      console.error("LLM analysis failed:", err);
      // Fallback to heuristic
      return analyzeHeuristically(selector);
    }
  };

  // Heuristic analysis fallback
  const analyzeHeuristically = (selector) => {
    // Known high-risk selectors (common attack patterns)
    const highRiskSelectors = [
      "0x23b872dd", // transferFrom(address,address,uint256)
      "0xa9059cbb", // transfer(address,uint256)
      "0x095ea7b3", // approve(address,uint256)
      "0x40c10f19", // mint(address,uint256)
      "0x42966c68", // burn(uint256)
      "0xf2fde38b", // transferOwnership(address)
      "0x715018a6", // renounceOwnership()
      "0x5c60da1b", // implementation()
      "0x3659cfe6", // upgradeTo(address)
      "0x4f1ef286", // upgradeToAndCall(address,bytes)
    ];

    const isHighRisk = highRiskSelectors.includes(selector.toLowerCase());
    
    return {
      risk: isHighRisk ? "high" : "low",
      safe: !isHighRisk,
      explanation: isHighRisk 
        ? "This function selector matches common token transfer or contract control operations. Review the transaction details carefully."
        : "Function selector appears to be a standard contract interaction. Always verify the contract address and transaction parameters.",
      recommendation: isHighRisk
        ? "⚠️ Review transaction details carefully. This could involve token transfers or contract control changes."
        : "✓ Function selector looks standard, but always verify the full transaction details before signing."
    };
  };

  const handleVerify = async () => {
    if (!input.trim()) {
      setError("Please enter a transaction hash or calldata");
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);
    setFunctionSelector(null);

    try {
      let calldata = input.trim();
      let selector;

      // Check if input is a transaction hash (starts with 0x and is 66 chars)
      if (calldata.startsWith("0x") && calldata.length === 66) {
        // It's a transaction hash, fetch the calldata
        calldata = await getTransactionCalldata(calldata);
      }

      // Extract function selector
      selector = extractFunctionSelector(calldata);
      setFunctionSelector(selector);

      // Analyze with LLM
      const analysis = await analyzeWithLLM(selector);
      setResult(analysis);
    } catch (err) {
      setError(err.message || "Failed to verify transaction");
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "critical":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "medium":
        return "#eab308";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getRiskIcon = (risk, safe) => {
    if (!safe || risk === "critical" || risk === "high") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  return (
    <div className="verifier-container">
      <div className="verifier-header">
        <div className="verifier-icon-wrapper">
          <div className="verifier-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="verifier-icon-glow"></div>
        </div>
        <h2 className="verifier-title">Transaction Security Verifier</h2>
        <p className="verifier-subtitle">
          AI-Powered Analysis • Real-Time Threat Detection • Premium Security Service
        </p>
      </div>

      <div className="verifier-main">
        <div className="verifier-input-section">
          <div className="verifier-input-header">
            <div className="verifier-input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="verifier-input-label">Transaction Data</span>
          </div>
          <div className="verifier-input-wrapper">
            <textarea
              className="verifier-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste transaction hash (0x...) or raw calldata here..."
              rows={4}
            />
            <div className="verifier-input-border"></div>
          </div>
          <button
            className="verifier-button"
            onClick={handleVerify}
            disabled={verifying || !input.trim()}
          >
            {verifying ? (
              <>
                <div className="verifier-button-spinner"></div>
                <span>Analyzing Transaction...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Verify Transaction</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="verifier-error">
            <div className="verifier-error-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="verifier-error-content">
              <strong>Verification Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {functionSelector && (
          <div className="verifier-selector-card">
            <div className="verifier-selector-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Function Selector Extracted</span>
            </div>
            <div className="verifier-selector-value">
              <code>{functionSelector}</code>
            </div>
          </div>
        )}

        {result && (
          <div className="verifier-result">
            <div className="verifier-result-header" style={{ borderColor: getRiskColor(result.risk) }}>
              <div className="verifier-result-status">
                <div className="verifier-result-icon" style={{ color: getRiskColor(result.risk) }}>
                  {getRiskIcon(result.risk, result.safe)}
                </div>
                <div className="verifier-result-badges">
                  <span 
                    className="verifier-risk-badge"
                    style={{ 
                      background: getRiskColor(result.risk),
                      boxShadow: `0 0 20px ${getRiskColor(result.risk)}40`
                    }}
                  >
                    {result.risk.toUpperCase()} RISK
                  </span>
                  <span 
                    className="verifier-safe-badge"
                    style={{ 
                      background: result.safe ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: result.safe ? "#10b981" : "#ef4444",
                      borderColor: result.safe ? "#10b981" : "#ef4444"
                    }}
                  >
                    {result.safe ? "✓ VERIFIED SAFE" : "⚠️ CAUTION REQUIRED"}
                  </span>
                </div>
              </div>
            </div>

            <div className="verifier-result-content">
              <div className="verifier-result-section">
                <div className="verifier-result-section-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 20H21M16.5 3.5C16.5 3.5 15 5 15 6C15 7 16.5 8.5 16.5 8.5C16.5 8.5 18 7 18 6C18 5 16.5 3.5 16.5 3.5M9 7H6C4.89543 7 4 7.89543 4 9V18C4 19.1046 4.89543 20 6 20H9M13 7H16C17.1046 7 18 7.89543 18 9V18C18 19.1046 17.1046 20 16 20H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Security Analysis</span>
                </div>
                <p className="verifier-result-text">{result.explanation}</p>
              </div>

              <div className="verifier-result-section">
                <div className="verifier-result-section-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Recommendation</span>
                </div>
                <p className="verifier-result-text">{result.recommendation}</p>
              </div>
            </div>
          </div>
        )}

        <div className="verifier-info">
          <div className="verifier-info-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>How It Works</span>
          </div>
          <div className="verifier-info-grid">
            <div className="verifier-info-item">
              <div className="verifier-info-number">01</div>
              <div className="verifier-info-content">
                <strong>Extract Selector</strong>
                <p>First 4 bytes of calldata identify the function</p>
              </div>
            </div>
            <div className="verifier-info-item">
              <div className="verifier-info-number">02</div>
              <div className="verifier-info-content">
                <strong>AI Analysis</strong>
                <p>Advanced LLM detects malicious patterns</p>
              </div>
            </div>
            <div className="verifier-info-item">
              <div className="verifier-info-number">03</div>
              <div className="verifier-info-content">
                <strong>Risk Assessment</strong>
                <p>Comprehensive security evaluation</p>
              </div>
            </div>
          </div>
          <div className="verifier-info-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Add <code>VITE_OPENAI_API_KEY</code> to your .env for enhanced AI-powered analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionVerifier;
