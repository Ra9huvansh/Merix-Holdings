export const DSC_ENGINE_ADDRESS = import.meta.env.VITE_DSC_ENGINE_ADDRESS || "";
export const DSC_TOKEN_ADDRESS = import.meta.env.VITE_DSC_TOKEN_ADDRESS || "";
export const WETH_ADDRESS = import.meta.env.VITE_WETH_ADDRESS || "";
export const WBTC_ADDRESS = import.meta.env.VITE_WBTC_ADDRESS || "";
export const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "31337");

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

