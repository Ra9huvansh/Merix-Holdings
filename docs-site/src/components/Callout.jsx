const icons = {
  info: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  tip: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <path d="M10 2a6 6 0 00-3 11.2V15a1 1 0 001 1h4a1 1 0 001-1v-1.8A6 6 0 0010 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <path d="M8.68 3.26a1.5 1.5 0 012.64 0l6.5 11.5A1.5 1.5 0 0116.5 17h-13a1.5 1.5 0 01-1.32-2.24l6.5-11.5z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  danger: (
    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6v5M10 13v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
}

const titles = {
  info: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Important',
}

export default function Callout({ type = 'info', title, children }) {
  return (
    <div className={`callout ${type}`}>
      <div className="callout-icon">{icons[type]}</div>
      <div className="callout-body">
        <div className="callout-title">{title || titles[type]}</div>
        <p className="callout-text">{children}</p>
      </div>
    </div>
  )
}
