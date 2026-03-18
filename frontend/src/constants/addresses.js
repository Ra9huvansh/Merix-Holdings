export const DSC_ENGINE_ADDRESS = import.meta.env.VITE_DSC_ENGINE_ADDRESS || "";
export const DSC_TOKEN_ADDRESS = import.meta.env.VITE_DSC_TOKEN_ADDRESS || "";
export const WETH_ADDRESS = import.meta.env.VITE_WETH_ADDRESS || "";
export const WBTC_ADDRESS = import.meta.env.VITE_WBTC_ADDRESS || "";
export const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "31337");
export const YIELD_AGGREGATOR_ADDRESS = import.meta.env.VITE_YIELD_AGGREGATOR_ADDRESS || "";
export const REDEMPTION_CONTRACT_ADDRESS = import.meta.env.VITE_REDEMPTION_CONTRACT_ADDRESS || "";

const REQUIRED_ADDRESSES = {
  VITE_DSC_ENGINE_ADDRESS: DSC_ENGINE_ADDRESS,
  VITE_DSC_TOKEN_ADDRESS: DSC_TOKEN_ADDRESS,
  VITE_WETH_ADDRESS: WETH_ADDRESS,
  VITE_WBTC_ADDRESS: WBTC_ADDRESS,
};

const missing = Object.entries(REQUIRED_ADDRESSES)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(
    `[Config] Missing required environment variables: ${missing.join(", ")}. ` +
    "Check your frontend/.env file."
  );
}

export const TOKEN_INFO = {
  [WETH_ADDRESS.toLowerCase()]: {
    name: "WETH",
    symbol: "WETH",
    decimals: 18
  },
  [WBTC_ADDRESS.toLowerCase()]: {
    name: "WBTC",
    symbol: "WBTC",
    decimals: 18
  }
};
