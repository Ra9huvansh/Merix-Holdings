const TerminalBox = ({ title, children, style }) => (
  <div className="t-box" style={style}>
    {title && <span className="t-box-title">{title}</span>}
    <div className="t-box-body">{children}</div>
  </div>
);

export default TerminalBox;
