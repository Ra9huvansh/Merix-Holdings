import { Link } from 'react-router-dom'

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
  </svg>
)

const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Header({ theme, toggleTheme, toggleSidebar }) {
  return (
    <header className="docs-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Menu">
          <MenuIcon />
        </button>
        <Link to="/" className="header-brand">
          <svg className="header-brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#1a1a2e"/>
            <circle cx="16" cy="16" r="11" fill="url(#hgrad)"/>
            <path d="M16 9L20 16L16 21L12 16L16 9Z" fill="white" opacity="0.95"/>
            <defs>
              <linearGradient id="hgrad" x1="5" y1="5" x2="27" y2="27">
                <stop offset="0%" stopColor="#667eea"/>
                <stop offset="100%" stopColor="#764ba2"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="header-brand-name">Merix Holdings</span>
          <span className="header-brand-divider" />
          <span className="header-brand-section">Docs</span>
        </Link>
      </div>

      <div className="header-right">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <a
          href="https://merix-holdings.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="header-launch-btn"
        >
          Launch App
          <ExternalIcon />
        </a>
      </div>
    </header>
  )
}
