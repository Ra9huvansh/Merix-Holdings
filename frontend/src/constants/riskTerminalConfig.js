export const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

export const CHAINLINK_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80",  name: "roundId",         type: "uint80"  },
      { internalType: "int256",  name: "answer",          type: "int256"  },
      { internalType: "uint256", name: "startedAt",       type: "uint256" },
      { internalType: "uint256", name: "updatedAt",       type: "uint256" },
      { internalType: "uint80",  name: "answeredInRound", type: "uint80"  },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
    name: "getRoundData",
    outputs: [
      { internalType: "uint80",  name: "roundId",         type: "uint80"  },
      { internalType: "int256",  name: "answer",          type: "int256"  },
      { internalType: "uint256", name: "startedAt",       type: "uint256" },
      { internalType: "uint256", name: "updatedAt",       type: "uint256" },
      { internalType: "uint80",  name: "answeredInRound", type: "uint80"  },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Health factor status breakpoints (floats)
export const HF_SAFE    = 2.0;
export const HF_WARNING = 1.5;
export const HF_DANGER  = 1.0;

// Polling intervals (ms)
export const BLOCK_POLL_INTERVAL = 12000;
export const PRICE_POLL_INTERVAL = 30000;

// How many Chainlink rounds to fetch for regression
export const CHAINLINK_HISTORY_ROUNDS = 20;

// Stress score weights (must sum to 1.0)
export const STRESS_WEIGHT_HF_RATIO      = 0.5;
export const STRESS_WEIGHT_VELOCITY      = 0.3;
export const STRESS_WEIGHT_CONCENTRATION = 0.2;

// Whale alert: top 3 holders control more than this share
export const WHALE_ALERT_THRESHOLD = 0.60;

// Cascade simulation: price drop per new liquidation (secondary pressure)
export const LIQUIDATION_PRESSURE_FACTOR = 0.002;
export const CASCADE_MAX_ITERATIONS = 20;

// Linear regression: how many steps ahead to project
export const REGRESSION_PROJECTION_STEPS = 6;
export const REGRESSION_STEP_HOURS = 1;

// Historical backtest scenarios
export const BACKTEST_SCENARIOS = [
  { id: "may2021",  name: "MAY 2021 CRASH",        dropPercent: 62, durationDays: 30 },
  { id: "jun2022",  name: "LUNA COLLAPSE JUN 2022", dropPercent: 80, durationDays: 45 },
  { id: "mar2020",  name: "MARCH 2020 COVID CRASH", dropPercent: 55, durationDays: 7  },
];

// RPC batch size for position fetching
export const POSITION_BATCH_SIZE = 5;

// Event scraping block chunk size
export const EVENT_BLOCK_CHUNK = 10000;

// Deployment block — start event scraping from here, not genesis
// 0x9fc232 from broadcast/DeployAll.s.sol/11155111/run-latest.json
export const DEPLOYMENT_BLOCK = 10470962;
