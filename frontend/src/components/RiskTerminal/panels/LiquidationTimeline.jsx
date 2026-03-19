import { useMemo } from "react";
import TerminalBox from "../shared/TerminalBox";
import SparklineCanvas from "../shared/SparklineCanvas";

const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export default function LiquidationTimeline({ chainlinkRounds, runRegression, positions }) {
  // runRegression is a useCallback that closes over chainlinkRounds, positions, wbtcPriceUsd —
  // so it updates whenever those change, and this memo re-runs correctly with just [runRegression].
  const regression = useMemo(() => {
    if (typeof runRegression === "function") return runRegression();
    return null;
  }, [runRegression]);

  const priceHistory = chainlinkRounds.map((r) => r.priceUsd);

  const firstAtRisk = regression?.projections?.find((p) => p.positionsAtRisk > 0);
  const slope = regression?.slope || 0;
  const trend = slope < 0 ? "FALLING" : slope > 0 ? "RISING" : "FLAT";
  const trendColor =
    slope < -1 ? "var(--t-red)"
    : slope < 0 ? "var(--t-amber)"
    : "var(--t-green)";

  return (
    <div>
      {/* Price history sparkline */}
      <TerminalBox title="── CHAINLINK ETH/USD PRICE HISTORY ──">
        {priceHistory.length < 2 ? (
          <div className="t-loading">&gt; LOADING PRICE DATA</div>
        ) : (
          <>
            <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginBottom: 8 }}>
              LAST {priceHistory.length} ROUNDS &nbsp;|&nbsp;
              OLDEST: ${Math.min(...priceHistory).toFixed(2)} &nbsp;|&nbsp;
              NEWEST: ${Math.max(...priceHistory).toFixed(2)} &nbsp;|&nbsp;
              CURRENT: ${chainlinkRounds[0]?.priceUsd.toFixed(2)}
            </div>
            <SparklineCanvas
              data={[...priceHistory].reverse()}
              width={700}
              height={70}
              color={slope < 0 ? "#ff6600" : "#00ff41"}
            />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--t-green-dim)", fontSize: 10, marginTop: 4 }}>
              <span>OLDEST ROUND</span>
              <span>LATEST ROUND</span>
            </div>
          </>
        )}
      </TerminalBox>

      {/* Regression stats */}
      {regression && (
        <div className="t-regression-box">
          <div className="t-regression-item">
            <span>SLOPE</span>
            <span style={{ color: trendColor }}>
              {slope >= 0 ? "+" : ""}{slope.toFixed(4)} USD/ROUND
            </span>
          </div>
          <div className="t-regression-item">
            <span>R²</span>
            <span>{regression.rSquared.toFixed(4)}</span>
          </div>
          <div className="t-regression-item">
            <span>TREND</span>
            <span style={{ color: trendColor }}>{trend}</span>
          </div>
          <div className="t-regression-item">
            <span>DATA POINTS</span>
            <span>{chainlinkRounds.length} ROUNDS</span>
          </div>
          <div className="t-regression-item">
            <span>ACTIVE POSITIONS</span>
            <span>{positions.filter((p) => p.totalDscMinted > 0n).length}</span>
          </div>
        </div>
      )}

      {/* Projection timeline */}
      <TerminalBox title="── PREDICTIVE LIQUIDATION TIMELINE ──">
        {!regression ? (
          <div className="t-loading">&gt; COMPUTING REGRESSION</div>
        ) : (
          <>
            {firstAtRisk ? (
              <div className="t-whale-alert" style={{ borderColor: "var(--t-red)", color: "var(--t-red)", animation: "none" }}>
                !! FIRST LIQUIDATIONS PROJECTED AT {fmt(firstAtRisk.projectedTime)} ({firstAtRisk.label})
                &nbsp;— ${firstAtRisk.projectedPrice.toFixed(2)} / {firstAtRisk.positionsAtRisk} POSITION(S)
              </div>
            ) : (
              <div style={{ color: "var(--t-green)", marginBottom: 12, fontSize: 12 }}>
                ✓ NO LIQUIDATIONS PROJECTED IN NEXT {regression.projections.length}H AT CURRENT TREND
              </div>
            )}

            {/* Timeline table */}
            <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginBottom: 8 }}>
              PROJECTED PRICES &amp; POSITIONS AT RISK (BASED ON LINEAR REGRESSION)
            </div>

            <div>
              {/* Header */}
              <div className="t-timeline-step" style={{ borderBottom: "1px solid var(--t-green-dim)", color: "var(--t-green-dim)", fontSize: 11 }}>
                <span>TIME</span>
                <span>PROJ. PRICE</span>
                <span>AT RISK</span>
                <span>BAR</span>
              </div>

              {regression.projections.map((proj) => {
                const barFill = Math.min(proj.positionsAtRisk, 20);
                const atRiskColor =
                  proj.positionsAtRisk === 0
                    ? "var(--t-green)"
                    : proj.positionsAtRisk < 3
                    ? "var(--t-amber)"
                    : "var(--t-red)";

                return (
                  <div key={proj.step} className="t-timeline-step">
                    <span className="t-timeline-label">{proj.label}</span>
                    <span className="t-timeline-price">${proj.projectedPrice.toFixed(2)}</span>
                    <span style={{ color: atRiskColor }}>
                      {proj.positionsAtRisk > 0 ? `⚠ ${proj.positionsAtRisk}` : "✓ 0"}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                      <span style={{ color: atRiskColor }}>
                        {"█".repeat(barFill)}
                      </span>
                      <span style={{ color: "var(--t-green-faint)" }}>
                        {"░".repeat(20 - barFill)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ color: "var(--t-green-dim)", fontSize: 10, marginTop: 12 }}>
              NOTE: PROJECTION USES LINEAR REGRESSION ON LAST {chainlinkRounds.length} CHAINLINK ROUNDS.
              ACTUAL PRICES DEPEND ON MARKET CONDITIONS.
            </div>
          </>
        )}
      </TerminalBox>
    </div>
  );
}
