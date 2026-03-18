import { useState } from "react";
import TerminalBox from "../shared/TerminalBox";

export default function CascadeSimulator({ runCascadeSimulation, currentEthPrice, positions }) {
  const [dropPct, setDropPct]   = useState("20");
  const [steps,   setSteps]     = useState(null);
  const [running, setRunning]   = useState(false);

  const handleRun = () => {
    const pct = parseFloat(dropPct);
    if (isNaN(pct) || pct <= 0 || pct >= 100) return;
    setRunning(true);
    setTimeout(() => {
      const result = runCascadeSimulation(pct);
      setSteps(result);
      setRunning(false);
    }, 50);
  };

  const totalLiquidated  = steps ? steps[steps.length - 1]?.cumulativePositionsLiquidated : 0;
  const totalDscFreed    = steps ? steps[steps.length - 1]?.totalLiquidatedDsc : 0;
  const cascadeDepth     = steps ? steps.filter((s) => s.newLiquidations.length > 0).length - 1 : 0;
  const activePositions  = positions.filter((p) => p.totalDscMinted > 0n).length;

  return (
    <div>
      <TerminalBox title="── LIQUIDATION CASCADE SIMULATOR ──">
        <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginBottom: 12 }}>
          &gt; SIMULATES: initial price drop → liquidations → secondary sell pressure → cascade
          <br />
          &gt; ACTIVE POSITIONS: {activePositions} &nbsp;|&nbsp;
            CURRENT ETH: ${currentEthPrice?.toFixed(2) || "—"}
        </div>

        <div className="t-prompt">
          <span className="t-prompt-symbol">&gt;</span>
          <span style={{ color: "var(--t-green-dim)" }}>DROP ETH BY</span>
          <input
            className="t-input"
            type="number"
            min="1"
            max="99"
            value={dropPct}
            onChange={(e) => setDropPct(e.target.value)}
            style={{ width: 70 }}
          />
          <span style={{ color: "var(--t-green-dim)" }}>%</span>
          <span style={{ color: "var(--t-green-dim)", fontSize: 11 }}>
            → ${currentEthPrice ? (currentEthPrice * (1 - parseFloat(dropPct) / 100)).toFixed(2) : "—"}
          </span>
          <button
            className="t-btn t-btn-amber"
            onClick={handleRun}
            disabled={running || !currentEthPrice}
          >
            {running ? "SIMULATING..." : "[RUN SIMULATION]"}
          </button>
        </div>

        {steps && (
          <>
            <hr className="t-divider" />
            <div className="t-cascade-root">
              {steps.map((step, idx) => (
                <div key={idx} className="t-cascade-step">
                  <div className="t-cascade-step-header">
                    {step.iteration === 0
                      ? `► INITIAL DROP  ETH → $${step.ethPrice.toFixed(2)}`
                      : `  ↳ CASCADE [ITER ${step.iteration}]  ETH → $${step.ethPrice.toFixed(2)}`}
                    {step.newLiquidations.length > 0 && (
                      <span className="t-liquidatable">
                        {" "}— {step.newLiquidations.length} NEW LIQUIDATION(S)
                      </span>
                    )}
                  </div>

                  {step.newLiquidations.map((liq, li) => (
                    <div key={li} className="t-cascade-liq-row">
                      &nbsp;&nbsp;└─ {liq.address.slice(0, 6)}...{liq.address.slice(-4)}
                      &nbsp; DSC: {liq.dscMinted.toFixed(2)}
                      &nbsp; COLLATERAL: ${liq.collateralUsd.toFixed(2)}
                    </div>
                  ))}

                  {step.newLiquidations.length === 0 && step.iteration > 0 && (
                    <div className="t-cascade-stable">
                      &nbsp;&nbsp;✓ CASCADE ENDS — STABLE STATE REACHED AT ${step.ethPrice.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="t-cascade-summary">
              <div style={{ color: "var(--t-amber)", fontWeight: "bold", marginBottom: 8 }}>
                ── SIMULATION SUMMARY ──
              </div>
              <div className="t-grid-3">
                <div className="t-stat">
                  <span className="t-stat-label">POSITIONS LIQUIDATED</span>
                  <span className={`t-stat-value ${totalLiquidated > 0 ? "t-red" : ""}`}>
                    {totalLiquidated} / {activePositions}
                  </span>
                </div>
                <div className="t-stat">
                  <span className="t-stat-label">DSC FREED</span>
                  <span className="t-stat-value">{totalDscFreed.toFixed(2)}</span>
                </div>
                <div className="t-stat">
                  <span className="t-stat-label">CASCADE DEPTH</span>
                  <span className={`t-stat-value ${cascadeDepth > 0 ? "t-amber" : ""}`}>
                    {cascadeDepth} ITERATION(S)
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {!steps && (
          <div className="t-empty">
            &gt; ENTER A DROP PERCENTAGE AND RUN SIMULATION
            <br />
            &gt; RESULTS WILL SHOW LIQUIDATION ORDER AND CASCADE CHAIN
          </div>
        )}
      </TerminalBox>
    </div>
  );
}
