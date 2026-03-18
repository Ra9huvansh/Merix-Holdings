import TerminalBox from "../shared/TerminalBox";

const BAR_CHARS = 30;

const asciiBar = (pct) => {
  const filled = Math.round((pct / 100) * BAR_CHARS);
  const empty  = BAR_CHARS - filled;
  return (
    <>
      <span className="t-bar-fill">{"█".repeat(filled)}</span>
      <span className="t-bar-track">{"░".repeat(empty)}</span>
    </>
  );
};

const shortAddr = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function CollateralConcentration({
  concentrationData,
  isWhaleAlert,
  currentEthPrice,
  positions,
}) {
  const totalWethUsd = concentrationData.reduce((s, d) => s + d.wethValueUsd, 0);
  const totalWbtcUsd = concentrationData.reduce((s, d) => s + d.wbtcValueUsd, 0);
  const totalUsd     = totalWethUsd + totalWbtcUsd;

  const wethPct = totalUsd > 0 ? (totalWethUsd / totalUsd) * 100 : 0;
  const wbtcPct = totalUsd > 0 ? (totalWbtcUsd / totalUsd) * 100 : 0;

  const top3Pct = concentrationData
    .slice(0, 3)
    .reduce((s, d) => s + d.percentOfProtocol, 0);

  return (
    <div>
      {isWhaleAlert && (
        <div className="t-whale-alert">
          !! WHALE ALERT: TOP 3 WALLETS CONTROL {top3Pct.toFixed(1)}% OF PROTOCOL COLLATERAL !!
        </div>
      )}

      <div className="t-grid-2">
        {/* Protocol split */}
        <TerminalBox title="── COLLATERAL TYPE SPLIT ──">
          <div style={{ marginBottom: 16 }}>
            <div className="t-concentration-meta">
              <span>WETH</span>
              <span style={{ color: "var(--t-green)" }}>${totalWethUsd.toFixed(2)}</span>
              <span style={{ color: "var(--t-green-dim)" }}>{wethPct.toFixed(1)}%</span>
            </div>
            <div className="t-concentration-bar-bg">
              <div className="t-concentration-bar-fill" style={{ width: `${wethPct}%` }} />
            </div>
          </div>
          <div>
            <div className="t-concentration-meta">
              <span>WBTC</span>
              <span style={{ color: "var(--t-amber)" }}>${totalWbtcUsd.toFixed(2)}</span>
              <span style={{ color: "var(--t-green-dim)" }}>{wbtcPct.toFixed(1)}%</span>
            </div>
            <div className="t-concentration-bar-bg">
              <div
                className="t-concentration-bar-fill"
                style={{ width: `${wbtcPct}%`, background: "var(--t-amber)" }}
              />
            </div>
          </div>

          <hr className="t-divider" />
          <div className="t-grid-2" style={{ gap: 8 }}>
            <div className="t-stat">
              <span className="t-stat-label">TOTAL TVL</span>
              <span className="t-stat-value" style={{ fontSize: 16 }}>
                ${totalUsd >= 1000 ? `${(totalUsd / 1000).toFixed(2)}k` : totalUsd.toFixed(2)}
              </span>
            </div>
            <div className="t-stat">
              <span className="t-stat-label">ETH PRICE</span>
              <span className="t-stat-value" style={{ fontSize: 16 }}>
                ${currentEthPrice?.toFixed(2) || "—"}
              </span>
            </div>
          </div>
        </TerminalBox>

        {/* HHI summary */}
        <TerminalBox title="── CONCENTRATION STATS ──">
          <div className="t-stat" style={{ marginBottom: 12 }}>
            <span className="t-stat-label">UNIQUE DEPOSITORS</span>
            <span className="t-stat-value" style={{ fontSize: 18 }}>
              {concentrationData.length}
            </span>
          </div>
          <div className="t-stat" style={{ marginBottom: 12 }}>
            <span className="t-stat-label">TOP 3 SHARE</span>
            <span
              className="t-stat-value"
              style={{
                fontSize: 18,
                color: isWhaleAlert ? "var(--t-amber)" : "var(--t-green)",
              }}
            >
              {top3Pct.toFixed(1)}%
            </span>
          </div>
          <div className="t-stat">
            <span className="t-stat-label">CONCENTRATION RISK</span>
            <span
              className="t-stat-value"
              style={{
                fontSize: 14,
                color: isWhaleAlert ? "var(--t-amber)" : "var(--t-green)",
              }}
            >
              {isWhaleAlert ? "[HIGH — WHALE DETECTED]" : "[ACCEPTABLE]"}
            </span>
          </div>
        </TerminalBox>
      </div>

      {/* Per-address breakdown */}
      <TerminalBox title="── PER-WALLET COLLATERAL BREAKDOWN ──">
        {concentrationData.length === 0 ? (
          <div className="t-empty">&gt; NO COLLATERAL DATA AVAILABLE</div>
        ) : (
          <div className="t-table-scroll">
            <table className="t-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ADDRESS</th>
                  <th>WETH VALUE</th>
                  <th>WBTC VALUE</th>
                  <th>TOTAL USD</th>
                  <th>SHARE</th>
                  <th style={{ minWidth: 220 }}>DISTRIBUTION</th>
                </tr>
              </thead>
              <tbody>
                {concentrationData.map((d, i) => {
                  const isWhale = i < 3 && isWhaleAlert;
                  return (
                    <tr key={d.address}>
                      <td style={{ color: "var(--t-green-dim)" }}>{i + 1}</td>
                      <td style={{ color: "var(--t-blue)", fontFamily: "monospace" }}>
                        {shortAddr(d.address)}
                      </td>
                      <td>${d.wethValueUsd.toFixed(2)}</td>
                      <td style={{ color: "var(--t-amber)" }}>${d.wbtcValueUsd.toFixed(2)}</td>
                      <td style={{ color: "var(--t-green)" }}>${d.totalValueUsd.toFixed(2)}</td>
                      <td className={isWhale ? "t-warning" : "t-safe"}>
                        {d.percentOfProtocol.toFixed(1)}%
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {asciiBar(d.percentOfProtocol)}
                        {" "}{d.percentOfProtocol.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TerminalBox>
    </div>
  );
}
