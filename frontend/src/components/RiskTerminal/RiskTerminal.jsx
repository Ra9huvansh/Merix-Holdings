import { useState, useEffect } from "react";
import { useRiskTerminal } from "../../hooks/useRiskTerminal";
import PositionsMonitor      from "./panels/PositionsMonitor";
import CascadeSimulator      from "./panels/CascadeSimulator";
import CollateralConcentration from "./panels/CollateralConcentration";
import StressScore           from "./panels/StressScore";
import LiquidationTimeline   from "./panels/LiquidationTimeline";
import BacktestEngine        from "./panels/BacktestEngine";
import "./RiskTerminal.css";

const PANELS = [
  { id: "positions",     label: "[1] POSITIONS"    },
  { id: "cascade",       label: "[2] CASCADE SIM"  },
  { id: "concentration", label: "[3] CONCENTRATION"},
  { id: "stress",        label: "[4] STRESS SCORE" },
  { id: "timeline",      label: "[5] TIMELINE"     },
  { id: "backtest",      label: "[6] BACKTEST"     },
];

// ── Boot screen ──────────────────────────────────────────────
const BootScreen = ({ bootLog, bootProgress }) => (
  <div className="t-boot">
    <div className="t-boot-title">
      MERIX PROTOCOL RISK INTELLIGENCE TERMINAL v1.0
    </div>
    <div className="t-boot-log">
      {bootLog.map((line, i) => (
        <div key={i} className={`t-boot-line ${line.state}`}>
          &gt; {line.msg}
        </div>
      ))}
    </div>
    <div className="t-boot-progress-bar">
      <div className="t-boot-progress-fill" style={{ width: `${bootProgress}%` }} />
    </div>
    <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginTop: 8 }}>
      {bootProgress}% COMPLETE
    </div>
  </div>
);

// ── Main terminal ─────────────────────────────────────────────
export default function RiskTerminal() {
  const [activePanel, setActivePanel] = useState("positions");
  const [now, setNow] = useState(() => new Date());
  const data = useRiskTerminal();

  // Live clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcuts 1–6, R to refresh
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT") return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= PANELS.length) {
        setActivePanel(PANELS[idx - 1].id);
      }
      if (e.key === "r" || e.key === "R") {
        data.refreshNow?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data]);

  if (data.isBooting) {
    return <BootScreen bootLog={data.bootLog} bootProgress={data.bootProgress} />;
  }

  if (data.error) {
    return (
      <div className="risk-terminal" style={{ padding: 32 }}>
        <div className="t-error">
          !! TERMINAL ERROR: {data.error}
          <br />
          &gt; CHECK WALLET CONNECTION AND NETWORK (SEPOLIA)
        </div>
      </div>
    );
  }

  const liquidatableCount = data.positions.filter((p) => p.status === "LIQUIDATABLE").length;
  const scoreColor =
    data.stressScore < 30 ? "#00ff41"
    : data.stressScore < 60 ? "#ffaa00"
    : data.stressScore < 80 ? "#ff6600"
    : "#ff2222";

  return (
    <div className="risk-terminal">
      {/* Header */}
      <div className="t-header">
        <span className="t-header-title">
          ▶ MERIX RISK INTELLIGENCE TERMINAL v1.0
        </span>
        <span className="t-header-meta">
          ETH <span style={{ color: "#00ff41" }}>
            ${(data.liveEthPrice ?? data.currentEthPrice)?.toFixed(2) ?? "—"}
          </span>
          &nbsp;|&nbsp;
          POSITIONS: {data.positions.length}
          &nbsp;|&nbsp;
          LIQUIDATABLE:{" "}
          <span style={{ color: liquidatableCount > 0 ? "#ff2222" : "#00ff41" }}>
            {liquidatableCount}
          </span>
          &nbsp;|&nbsp;
          STRESS:{" "}
          <span style={{ color: scoreColor }}>{data.stressScore}/100</span>
          &nbsp;|&nbsp;
          BLOCK: {data.blockNumber || "—"}
          &nbsp;|&nbsp;
          <span style={{ color: "#00ff41" }}>{now.toLocaleTimeString()}</span>
          &nbsp;|&nbsp;
          UPD: {data.lastRefreshedAt?.toLocaleTimeString() || "--:--:--"}
        </span>
      </div>

      {/* Tab bar */}
      <div className="t-tabbar">
        {PANELS.map((p) => (
          <button
            key={p.id}
            className={`t-tab ${activePanel === p.id ? "t-tab-active" : ""}`}
            onClick={() => setActivePanel(p.id)}
          >
            {p.label}
            {p.id === "positions" && liquidatableCount > 0 && (
              <span style={{ color: "#ff2222", marginLeft: 4 }}>
                ●
              </span>
            )}
          </button>
        ))}
        <button className="t-tab t-tab-refresh" onClick={data.refreshNow}>
          [R] REFRESH
        </button>
      </div>

      {/* Non-fatal warning banners */}
      {data.wbtcPriceError && (
        <div className="t-error" style={{ fontSize: 11, padding: "6px 12px", marginBottom: 4 }}>
          !! WBTC ORACLE UNAVAILABLE — WBTC COLLATERAL VALUED AT $0. CASCADE/BACKTEST RESULTS MAY BE INACCURATE.
        </div>
      )}
      {data.refreshError && (
        <div className="t-error" style={{ fontSize: 11, padding: "6px 12px", marginBottom: 4 }}>
          !! {data.refreshError}
        </div>
      )}

      {/* Panel content */}
      <div className="t-panel-content">
        {activePanel === "positions"     && (
          <PositionsMonitor
            positions={data.positions}
            lastRefreshedAt={data.lastRefreshedAt}
            hfToFloat={data.hfToFloat}
          />
        )}
        {activePanel === "cascade"       && (
          <CascadeSimulator
            runCascadeSimulation={data.runCascadeSimulation}
            currentEthPrice={data.currentEthPrice}
            positions={data.positions}
          />
        )}
        {activePanel === "concentration" && (
          <CollateralConcentration
            concentrationData={data.concentrationData}
            isWhaleAlert={data.isWhaleAlert}
            currentEthPrice={data.currentEthPrice}
            positions={data.positions}
          />
        )}
        {activePanel === "stress"        && (
          <StressScore
            stressScore={data.stressScore}
            stressHistory={data.stressHistory}
            positions={data.positions}
            chainlinkRounds={data.chainlinkRounds}
            concentrationData={data.concentrationData}
            isWhaleAlert={data.isWhaleAlert}
          />
        )}
        {activePanel === "timeline"      && (
          <LiquidationTimeline
            chainlinkRounds={data.chainlinkRounds}
            runRegression={data.runRegression}
            positions={data.positions}
          />
        )}
        {activePanel === "backtest"      && (
          <BacktestEngine
            runBacktest={data.runBacktest}
            currentEthPrice={data.currentEthPrice}
            positions={data.positions}
          />
        )}
      </div>
    </div>
  );
}
