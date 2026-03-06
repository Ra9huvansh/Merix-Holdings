import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Overview from './pages/Overview'
import GettingStarted from './pages/GettingStarted'
import TheStablecoin from './pages/TheStablecoin'
import Collateral from './pages/Collateral'
import HealthFactor from './pages/HealthFactor'
import Liquidation from './pages/Liquidation'
import YieldAggregator from './pages/YieldAggregator'
import Redemption from './pages/Redemption'
import Contracts from './pages/Contracts'
import Security from './pages/Security'
import FAQ from './pages/FAQ'

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('docs-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('docs-theme', theme)
  }, [theme])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  const toggleSidebar = () => setSidebarOpen(o => !o)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        toggleSidebar={toggleSidebar}
      />

      <div className="docs-layout">
        {/* Overlay for mobile */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={closeSidebar}
        />

        <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`}>
          <Sidebar onLinkClick={closeSidebar} />
        </aside>

        <main className="docs-main">
          <div className="docs-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/getting-started" element={<GettingStarted />} />
              <Route path="/concepts/stablecoin" element={<TheStablecoin />} />
              <Route path="/concepts/collateral" element={<Collateral />} />
              <Route path="/concepts/health-factor" element={<HealthFactor />} />
              <Route path="/concepts/liquidation" element={<Liquidation />} />
              <Route path="/concepts/yield" element={<YieldAggregator />} />
              <Route path="/concepts/redemption" element={<Redemption />} />
              <Route path="/reference/contracts" element={<Contracts />} />
              <Route path="/reference/security" element={<Security />} />
              <Route path="/faq" element={<FAQ />} />
              {/* Catch-all → Overview */}
              <Route path="*" element={<Overview />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  )
}
