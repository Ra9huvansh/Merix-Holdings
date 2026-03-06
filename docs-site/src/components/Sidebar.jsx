import { NavLink } from 'react-router-dom'

const nav = [
  {
    title: 'Introduction',
    items: [
      { label: 'Overview', to: '/' },
      { label: 'Getting Started', to: '/getting-started' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'The Stablecoin (DSC)', to: '/concepts/stablecoin' },
      { label: 'Collateral', to: '/concepts/collateral' },
      { label: 'Health Factor', to: '/concepts/health-factor' },
      { label: 'Liquidation', to: '/concepts/liquidation' },
      { label: 'Yield Aggregator', to: '/concepts/yield' },
      { label: 'Redemption Contract', to: '/concepts/redemption' },
    ],
  },
  {
    title: 'Protocol Reference',
    items: [
      { label: 'Smart Contracts', to: '/reference/contracts' },
      { label: 'Security', to: '/reference/security' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'FAQ', to: '/faq' },
    ],
  },
]

export default function Sidebar({ onLinkClick }) {
  return (
    <nav>
      {nav.map((section, i) => (
        <div className="nav-section" key={i}>
          {i > 0 && <div className="nav-divider" />}
          <div className="nav-section-title">{section.title}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onLinkClick}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
