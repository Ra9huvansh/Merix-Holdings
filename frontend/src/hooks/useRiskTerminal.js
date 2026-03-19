import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { DSC_ENGINE_ABI } from "../constants/abis";
import { DSC_ENGINE_ADDRESS, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import {
  CHAINLINK_ETH_USD_SEPOLIA,
  CHAINLINK_ABI,
  CHAINLINK_HISTORY_ROUNDS,
  BLOCK_POLL_INTERVAL,
  PRICE_POLL_INTERVAL,
  PRICE_TICK_INTERVAL,
  STRESS_WEIGHT_HF_RATIO,
  STRESS_WEIGHT_VELOCITY,
  STRESS_WEIGHT_CONCENTRATION,
  WHALE_ALERT_THRESHOLD,
  LIQUIDATION_PRESSURE_FACTOR,
  CASCADE_MAX_ITERATIONS,
  REGRESSION_PROJECTION_STEPS,
  BACKTEST_SCENARIOS,
  POSITION_BATCH_SIZE,
  EVENT_BLOCK_CHUNK,
  DEPLOYMENT_BLOCK,
} from "../constants/riskTerminalConfig";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const hfToFloat = (hfBigInt) => {
  if (!hfBigInt) return Infinity;
  const MAX = BigInt("100000000000000000000000"); // treat > 1e23 as infinity
  if (hfBigInt > MAX) return Infinity;
  return Number(hfBigInt) / 1e18;
};

const statusFromHF = (hf) => {
  if (hf === Infinity) return "SAFE";
  if (hf >= 2.0) return "SAFE";
  if (hf >= 1.5) return "WARNING";
  if (hf >= 1.0) return "DANGER";
  return "LIQUIDATABLE";
};

async function batchedFetch(items, fetchFn, batchSize = POSITION_BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchFn));
    results.push(...batchResults);
    // Small delay between batches to avoid RPC throttle
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// STRESS SCORE
// ─────────────────────────────────────────────

function computeStressScore(positions, chainlinkRounds, concentrationData) {
  const active = positions.filter((p) => p.totalDscMinted > 0n);
  if (active.length === 0) return 0;

  // A: HF ratio (% of positions with HF < 1.5)
  const atRisk = active.filter((p) => hfToFloat(p.healthFactor) < 1.5).length;
  const A = (atRisk / active.length) * 100;

  // B: Price velocity (recent Chainlink price change)
  let B = 0;
  if (chainlinkRounds.length >= 2) {
    const newest = chainlinkRounds[0].priceUsd;
    const oldest = chainlinkRounds[chainlinkRounds.length - 1].priceUsd;
    const pctChange = (newest - oldest) / oldest;
    B = Math.min(100, Math.max(0, (-pctChange / 0.2) * 100));
  }

  // C: Herfindahl-Hirschman Index on concentration
  let C = 0;
  if (concentrationData.length > 0) {
    const total = concentrationData.reduce((s, e) => s + e.totalValueUsd, 0);
    if (total > 0) {
      const HHI = concentrationData.reduce((s, e) => {
        const share = e.totalValueUsd / total;
        return s + share * share;
      }, 0);
      C = Math.min(100, (HHI / 0.25) * 100);
    }
  }

  return Math.round(
    STRESS_WEIGHT_HF_RATIO      * A +
    STRESS_WEIGHT_VELOCITY      * B +
    STRESS_WEIGHT_CONCENTRATION * C
  );
}

// ─────────────────────────────────────────────
// LINEAR REGRESSION
// ─────────────────────────────────────────────

function linearRegression(rounds) {
  const n = rounds.length;
  if (n < 2) return null;

  // x = index (0=oldest, n-1=newest), y = price
  const reversed = [...rounds].reverse(); // oldest first
  const sumX  = (n * (n - 1)) / 2;
  const sumY  = reversed.reduce((s, r) => s + r.priceUsd, 0);
  const sumXY = reversed.reduce((s, r, i) => s + i * r.priceUsd, 0);
  const sumX2 = reversed.reduce((s, _, i) => s + i * i, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  const SStot = reversed.reduce((s, r) => s + (r.priceUsd - yMean) ** 2, 0);
  const SSres = reversed.reduce((s, r, i) => {
    const pred = intercept + slope * i;
    return s + (r.priceUsd - pred) ** 2;
  }, 0);
  const rSquared = SStot === 0 ? 1 : 1 - SSres / SStot;

  // Avg time between rounds (seconds)
  const avgInterval =
    n > 1
      ? (rounds[0].updatedAt - rounds[n - 1].updatedAt) / (n - 1)
      : 3600;

  return { slope, intercept, rSquared, avgInterval, n };
}

// ─────────────────────────────────────────────
// COMPUTE HF AT GIVEN PRICES (for simulation)
// ─────────────────────────────────────────────

function computeHFAtPrice(pos, ethPriceUsd, wbtcPriceUsd, liqThresholdPct = 50) {
  const wethVal = (Number(pos.wethBalance) / 1e18) * ethPriceUsd;
  const wbtcVal = (Number(pos.wbtcBalance) / 1e18) * wbtcPriceUsd;
  const totalCollateral = wethVal + wbtcVal;
  const dscMinted = Number(pos.totalDscMinted) / 1e18;
  if (dscMinted === 0) return Infinity;
  return (totalCollateral * (liqThresholdPct / 100)) / dscMinted;
}

// ─────────────────────────────────────────────
// CASCADE SIMULATION
// ─────────────────────────────────────────────

function runCascadeSimulation(dropPercent, positions, currentEthPrice, wbtcPriceUsd, liqThresholdPct = 50) {
  const simPositions = positions
    .filter((p) => p.totalDscMinted > 0n)
    .map((p) => ({ ...p, alive: true }));

  let simEthPrice = currentEthPrice * (1 - dropPercent / 100);
  const steps = [];
  let totalLiquidatedDsc = 0;
  let totalCollateralRemoved = 0;
  let cumulativeCount = 0;

  const checkLiquidations = (ethPrice) => {
    const newLiqs = [];
    for (const pos of simPositions) {
      if (!pos.alive) continue;
      const hf = computeHFAtPrice(pos, ethPrice, wbtcPriceUsd, liqThresholdPct);
      if (hf < 1.0) {
        pos.alive = false;
        const dsc = Number(pos.totalDscMinted) / 1e18;
        const col =
          (Number(pos.wethBalance) / 1e18) * ethPrice +
          (Number(pos.wbtcBalance) / 1e18) * wbtcPriceUsd;
        newLiqs.push({ address: pos.address, dscMinted: dsc, collateralUsd: col });
        totalLiquidatedDsc += dsc;
        totalCollateralRemoved += col;
      }
    }
    return newLiqs;
  };

  // Iteration 0: initial drop
  const initial = checkLiquidations(simEthPrice);
  cumulativeCount += initial.length;
  steps.push({
    iteration: 0,
    ethPrice: simEthPrice,
    newLiquidations: initial,
    totalLiquidatedDsc,
    totalCollateralRemoved,
    cumulativePositionsLiquidated: cumulativeCount,
  });

  // Cascade iterations
  let prevLiqs = initial;
  for (let iter = 1; iter <= CASCADE_MAX_ITERATIONS; iter++) {
    if (prevLiqs.length === 0) break;
    simEthPrice = simEthPrice * (1 - prevLiqs.length * LIQUIDATION_PRESSURE_FACTOR);
    const newLiqs = checkLiquidations(simEthPrice);
    cumulativeCount += newLiqs.length;
    steps.push({
      iteration: iter,
      ethPrice: simEthPrice,
      newLiquidations: newLiqs,
      totalLiquidatedDsc,
      totalCollateralRemoved,
      cumulativePositionsLiquidated: cumulativeCount,
    });
    prevLiqs = newLiqs;
    if (newLiqs.length === 0) break;
  }

  return steps;
}

// ─────────────────────────────────────────────
// BACKTEST
// ─────────────────────────────────────────────

function runBacktest(scenarioId, positions, currentEthPrice, wbtcPriceUsd, liqThresholdPct = 50) {
  const scenario = BACKTEST_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return null;

  const crashEthPrice = currentEthPrice * (1 - scenario.dropPercent / 100);
  const active = positions.filter((p) => p.totalDscMinted > 0n);

  const rows = active.map((pos) => {
    const hf = computeHFAtPrice(pos, crashEthPrice, wbtcPriceUsd, liqThresholdPct);
    return {
      address: pos.address,
      survived: hf >= 1.0,
      hfAtCrash: hf,
      dscMinted: Number(pos.totalDscMinted) / 1e18,
    };
  });

  const liquidated = rows.filter((r) => !r.survived);
  const totalDscAtRisk = liquidated.reduce((s, r) => s + r.dscMinted, 0);
  const survivalRate =
    active.length > 0
      ? ((active.length - liquidated.length) / active.length) * 100
      : 100;

  return {
    scenario,
    survivalRate,
    positionsLiquidated: liquidated.length,
    totalPositions: active.length,
    totalDscAtRisk,
    rows,
  };
}

// ─────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────

export const useRiskTerminal = () => {
  const providerRef  = useRef(null);
  const engineRef    = useRef(null);
  const chainlinkRef = useRef(null);
  const lastBlockRef = useRef(0);
  const posIntervalRef     = useRef(null);
  const priceIntervalRef   = useRef(null);
  const priceTickRef       = useRef(null);
  const binanceWsRef       = useRef(null);
  // Refs keep volatile values current inside setInterval closures without stale captures
  const chainlinkRoundsRef = useRef([]);
  const wbtcPriceRef        = useRef(0);

  const [isBooting,           setIsBooting]           = useState(true);
  const [bootProgress,        setBootProgress]        = useState(0);
  const [bootLog,             setBootLog]             = useState([]);
  const [error,               setError]               = useState(null);
  const [refreshError,        setRefreshError]        = useState(null);
  const [wbtcPriceError,      setWbtcPriceError]      = useState(false);

  const [depositorAddresses,  setDepositorAddresses]  = useState([]);
  const [positions,           setPositions]           = useState([]);
  const [chainlinkRounds,     setChainlinkRounds]     = useState([]);
  const [currentEthPrice,     setCurrentEthPrice]     = useState(null);
  const [liveEthPrice,        setLiveEthPrice]        = useState(null); // Binance stream, display only
  const [wbtcPriceUsd,        setWbtcPriceUsd]        = useState(0);
  const [liquidationThreshold, setLiquidationThreshold] = useState(50);
  const [stressScore,         setStressScore]         = useState(0);
  const [stressHistory,       setStressHistory]       = useState([]);
  const [concentrationData,   setConcentrationData]   = useState([]);
  const [isWhaleAlert,        setIsWhaleAlert]        = useState(false);
  const [lastRefreshedAt,     setLastRefreshedAt]     = useState(null);
  const [blockNumber,         setBlockNumber]         = useState(null);

  // ── Binance WebSocket — live ETH/USD price, ~1s updates
  // Feeds both liveEthPrice (display) and currentEthPrice (calculations) so
  // cascade sim, backtest, regression all stay in sync with the real-time price.
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("wss://stream.binance.com:9443/ws/ethusdt@miniTicker");
      binanceWsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.c) {
          const price = parseFloat(msg.c);
          setLiveEthPrice(price);
          setCurrentEthPrice(price);
        }
      };

      ws.onclose = () => {
        setTimeout(() => {
          if (binanceWsRef.current?.readyState !== WebSocket.OPEN) connect();
        }, 3000);
      };
    };

    connect();
    return () => {
      const ws = binanceWsRef.current;
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, []);

  const log = useCallback((msg, state = "active") => {
    setBootLog((prev) => {
      const updated = prev.map((l, i) =>
        i === prev.length - 1 && l.state === "active" ? { ...l, state: "done" } : l
      );
      return [...updated, { msg, state }];
    });
  }, []);

  // ── Fetch all positions for a list of addresses
  const fetchPositions = useCallback(async (addresses) => {
    if (!engineRef.current || addresses.length === 0) return [];

    const results = await batchedFetch(addresses, async (addr) => {
      try {
        const [info, hf, wethBal, wbtcBal] = await Promise.all([
          engineRef.current.getAccountInformation(addr),
          engineRef.current.getHealthFactor(addr),
          engineRef.current.getCollateralBalanceOfUser(WETH_ADDRESS, addr),
          engineRef.current.getCollateralBalanceOfUser(WBTC_ADDRESS, addr),
        ]);
        return {
          address: addr,
          wethBalance:        wethBal,
          wbtcBalance:        wbtcBal,
          totalDscMinted:     info.totalDscMinted,
          collateralValueInUsd: info.collateralValueInUsd,
          healthFactor:       hf,
          status: statusFromHF(hfToFloat(hf)),
        };
      } catch {
        return null;
      }
    });

    return results
      .filter(Boolean)
      .filter((p) => p.totalDscMinted > 0n || p.wethBalance > 0n || p.wbtcBalance > 0n);
  }, []);

  // ── Compute concentration data from positions + prices
  const computeConcentration = useCallback((pos, ethPrice, wbtcPrice) => {
    const data = pos
      .filter((p) => p.wethBalance > 0n || p.wbtcBalance > 0n)
      .map((p) => {
        const wethVal = (Number(p.wethBalance) / 1e18) * ethPrice;
        const wbtcVal = (Number(p.wbtcBalance) / 1e18) * wbtcPrice;
        return {
          address:      p.address,
          wethValueUsd: wethVal,
          wbtcValueUsd: wbtcVal,
          totalValueUsd: wethVal + wbtcVal,
        };
      })
      .sort((a, b) => b.totalValueUsd - a.totalValueUsd);

    const total = data.reduce((s, d) => s + d.totalValueUsd, 0);
    const withPct = data.map((d) => ({
      ...d,
      percentOfProtocol: total > 0 ? (d.totalValueUsd / total) * 100 : 0,
    }));

    // Whale check: top 3 control > WHALE_ALERT_THRESHOLD
    const top3Share = withPct
      .slice(0, 3)
      .reduce((s, d) => s + d.percentOfProtocol / 100, 0);

    return { data: withPct, isWhale: top3Share > WHALE_ALERT_THRESHOLD };
  }, []);

  // ── Fetch Chainlink history
  const fetchChainlinkHistory = useCallback(async () => {
    if (!chainlinkRef.current) return [];
    try {
      const latest = await chainlinkRef.current.latestRoundData();
      const latestRoundId = latest.roundId;
      const rounds = [];

      for (let i = 0; i < CHAINLINK_HISTORY_ROUNDS; i++) {
        try {
          const roundId = latestRoundId - BigInt(i);
          const r = await chainlinkRef.current.getRoundData(roundId);
          rounds.push({
            roundId: r.roundId,
            answer:  r.answer,
            updatedAt: Number(r.updatedAt),
            priceUsd: Number(r.answer) / 1e8,
          });
        } catch {
          // skip bad rounds
        }
      }
      return rounds; // newest first
    } catch {
      return [];
    }
  }, []);

  // ── Fetch all depositor addresses via event scraping
  const bootstrapDepositors = useCallback(async () => {
    if (!engineRef.current || !providerRef.current) return [];

    log("SCRAPING CollateralDeposited EVENTS FROM DEPLOY BLOCK...");
    const currentBlock = await providerRef.current.getBlockNumber();
    setBlockNumber(currentBlock);

    const unique = new Set();
    let fromBlock = DEPLOYMENT_BLOCK;
    const totalBlocks = currentBlock - DEPLOYMENT_BLOCK;

    while (fromBlock <= currentBlock) {
      const toBlock = Math.min(fromBlock + EVENT_BLOCK_CHUNK - 1, currentBlock);
      try {
        const events = await engineRef.current.queryFilter(
          engineRef.current.filters.CollateralDeposited(),
          fromBlock,
          toBlock
        );
        events.forEach((e) => unique.add(e.args.user.toLowerCase()));
      } catch (err) {
        // Only retry on RPC rate-limit errors; re-throw on permanent failures
        const msg = err?.message?.toLowerCase() || "";
        const isThrottle =
          msg.includes("rate") || msg.includes("limit") ||
          msg.includes("429") || err?.code === -32005;
        if (!isThrottle) throw err;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      fromBlock = toBlock + 1;
      const done = fromBlock - DEPLOYMENT_BLOCK;
      setBootProgress(Math.round((done / totalBlocks) * 40));
    }

    lastBlockRef.current = currentBlock;
    const addresses = [...unique];
    log(`FOUND ${addresses.length} UNIQUE DEPOSITOR(S)`);
    return addresses;
  }, [log]);

  // ── Periodic refresh of positions
  const refreshPositions = useCallback(async (addresses) => {
    if (!engineRef.current || addresses.length === 0) return;
    try {
      // Check for new depositors since last block
      const currentBlock = await providerRef.current.getBlockNumber();
      setBlockNumber(currentBlock);

      if (currentBlock > lastBlockRef.current) {
        const newEvents = await engineRef.current.queryFilter(
          engineRef.current.filters.CollateralDeposited(),
          lastBlockRef.current + 1,
          currentBlock
        );
        const newAddrs = newEvents
          .map((e) => e.args.user.toLowerCase())
          .filter((a) => !addresses.includes(a));
        if (newAddrs.length > 0) {
          addresses = [...addresses, ...newAddrs];
          setDepositorAddresses(addresses);
        }
        lastBlockRef.current = currentBlock;
      }

      const pos = await fetchPositions(addresses);
      setPositions(pos);
      setRefreshError(null);
      return pos;
    } catch (err) {
      setRefreshError(`Position refresh failed: ${err.message}`);
      return null;
    }
  }, [fetchPositions]);

  // ── Main refresh (prices + positions + derived)
  const refresh = useCallback(async (addresses) => {
    try {
      // Fetch latest price
      const latest = await chainlinkRef.current.latestRoundData();
      const ethPrice = Number(latest.answer) / 1e8;
      setCurrentEthPrice(ethPrice);

      // Prepend new round if it's different from the last known one
      const existingRounds = chainlinkRoundsRef.current;
      const newRound = {
        roundId:  latest.roundId,
        answer:   latest.answer,
        updatedAt: Number(latest.updatedAt),
        priceUsd: ethPrice,
      };

      let rounds = existingRounds;
      if (!rounds[0] || rounds[0].roundId !== newRound.roundId) {
        rounds = [newRound, ...existingRounds].slice(0, CHAINLINK_HISTORY_ROUNDS);
        setChainlinkRounds(rounds);
        chainlinkRoundsRef.current = rounds;
      }

      // Refresh positions
      const pos = await refreshPositions(addresses);
      if (!pos) return;

      // WBTC price from engine
      let wbtcPrice = wbtcPriceUsd;
      try {
        const wbtcVal = await engineRef.current.getUsdValue(
          WBTC_ADDRESS,
          ethers.parseUnits("1", 18)
        );
        wbtcPrice = Number(wbtcVal) / 1e18;
        setWbtcPriceUsd(wbtcPrice);
        wbtcPriceRef.current = wbtcPrice;
        setWbtcPriceError(false);
      } catch (err) {
        setWbtcPriceError(true);
        console.warn("WBTC price fetch failed:", err.message);
      }

      // Derived
      const { data: concData, isWhale } = computeConcentration(pos, ethPrice, wbtcPrice);
      setConcentrationData(concData);
      setIsWhaleAlert(isWhale);

      const score = computeStressScore(pos, rounds, concData);
      setStressScore(score);
      setStressHistory((h) =>
        [...h, { score, timestamp: Date.now() }].slice(-60)
      );

      setLastRefreshedAt(new Date());
      setRefreshError(null);
    } catch (err) {
      setRefreshError(`Price refresh failed: ${err.message}`);
    }
  }, [refreshPositions, computeConcentration, wbtcPriceUsd]);

  // ── BOOT SEQUENCE
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        log("INITIALIZING RISK TERMINAL v1.0");

        // Provider
        const provider = window.ethereum
          ? new ethers.BrowserProvider(window.ethereum)
          : new ethers.JsonRpcProvider("https://rpc.sepolia.org");
        providerRef.current = provider;

        // Contracts (read-only)
        const engine = new ethers.Contract(DSC_ENGINE_ADDRESS, DSC_ENGINE_ABI, provider);
        engineRef.current = engine;

        const cl = new ethers.Contract(CHAINLINK_ETH_USD_SEPOLIA, CHAINLINK_ABI, provider);
        chainlinkRef.current = cl;

        log("CONTRACTS INITIALIZED");
        setBootProgress(5);

        // Scrape depositors
        const addresses = await bootstrapDepositors();
        if (cancelled) return;
        setDepositorAddresses(addresses);
        setBootProgress(45);

        // Fetch positions
        log(`FETCHING POSITIONS FOR ${addresses.length} ADDRESS(ES)...`);
        const pos = await fetchPositions(addresses);
        if (cancelled) return;
        setPositions(pos);
        setBootProgress(65);

        // Chainlink history
        log("LOADING CHAINLINK PRICE HISTORY...");
        const rounds = await fetchChainlinkHistory();
        if (cancelled) return;
        setChainlinkRounds(rounds);
        chainlinkRoundsRef.current = rounds;
        const ethPrice = rounds[0]?.priceUsd || 0;
        setCurrentEthPrice(ethPrice);
        setBootProgress(75);

        // Fetch liquidation threshold dynamically from DSCEngine
        let liqThreshold = 50;
        try {
          const raw = await engine.getLiquidationThreshold();
          liqThreshold = Number(raw);
          setLiquidationThreshold(liqThreshold);
          log(`LIQUIDATION THRESHOLD: ${liqThreshold}%`);
        } catch {
          log("LIQUIDATION THRESHOLD: DEFAULT 50% (ON-CHAIN FETCH FAILED)");
        }
        setBootProgress(80);

        // WBTC price
        let wbtcPrice = 0;
        try {
          const wbtcVal = await engine.getUsdValue(WBTC_ADDRESS, ethers.parseUnits("1", 18));
          wbtcPrice = Number(wbtcVal) / 1e18;
          setWbtcPriceUsd(wbtcPrice);
          wbtcPriceRef.current = wbtcPrice;
          setWbtcPriceError(false);
        } catch (err) {
          setWbtcPriceError(true);
          console.warn("WBTC price boot fetch failed:", err.message);
          log("WBTC PRICE: UNAVAILABLE (ORACLE ERROR) — WBTC CALCULATIONS DEGRADED");
        }

        // Derived
        log("COMPUTING STRESS METRICS...");
        const { data: concData, isWhale } = computeConcentration(pos, ethPrice, wbtcPrice);
        setConcentrationData(concData);
        setIsWhaleAlert(isWhale);

        const score = computeStressScore(pos, rounds, concData);
        setStressScore(score);
        setStressHistory([{ score, timestamp: Date.now() }]);
        setLastRefreshedAt(new Date());
        setBootProgress(100);

        log(`BOOT COMPLETE — ${pos.length} POSITIONS LOADED`);

        if (cancelled) return;
        setIsBooting(false);

        // Start polling intervals — use ref for rounds to avoid stale closures
        const addrs = addresses;

        posIntervalRef.current = setInterval(async () => {
          const updated = await refreshPositions(addrs);
          if (updated) {
            const ethPriceNow  = chainlinkRoundsRef.current[0]?.priceUsd || ethPrice;
            const wbtcPriceNow = wbtcPriceRef.current;
            const { data: c, isWhale: w } = computeConcentration(updated, ethPriceNow, wbtcPriceNow);
            setConcentrationData(c);
            setIsWhaleAlert(w);
          }
        }, BLOCK_POLL_INTERVAL);

        priceIntervalRef.current = setInterval(async () => {
          await refresh(addrs);
        }, PRICE_POLL_INTERVAL);


      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setIsBooting(false);
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
      if (posIntervalRef.current)   clearInterval(posIntervalRef.current);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, []); // eslint-disable-line

  // ── PUBLIC ACTIONS
  const refreshNow = useCallback(async () => {
    await refresh(depositorAddresses);
  }, [refresh, depositorAddresses]);

  const runCascade = useCallback(
    (dropPercent) =>
      runCascadeSimulation(dropPercent, positions, currentEthPrice || 0, wbtcPriceUsd, liquidationThreshold),
    [positions, currentEthPrice, wbtcPriceUsd, liquidationThreshold]
  );

  const runBacktestFn = useCallback(
    (scenarioId) =>
      runBacktest(scenarioId, positions, currentEthPrice || 0, wbtcPriceUsd, liquidationThreshold),
    [positions, currentEthPrice, wbtcPriceUsd, liquidationThreshold]
  );

  const runRegressionFn = useCallback(() => {
    const reg = linearRegression(chainlinkRounds);
    if (!reg) return null;

    const { slope, intercept, rSquared, avgInterval, n } = reg;
    const now = chainlinkRounds[0]?.updatedAt || Date.now() / 1000;

    const projections = Array.from({ length: REGRESSION_PROJECTION_STEPS }, (_, k) => {
      const step = k + 1;
      const projPrice = intercept + slope * (n - 1 + step);
      const projTime  = (now + step * avgInterval) * 1000;
      const atRisk = positions.filter(
        (p) =>
          p.totalDscMinted > 0n &&
          computeHFAtPrice(p, projPrice, wbtcPriceUsd, liquidationThreshold) < 1.0
      ).length;
      return {
        step,
        projectedPrice: Math.max(0, projPrice),
        projectedTime:  projTime,
        positionsAtRisk: atRisk,
        label: `T+${step}h`,
      };
    });

    return { slope, intercept, rSquared, projections };
  }, [chainlinkRounds, positions, wbtcPriceUsd, liquidationThreshold]);

  return {
    // State
    isBooting,
    bootProgress,
    bootLog,
    error,
    refreshError,
    wbtcPriceError,
    depositorAddresses,
    positions,
    chainlinkRounds,
    currentEthPrice,
    liveEthPrice,
    wbtcPriceUsd,
    liquidationThreshold,
    stressScore,
    stressHistory,
    concentrationData,
    isWhaleAlert,
    lastRefreshedAt,
    blockNumber,
    // Actions
    refreshNow,
    runCascadeSimulation: runCascade,
    runBacktest:          runBacktestFn,
    runRegression:        runRegressionFn,
    // helpers exposed for panels
    hfToFloat,
  };
};
