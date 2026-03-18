import { useState, useMemo } from "react";
import TerminalBox from "../shared/TerminalBox";

const FILTERS = ["ALL", "WARNING+", "DANGER+", "LIQUIDATABLE"];

const statusOrder = { LIQUIDATABLE: 0, DANGER: 1, WARNING: 2, SAFE: 3 };

const fmt = (n) => {
  if (n === Infinity || n > 1e6) return "∞";
  return n.toFixed(4);
};

const fmtUsd = (bigint) => {
  const val = Number(bigint) / 1e18;
  return val >= 1000
    ? `$${(val / 1000).toFixed(2)}k`
    : `$${val.toFixed(2)}`;
};

const fmtToken = (bigint, dec = 18) => {
  const val = Number(bigint) / 10 ** dec;
  return val.toFixed(4);
};

const shortAddr = (addr) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function PositionsMonitor({ positions, lastRefreshedAt, hfToFloat }) {
  const [filter, setFilter] = useState("ALL");
  const [sortKey, setSortKey]   = useState("status");
  const [sortDir, setSortDir]   = useState("asc");

  const filtered = useMemo(() => {
    let list = [...positions];
    if (filter === "WARNING+")    list = list.filter((p) => ["WARNING","DANGER","LIQUIDATABLE"].includes(p.status));
    if (filter === "DANGER+")     list = list.filter((p) => ["DANGER","LIQUIDATABLE"].includes(p.status));
    if (filter === "LIQUIDATABLE")list = list.filter((p) => p.status === "LIQUIDATABLE");

    list.sort((a, b) => {
      let av, bv;
      if (sortKey === "status") {
        av = statusOrder[a.status]; bv = statusOrder[b.status];
      } else if (sortKey === "hf") {
        av = hfToFloat(a.healthFactor); bv = hfToFloat(b.healthFactor);
      } else if (sortKey === "collateral") {
        av = Number(a.collateralValueInUsd); bv = Number(b.collateralValueInUsd);
      } else if (sortKey === "dsc") {
        av = Number(a.totalDscMinted); bv = Number(b.totalDscMinted);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [positions, filter, sortKey, sortDir, hfToFloat]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const arrow = (key) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const liquidatable = positions.filter((p) => p.status === "LIQUIDATABLE").length;
  const dscAtRisk    = positions
    .filter((p) => p.status === "LIQUIDATABLE")
    .reduce((s, p) => s + Number(p.totalDscMinted) / 1e18, 0);

  return (
    <div>
      {liquidatable > 0 && (
        <div className="t-whale-alert">
          !! ALERT: {liquidatable} POSITION(S) ARE LIQUIDATABLE — ${dscAtRisk.toFixed(2)} DSC AT RISK !!
        </div>
      )}

      <TerminalBox title="── LIVE POSITIONS MONITOR ──">
        <div className="t-filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`t-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              [{f}]
            </button>
          ))}
        </div>

        {positions.length === 0 ? (
          <div className="t-empty">
            &gt; NO ACTIVE POSITIONS FOUND ON THIS DEPLOYMENT
            <br />
            &gt; DEPOSIT COLLATERAL AND MINT DSC TO POPULATE THIS MONITOR
          </div>
        ) : (
          <div className="t-table-scroll">
            <table className="t-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("status")}>STATUS{arrow("status")}</th>
                  <th>ADDRESS</th>
                  <th onClick={() => handleSort("hf")}>HEALTH FACTOR{arrow("hf")}</th>
                  <th onClick={() => handleSort("collateral")}>COLLATERAL USD{arrow("collateral")}</th>
                  <th onClick={() => handleSort("dsc")}>DSC MINTED{arrow("dsc")}</th>
                  <th>WETH</th>
                  <th>WBTC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pos) => {
                  const hf = hfToFloat(pos.healthFactor);
                  const cls = `t-row-${pos.status.toLowerCase()}`;
                  return (
                    <tr key={pos.address} className={cls}>
                      <td className={`t-${pos.status.toLowerCase()}`}>
                        [{pos.status}]
                      </td>
                      <td style={{ color: "var(--t-blue)", fontFamily: "monospace" }}>
                        {shortAddr(pos.address)}
                      </td>
                      <td className={`t-${pos.status.toLowerCase()}`}>
                        {fmt(hf)}
                      </td>
                      <td>{fmtUsd(pos.collateralValueInUsd)}</td>
                      <td>{(Number(pos.totalDscMinted) / 1e18).toFixed(2)} DSC</td>
                      <td>{fmtToken(pos.wethBalance)} WETH</td>
                      <td>{fmtToken(pos.wbtcBalance)} WBTC</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="t-table-footer">
          TOTAL: {positions.length} &nbsp;|&nbsp;
          SHOWING: {filtered.length} &nbsp;|&nbsp;
          LIQUIDATABLE: <span className="t-liquidatable">{liquidatable}</span> &nbsp;|&nbsp;
          DSC AT RISK: ${dscAtRisk.toFixed(2)} &nbsp;|&nbsp;
          UPDATED: {lastRefreshedAt?.toLocaleTimeString() || "--:--:--"}
        </div>
      </TerminalBox>
    </div>
  );
}
