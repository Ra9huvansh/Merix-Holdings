import { useState } from "react";
import TerminalBox from "../shared/TerminalBox";
import { BACKTEST_SCENARIOS } from "../../../constants/riskTerminalConfig";

export default function BacktestEngine({ runBacktest, currentEthPrice, positions }) {
  const [selected,  setSelected]  = useState(null);
  const [result,    setResult]    = useState(null);
  const [running,   setRunning]   = useState(false);
  const [showAll,   setShowAll]   = useState(false);

  const handleRun = () => {
    if (!selected) return;
    setRunning(true);
    setTimeout(() => {
      const r = runBacktest(selected);
      setResult(r);
      setRunning(false);
    }, 50);
  };

  const activeCount = positions.filter((p) => p.totalDscMinted > 0n).length;

  return (
    <div>
      <TerminalBox title="── HISTORICAL BACKTEST ENGINE ──">
        <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginBottom: 16 }}>
          &gt; REPLAYS HISTORICAL CRASH SCENARIOS AGAINST CURRENT LIVE POSITIONS
          <br />
          &gt; ACTIVE POSITIONS: {activeCount} &nbsp;|&nbsp;
          CURRENT ETH: ${currentEthPrice?.toFixed(2) || "—"}
        </div>

        <div className="t-scenario-list">
          {BACKTEST_SCENARIOS.map((s) => (
            <div
              key={s.id}
              className={`t-scenario-item ${selected === s.id ? "selected" : ""}`}
              onClick={() => { setSelected(s.id); setResult(null); }}
            >
              <span style={{ color: "var(--t-green-dim)", fontSize: 11 }}>
                {selected === s.id ? "►" : " "}
              </span>
              <span className="t-scenario-drop">-{s.dropPercent}%</span>
              <span style={{ color: "var(--t-white)" }}>{s.name}</span>
              <span style={{ color: "var(--t-green-dim)", fontSize: 11, marginLeft: "auto" }}>
                OVER {s.durationDays} DAYS
              </span>
              {currentEthPrice && (
                <span style={{ color: "var(--t-red)", fontSize: 11 }}>
                  → ${(currentEthPrice * (1 - s.dropPercent / 100)).toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="t-prompt">
          <span className="t-prompt-symbol">&gt;</span>
          <button
            className="t-btn t-btn-red"
            onClick={handleRun}
            disabled={!selected || running || activeCount === 0}
          >
            {running ? "BACKTESTING..." : "[RUN BACKTEST]"}
          </button>
          {!selected && (
            <span style={{ color: "var(--t-green-dim)", fontSize: 11 }}>
              SELECT A SCENARIO FIRST
            </span>
          )}
        </div>
      </TerminalBox>

      {result && (
        <>
          <TerminalBox title={`── BACKTEST RESULTS: ${result.scenario.name} ──`}>
            <div className="t-grid-3" style={{ marginBottom: 16 }}>
              <div className="t-stat">
                <span className="t-stat-label">SURVIVAL RATE</span>
                <span
                  className="t-stat-value"
                  style={{
                    color:
                      result.survivalRate > 80
                        ? "var(--t-green)"
                        : result.survivalRate > 50
                        ? "var(--t-amber)"
                        : "var(--t-red)",
                  }}
                >
                  {result.survivalRate.toFixed(1)}%
                </span>
              </div>
              <div className="t-stat">
                <span className="t-stat-label">POSITIONS LIQUIDATED</span>
                <span
                  className={`t-stat-value ${result.positionsLiquidated > 0 ? "t-red" : ""}`}
                >
                  {result.positionsLiquidated} / {result.totalPositions}
                </span>
              </div>
              <div className="t-stat">
                <span className="t-stat-label">DSC AT RISK</span>
                <span className="t-stat-value" style={{ fontSize: 16 }}>
                  {result.totalDscAtRisk.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              className={`t-verdict ${result.positionsLiquidated === 0 ? "survived" : result.survivalRate > 50 ? "" : "failed"}`}
              style={
                result.positionsLiquidated > 0 && result.survivalRate <= 50
                  ? {}
                  : result.positionsLiquidated === 0
                  ? {}
                  : { border: "1px solid var(--t-amber)", color: "var(--t-amber)", background: "rgba(255,170,0,0.05)", padding: "10px 14px", textAlign: "center", fontWeight: "bold", letterSpacing: 1 }
              }
            >
              {result.positionsLiquidated === 0
                ? "✓ PROTOCOL WOULD HAVE SURVIVED THIS SCENARIO INTACT"
                : result.survivalRate > 50
                ? `⚠ PROTOCOL PARTIALLY SURVIVED — ${result.positionsLiquidated} POSITION(S) LIQUIDATED`
                : `✗ PROTOCOL WOULD HAVE BEEN SEVERELY HIT — ${result.positionsLiquidated}/${result.totalPositions} LIQUIDATED`}
            </div>
          </TerminalBox>

          {/* Per-position breakdown */}
          <TerminalBox title="── PER-POSITION OUTCOME ──">
            <div style={{ marginBottom: 8 }}>
              <button
                className="t-filter-btn active"
                onClick={() => setShowAll((s) => !s)}
              >
                {showAll ? "[SHOW LIQUIDATED ONLY]" : "[SHOW ALL POSITIONS]"}
              </button>
            </div>

            <div className="t-table-scroll">
              <table className="t-table">
                <thead>
                  <tr>
                    <th>OUTCOME</th>
                    <th>ADDRESS</th>
                    <th>HF AT CRASH</th>
                    <th>DSC MINTED</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows
                    .filter((r) => showAll || !r.survived)
                    .sort((a, b) => a.hfAtCrash - b.hfAtCrash)
                    .map((row) => (
                      <tr key={row.address} className={row.survived ? "t-row-safe" : "t-row-liquidatable"}>
                        <td className={row.survived ? "t-safe" : "t-liquidatable"}>
                          {row.survived ? "[SURVIVED]" : "[LIQUIDATED]"}
                        </td>
                        <td style={{ color: "var(--t-blue)", fontFamily: "monospace" }}>
                          {row.address.slice(0, 6)}...{row.address.slice(-4)}
                        </td>
                        <td className={row.survived ? "t-safe" : "t-liquidatable"}>
                          {row.hfAtCrash === Infinity ? "∞" : row.hfAtCrash.toFixed(4)}
                        </td>
                        <td>{row.dscMinted.toFixed(2)} DSC</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TerminalBox>
        </>
      )}
    </div>
  );
}
