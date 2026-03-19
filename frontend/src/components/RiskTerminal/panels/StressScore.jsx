import TerminalBox from "../shared/TerminalBox";
import GaugeCanvas from "../shared/GaugeCanvas";
import SparklineCanvas from "../shared/SparklineCanvas";

const getScoreBand = (score) => {
  if (score < 30) return { label: "LOW RISK",  color: "#00ff41" };
  if (score < 60) return { label: "ELEVATED",  color: "#ffaa00" };
  if (score < 80) return { label: "HIGH RISK", color: "#ff6600" };
  return              { label: "CRITICAL",    color: "#ff2222" };
};

export default function StressScore({
  stressScore,
  stressHistory,
  positions,
  chainlinkRounds,
  concentrationData,
  isWhaleAlert,
}) {
  const band = getScoreBand(stressScore);

  const active     = positions.filter((p) => p.totalDscMinted > 0n);
  const atRisk     = active.filter((p) => {
    const hf = p.healthFactor;
    if (!hf) return false;
    const MAX = BigInt("100000000000000000000000");
    if (hf > MAX) return false;
    return Number(hf) / 1e18 < 1.5;
  });

  const newest = chainlinkRounds[0]?.priceUsd || 0;
  const oldest = chainlinkRounds[chainlinkRounds.length - 1]?.priceUsd || 0;
  const pctChange = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;

  const top3Pct = concentrationData
    .slice(0, 3)
    .reduce((s, d) => s + d.percentOfProtocol, 0);

  const hfRatioA = active.length > 0 ? (atRisk.length / active.length) * 100 : 0;
  const velocityB = Math.min(100, Math.max(0, (-pctChange / 20) * 100));
  // Use HHI (same formula as the hook) so the displayed breakdown matches the actual score
  const totalValue = concentrationData.reduce((s, d) => s + d.totalValueUsd, 0);
  const HHI = totalValue > 0
    ? concentrationData.reduce((s, d) => s + (d.totalValueUsd / totalValue) ** 2, 0)
    : 0;
  const concC = Math.min(100, (HHI / 0.25) * 100);

  const sparkData = stressHistory.map((h) => h.score);

  return (
    <div>
      <div className="t-grid-2">
        {/* Gauge */}
        <TerminalBox title="── PROTOCOL STRESS SCORE ──">
          <div className="t-gauge-wrapper">
            <GaugeCanvas score={stressScore} width={220} height={120} />
            <div
              className="t-gauge-label"
              style={{
                color: band.color,
                fontSize: 14,
                fontWeight: "bold",
                letterSpacing: 2,
                marginTop: 4,
                textShadow: `0 0 8px ${band.color}80`,
              }}
            >
              [{band.label}]
            </div>
            <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginTop: 8 }}>
              COMPOSITE RISK INDEX — UPDATED EVERY 30s
            </div>
          </div>
        </TerminalBox>

        {/* Score breakdown */}
        <TerminalBox title="── SCORE BREAKDOWN ──">
          <table className="t-stress-breakdown">
            <tbody>
              <tr>
                <td>INPUT A — HF RATIO (50%)</td>
                <td style={{ color: hfRatioA > 50 ? "var(--t-red)" : "var(--t-green)" }}>
                  {hfRatioA.toFixed(1)} / 100
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 12, color: "var(--t-gray)", fontSize: 11 }}>
                  positions with HF &lt; 1.5
                </td>
                <td style={{ color: "var(--t-gray)", fontSize: 11 }}>
                  {atRisk.length} / {active.length}
                </td>
              </tr>
              <tr><td colSpan={2} style={{ paddingBottom: 8 }} /></tr>

              <tr>
                <td>INPUT B — PRICE VELOCITY (30%)</td>
                <td style={{ color: velocityB > 50 ? "var(--t-amber)" : "var(--t-green)" }}>
                  {velocityB.toFixed(1)} / 100
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 12, color: "var(--t-gray)", fontSize: 11 }}>
                  recent price change ({chainlinkRounds.length} rounds)
                </td>
                <td style={{ color: pctChange < 0 ? "var(--t-red)" : "var(--t-green)", fontSize: 11 }}>
                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
                </td>
              </tr>
              <tr><td colSpan={2} style={{ paddingBottom: 8 }} /></tr>

              <tr>
                <td>INPUT C — CONCENTRATION (20%)</td>
                <td style={{ color: isWhaleAlert ? "var(--t-amber)" : "var(--t-green)" }}>
                  {concC.toFixed(1)} / 100
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 12, color: "var(--t-gray)", fontSize: 11 }}>
                  top 3 wallets control
                </td>
                <td style={{ color: isWhaleAlert ? "var(--t-amber)" : "var(--t-green-dim)", fontSize: 11 }}>
                  {top3Pct.toFixed(1)}%
                </td>
              </tr>
              <tr><td colSpan={2}><hr className="t-divider" /></td></tr>

              <tr>
                <td style={{ fontWeight: "bold" }}>FINAL SCORE</td>
                <td style={{ color: band.color, fontWeight: "bold", fontSize: 16 }}>
                  {stressScore} / 100
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--t-green-dim)", fontSize: 10 }}>
                  FORMULA: 0.5A + 0.3B + 0.2C
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </TerminalBox>
      </div>

      {/* Sparkline history */}
      <TerminalBox title="── STRESS SCORE HISTORY ──">
        {sparkData.length < 2 ? (
          <div className="t-empty">&gt; COLLECTING DATA — HISTORY BUILDS OVER TIME</div>
        ) : (
          <>
            <div style={{ color: "var(--t-green-dim)", fontSize: 11, marginBottom: 8 }}>
              LAST {sparkData.length} SAMPLES &nbsp;|&nbsp;
              MIN: {Math.min(...sparkData)} &nbsp;|&nbsp;
              MAX: {Math.max(...sparkData)} &nbsp;|&nbsp;
              CURRENT: {stressScore}
            </div>
            <SparklineCanvas
              data={sparkData}
              width={700}
              height={60}
              color={band.color}
            />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--t-green-dim)", fontSize: 10, marginTop: 4 }}>
              <span>OLDEST</span>
              <span>NEWEST</span>
            </div>
          </>
        )}
      </TerminalBox>
    </div>
  );
}
