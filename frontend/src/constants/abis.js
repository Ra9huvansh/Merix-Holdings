// DSCEngine ABI
export const DSC_ENGINE_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenCollateralAddress", "type": "address" },
      { "internalType": "uint256", "name": "amountCollateral", "type": "uint256" }
    ],
    "name": "depositCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenCollateralAddress", "type": "address" },
      { "internalType": "uint256", "name": "amountCollateral", "type": "uint256" },
      { "internalType": "uint256", "name": "amountDscToMint", "type": "uint256" }
    ],
    "name": "depositCollateralAndMintDsc",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountDscToMint", "type": "uint256" }
    ],
    "name": "mintDsc",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenCollateralAddress", "type": "address" },
      { "internalType": "uint256", "name": "amountCollateral", "type": "uint256" }
    ],
    "name": "redeemCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenCollateralAddress", "type": "address" },
      { "internalType": "uint256", "name": "amountCollateral", "type": "uint256" },
      { "internalType": "uint256", "name": "amountDscToBurn", "type": "uint256" }
    ],
    "name": "redeemCollateralForDsc",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burnDsc",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "collateral", "type": "address" },
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "debtToCover", "type": "uint256" }
    ],
    "name": "liquidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getAccountInformation",
    "outputs": [
      { "internalType": "uint256", "name": "totalDscMinted", "type": "uint256" },
      { "internalType": "uint256", "name": "collateralValueInUsd", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getHealthFactor",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getCollateralBalanceOfUser",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCollateralTokens",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "getUsdValue",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "usdAmountInWei", "type": "uint256" }
    ],
    "name": "getTokenAmountFromUsd",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "address", "name": "tokenCollateralAddress", "type": "address" },
      { "internalType": "uint256", "name": "amountCollateral", "type": "uint256" }
    ],
    "name": "depositCollateralFor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burnExternal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// YieldAggregator ABI
export const YIELD_AGGREGATOR_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "strategyId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "depositToStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "strategyId", "type": "uint256" },
      { "internalType": "uint256", "name": "dscAmount", "type": "uint256" }
    ],
    "name": "withdrawFromStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "fundYieldReserve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getUserInfo",
    "outputs": [
      { "internalType": "uint256", "name": "shares", "type": "uint256" },
      { "internalType": "uint256", "name": "principal", "type": "uint256" },
      { "internalType": "uint256", "name": "realizedPft", "type": "uint256" },
      { "internalType": "uint256", "name": "currentValue", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSimulatedTotalAssets",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "strategyId", "type": "uint256" }
    ],
    "name": "getUserStrategyDeposited",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" }
    ],
    "name": "getStrategy",
    "outputs": [
      { "internalType": "string",  "name": "name",          "type": "string" },
      { "internalType": "string",  "name": "riskLevel",     "type": "string" },
      { "internalType": "uint256", "name": "apyBps",        "type": "uint256" },
      { "internalType": "uint256", "name": "totalDeposited","type": "uint256" },
      { "internalType": "uint256", "name": "accruedYield",  "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStrategyCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultDscBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalShares",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAssets",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// RedemptionContract ABI
export const REDEMPTION_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "dscAmount", "type": "uint256" }
    ],
    "name": "redeemDscForWeth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "wethAmount", "type": "uint256" }
    ],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "dscAmount", "type": "uint256" }
    ],
    "name": "getWethOut",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWethBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ethPriceUsd",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// DSCEngine new functions
// depositCollateralFor and burnExternal are appended to DSC_ENGINE_ABI below

// ERC20 ABI (for token interactions)
export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

