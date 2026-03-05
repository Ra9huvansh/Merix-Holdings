import { useEffect, useRef, useState } from "react";
import AdminPanel from "./AdminPanel";

const LandingPage = ({ connectWallet, isConnecting }) => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Star field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener("resize", setSize);

    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.2,
      baseOpacity: Math.random() * 0.55 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.007 + 0.002,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      stars.forEach((s) => {
        const opacity = s.baseOpacity * (0.35 + 0.65 * Math.sin(s.phase + t * s.speed));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity.toFixed(3)})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Decentralized Collateral",
      description: "Deposit WETH and WBTC as collateral to mint stablecoins. Your assets remain in your control."
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 9l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 15l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Over-Collateralized",
      description: "Maintain a healthy collateralization ratio to ensure stability and security of the protocol."
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8v8M9 10h4.5a1.5 1.5 0 010 3H9M9 13h5a1.5 1.5 0 010 3H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Mint Stablecoins",
      description: "Mint Merix Holdings (DSC) tokens against your collateral at any time, maintaining liquidity."
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M20 12a8 8 0 01-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M2 9l2 3 3-2M22 15l-2-3-3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Redeem Anytime",
      description: "Redeem your collateral by burning DSC tokens. Full control over your assets."
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v6c0 5 3.6 9.74 9 11 5.4-1.26 9-6 9-11V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Liquidation Protection",
      description: "Automated liquidation system protects the protocol while maintaining fairness."
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l4-5 4 3 4-7 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="20" cy="12" r="1" fill="currentColor"/>
          <path d="M3 20h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        </svg>
      ),
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
      <canvas ref={canvasRef} className="star-canvas" />

      {/* Top Nav — hamburger only */}
      <nav className="landing-nav">
        <div className="ln-hamburger-wrap" ref={dropdownRef}>
          <button
            className="ln-hamburger"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
          {dropdownOpen && (
            <div className="ln-dropdown-menu">
              <a href="https://merix-doc.vercel.app" target="_blank" rel="noopener noreferrer" className="ln-dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Documentation
              </a>
              <a href="#" className="ln-dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Whitepaper
              </a>
              <span className="ln-dropdown-item ln-coming-soon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h18M3 9h18M3 15h18M3 21h18"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Governance
                <span className="ln-soon-badge">Soon</span>
              </span>
              <span className="ln-dropdown-item ln-coming-soon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Community
                <span className="ln-soon-badge">Soon</span>
              </span>
              <a href="https://github.com/Ra9huvansh/Merix-Holdings" target="_blank" rel="noopener noreferrer" className="ln-dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                GitHub
              </a>
              <div className="ln-dropdown-divider" />
              <button
                className="ln-dropdown-item ln-admin-item"
                onClick={() => { setDropdownOpen(false); setAdminOpen(true); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                    fill="currentColor" opacity="0.8"/>
                </svg>
                Admin Panel
              </button>
            </div>
          )}
        </div>
      </nav>

      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        connectWallet={connectWallet}
        isConnecting={isConnecting}
      />

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
                className="feature-card reveal"
                style={{ transitionDelay: `${index * 0.1}s` }}
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
                className="use-case-card reveal"
                style={{ transitionDelay: `${index * 0.1}s` }}
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
            <div className="step reveal" style={{ transitionDelay: "0s" }}>
              <div className="step-number">01</div>
              <div className="step-content">
                <h3 className="step-title">Deposit Collateral</h3>
                <p className="step-description">
                  Deposit WETH or WBTC as collateral. Your assets are securely locked in the protocol.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step reveal" style={{ transitionDelay: "0.2s" }}>
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">Mint Stablecoins</h3>
                <p className="step-description">
                  Mint Merix Holdings (DSC) tokens against your collateral. Maintain a healthy collateralization ratio.
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step reveal" style={{ transitionDelay: "0.4s" }}>
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
                <a href="https://merix-doc.vercel.app" target="_blank" rel="noopener noreferrer" className="footer-link">Documentation</a>
                <a href="#" className="footer-link">Security</a>
                <a href="#" className="footer-link">Audits</a>
              </div>
              <div className="footer-column">
                <h4 className="footer-heading">Community</h4>
                <a href="#" className="footer-link">Discord</a>
                <a href="https://x.com/Raghuvansh95" target="_blank" rel="noopener noreferrer" className="footer-link">Twitter</a>
                <a href="https://github.com/Ra9huvansh/Merix-Holdings" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
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

