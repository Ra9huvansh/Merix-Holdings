import { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { DSC_ENGINE_ABI, ERC20_ABI } from "../constants/abis";

const TransactionVerifier = () => {
  const { provider } = useWeb3();
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [functionSelector, setFunctionSelector] = useState(null);
  const [resolvedSignature, setResolvedSignature] = useState(null);

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

  const SYSTEM_PROMPT = `You are a blockchain security expert analyzing Ethereum transaction calldata.

You will be given:
- The function selector (first 4 bytes)
- The resolved function signature (if known)
- The full calldata

Your job is to assess whether this transaction is safe to sign. Be accurate — do NOT flag everything as high risk. Common, well-known operations like ERC20 transfers, approvals to known protocols, and standard DeFi interactions are generally low-to-medium risk depending on context.

Only flag as "high" or "critical" if there are genuine red flags such as:
- delegatecall or selfdestruct patterns
- Unusual or obfuscated calldata
- Ownership transfers or upgrade calls
- Unlimited approvals to unknown contracts

You MUST respond with ONLY a valid JSON object, no other text:
{
  "risk": "low" | "medium" | "high" | "critical",
  "safe": true | false,
  "functionName": "resolved function name or unknown",
  "explanation": "brief explanation of what this transaction does",
  "recommendation": "what the user should do"
}`;

  const lookupInLocalABI = (selector) => {
    const entries = [...DSC_ENGINE_ABI, ...ERC20_ABI].filter(e => e.type === "function");
    for (const entry of entries) {
      const paramTypes = entry.inputs.map(i => i.type).join(",");
      const sig = `${entry.name}(${paramTypes})`;
      const computed = ethers.id(sig).slice(0, 10);
      if (computed.toLowerCase() === selector.toLowerCase()) return sig;
    }
    return null;
  };

  const lookupFunctionSignature = async (selector) => {
    // Check local ABI first (covers all DSCEngine + ERC20 functions)
    const localMatch = lookupInLocalABI(selector);
    if (localMatch) return localMatch;

    // Fall back to 4byte.directory for everything else
    try {
      const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].text_signature;
      }
    } catch {
      // silently ignore
    }
    return null;
  };

  const callLLM = async (url, model, headers, selector, signature, calldata) => {
    const userMessage = [
      `Function selector: ${selector}`,
      `Resolved signature: ${signature || "unknown"}`,
      `Full calldata: ${calldata}`,
      ``,
      `Is this transaction safe to sign?`,
    ].join("\n");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  };

  // Analyze function selector with LLM
  const analyzeWithLLM = async (selector, calldata, signature) => {

    // 1. Try local Ollama first
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || "qwen2.5:14b";
    try {
      return await callLLM(
        "http://localhost:11434/v1/chat/completions",
        ollamaModel,
        {},
        selector,
        signature,
        calldata
      );
    } catch (err) {
      console.warn("Ollama unavailable:", err.message);
    }

    // 2. Fall back to Groq if key is configured
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqKey) {
      try {
        return await callLLM(
          "https://api.groq.com/openai/v1/chat/completions",
          "llama-3.3-70b-versatile",
          { Authorization: `Bearer ${groqKey}` },
          selector,
          signature,
          calldata
        );
      } catch (err) {
        console.warn("Groq fallback failed:", err.message);
      }
    }

    // 3. Last resort: heuristic
    return analyzeHeuristically(selector);
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
    setResolvedSignature(null);

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

      // Resolve signature immediately — shows up before LLM finishes
      const sig = await lookupFunctionSignature(selector);
      setResolvedSignature(sig || "Unknown (not in 4byte.directory)");

      // Analyze with LLM (pass already-resolved signature to avoid double lookup)
      const analysis = await analyzeWithLLM(selector, calldata, sig);
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
            {resolvedSignature && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: "#6b7280" }}>Function: </span>
                <span style={{
                  color: resolvedSignature.startsWith("Unknown") ? "#f59e0b" : "#a78bfa",
                  fontFamily: "monospace",
                }}>
                  {resolvedSignature}
                </span>
              </div>
            )}
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
                <strong>Decode the Transaction</strong>
                <p>Extracts the 4-byte function selector and resolves it to a human-readable name so you know exactly what function is being called before signing</p>
              </div>
            </div>
            <div className="verifier-info-item">
              <div className="verifier-info-number">02</div>
              <div className="verifier-info-content">
                <strong>AI Reads the Calldata</strong>
                <p>Tries Ollama locally first, then Groq, then heuristics. Looks for unlimited approvals, suspicious recipients, proxy hijacks and known exploit patterns</p>
              </div>
            </div>
            <div className="verifier-info-item">
              <div className="verifier-info-number">03</div>
              <div className="verifier-info-content">
                <strong>Flags What Matters</strong>
                <p>Returns a risk rating from Safe to Critical with a plain-English explanation of what was found and whether you should sign</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionVerifier;
