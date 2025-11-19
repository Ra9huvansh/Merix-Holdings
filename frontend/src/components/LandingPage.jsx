import { useEffect, useRef, useState } from "react";

const LandingPage = ({ connectWallet, isConnecting }) => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: "🔒",
      title: "Decentralized Collateral",
      description: "Deposit WETH and WBTC as collateral to mint stablecoins. Your assets remain in your control."
    },
    {
      icon: "⚖️",
      title: "Over-Collateralized",
      description: "Maintain a healthy collateralization ratio to ensure stability and security of the protocol."
    },
    {
      icon: "💎",
      title: "Mint Stablecoins",
      description: "Mint Merix Holdings (DSC) tokens against your collateral at any time, maintaining liquidity."
    },
    {
      icon: "🔄",
      title: "Redeem Anytime",
      description: "Redeem your collateral by burning DSC tokens. Full control over your assets."
    },
    {
      icon: "⚡",
      title: "Liquidation Protection",
      description: "Automated liquidation system protects the protocol while maintaining fairness."
    },
    {
      icon: "📊",
      title: "Real-Time Pricing",
      description: "Chainlink price feeds ensure accurate collateral valuation in real-time."
    }
  ];

  const useCases = [
    {
      title: "DeFi Lending",
      description: "Use your crypto assets as collateral to mint stablecoins without selling your holdings."
    },
    {
      title: "Liquidity Management",
      description: "Access liquidity from your long-term holdings while maintaining exposure to asset appreciation."
    },
    {
      title: "Trading & Arbitrage",
      description: "Mint stablecoins instantly to capitalize on trading opportunities across DeFi protocols."
    },
    {
      title: "Yield Farming",
      description: "Use minted stablecoins in yield farming strategies while keeping your collateral secure."
    }
  ];

  const [marketData, setMarketData] = useState(null);

  const marketTicks = [
    { symbol: "BTC", name: "Bitcoin", id: "bitcoin" },
    { symbol: "ETH", name: "Ethereum", id: "ethereum" },
    { symbol: "SOL", name: "Solana", id: "solana" },
    { symbol: "AVAX", name: "Avalanche", id: "avalanche-2" },
    { symbol: "LINK", name: "Chainlink", id: "chainlink" },
    { symbol: "ARB", name: "Arbitrum", id: "arbitrum" },
  ];
  const metrics = [
    { label: "Total Value Locked", value: "$42.3M" },
    { label: "Collateral Assets", value: "WETH, WBTC" },
    { label: "Health Factor Target", value: "> 1.5x" },
    { label: "Liquidation Penalty", value: "10%" },
    { label: "Oracle Provider", value: "Chainlink" }
  ];

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const ids = marketTicks.map(t => t.id).join(",");
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setMarketData(data);
      } catch (e) {
        console.error("Failed to fetch market data", e);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="hero-background" style={{ transform: `translateY(${scrollY * 0.5}px)` }}></div>
        <div className="hero-content">
          <div className="hero-orbit">
            <div className="hero-orbit-ring hero-orbit-ring-outer"></div>
            <div className="hero-orbit-ring hero-orbit-ring-middle"></div>
            <div className="hero-orbit-ring hero-orbit-ring-inner"></div>
            <div className="hero-logo">
              <svg width="80" height="80" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="url(#heroGradient)" opacity="0.95"/>
                <path d="M16 8L20 16L16 20L12 16L16 8Z" fill="white" opacity="0.98"/>
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#c0c0c0"/>
                    <stop offset="50%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#c0c0c0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="hero-badge">
            <span className="badge-text">Decentralized Stablecoin Protocol</span>
          </div>
          <h1 className="hero-title">
            <span className="title-line">Merix Holdings</span>
            <span className="title-subtitle">Stability Meets Innovation</span>
          </h1>
          <p className="hero-description">
            A decentralized stablecoin protocol built on Ethereum, enabling users to mint 
            stablecoins against over-collateralized crypto assets. Experience the future 
            of decentralized finance with transparency, security, and control.
          </p>
          <button 
            className="hero-cta"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="metrics-ticker">
            <div className="metrics-track">
              {[0, 1].map((loopIndex) => (
                <div className="metrics-row" key={loopIndex}>
                  {metrics.map((metric, idx) => (
                    <div className="metric-pill" key={`${loopIndex}-${idx}`}>
                      <span className="metric-label">{metric.label}</span>
                      <span className="metric-value">{metric.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="scroll-indicator">
          <div className="scroll-line"></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Features</span>
            <h2 className="section-title">Built for Excellence</h2>
            <p className="section-description">
              Every aspect of Merix Holdings is designed with precision and security in mind.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Use Cases</span>
            <h2 className="section-title">Unlock Your Potential</h2>
            <p className="section-description">
              Discover how Merix Holdings empowers your DeFi journey.
            </p>
          </div>
          <div className="use-cases-grid">
            {useCases.map((useCase, index) => (
              <div 
                key={index} 
                className="use-case-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="use-case-number">{String(index + 1).padStart(2, '0')}</div>
                <h3 className="use-case-title">{useCase.title}</h3>
                <p className="use-case-description">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2 className="section-title">Simple. Secure. Powerful.</h2>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3 className="step-title">Deposit Collateral</h3>
                <p className="step-description">
                  Deposit WETH or WBTC as collateral. Your assets are securely locked in the protocol.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">Mint Stablecoins</h3>
                <p className="step-description">
                  Mint Merix Holdings (DSC) tokens against your collateral. Maintain a healthy collateralization ratio.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">Use or Redeem</h3>
                <p className="step-description">
                  Use your stablecoins in DeFi or redeem them anytime by burning DSC to unlock collateral.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Market Strip */}
      <section className="market-strip-section">
        <div className="section-container">
          <div className="market-strip-header">
            <span className="market-strip-label">Global Markets</span>
            <span className="market-strip-sub">Live-feel metrics from leading crypto assets</span>
          </div>
          <div className="crypto-ticker">
            <div className="crypto-track">
              {[0, 1].map((loopIndex) => (
                <div className="crypto-row" key={loopIndex}>
                  {marketTicks.map((tick, idx) => (
                    <div className="crypto-pill" key={`${loopIndex}-${idx}`}>
                      <div className="crypto-main">
                        <span className="crypto-symbol">{tick.symbol}</span>
                        <span className="crypto-name">{tick.name}</span>
                      </div>
                      <div className="crypto-meta">
                        <span className="crypto-price">
                          {marketData && marketData[tick.id]
                            ? `$${marketData[tick.id].usd.toLocaleString()}`
                            : "—"}
                        </span>
                        <span
                          className={
                            marketData && marketData[tick.id]
                              ? `crypto-change ${
                                  marketData[tick.id].usd_24h_change < 0 ? "negative" : "positive"
                                }`
                              : "crypto-change"
                          }
                        >
                          {marketData && marketData[tick.id]
                            ? `${marketData[tick.id].usd_24h_change >= 0 ? "+" : ""}${marketData[
                                tick.id
                              ].usd_24h_change.toFixed(2)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Begin?</h2>
            <p className="cta-description">
              Connect your wallet and start minting stablecoins today.
            </p>
            <button 
              className="cta-button"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo-container">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" fill="url(#footerGradient)" opacity="0.9"/>
                  <path d="M16 8L20 16L16 20L12 16L16 8Z" fill="white" opacity="0.95"/>
                  <defs>
                    <linearGradient id="footerGradient" x1="0" y1="0" x2="32" y2="32">
                      <stop offset="0%" stopColor="#c0c0c0"/>
                      <stop offset="50%" stopColor="#ffffff"/>
                      <stop offset="100%" stopColor="#c0c0c0"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="footer-logo">Merix Holdings</span>
              </div>
              <p className="footer-tagline">Decentralized Stablecoin Protocol</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-heading">Protocol</h4>
                <a href="#" className="footer-link">Documentation</a>
                <a href="#" className="footer-link">Security</a>
                <a href="#" className="footer-link">Audits</a>
              </div>
              <div className="footer-column">
                <h4 className="footer-heading">Community</h4>
                <a href="#" className="footer-link">Discord</a>
                <a href="#" className="footer-link">Twitter</a>
                <a href="#" className="footer-link">GitHub</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Merix Holdings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

