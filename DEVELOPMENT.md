# Development Guide

## Running the Frontend (Sepolia)

```bash
cd frontend
npm install        # first time only
npm run dev        # starts at http://localhost:3000
```

MetaMask must be on Sepolia (chain ID 11155111). The app will prompt you to switch automatically.

To get test tokens:
- **Sepolia ETH**: [sepoliafaucet.com](https://sepoliafaucet.com/)
- **WETH**: Wrap Sepolia ETH on [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xdd13E55209Fd76AfE204dBda4007C227904f0a81) via the `deposit()` function

---

## Running Tests (Local)

```bash
# Run all tests
forge test

# Verbose output
forge test -vvv

# Run a specific test file
forge test --match-path test/unit/DSCEngine.t.sol -vvv
```

---

## Local Development with Anvil

```bash
# Start local chain
anvil

# Deploy to local chain (new terminal)
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Update `frontend/.env` with the printed addresses and set `VITE_CHAIN_ID=31337`.

---

## Project Structure

```
src/                     — Solidity smart contracts
  DSCEngine.sol          — Core engine (collateral, mint, burn, liquidate)
  DecentralizedStableCoin.sol
  yield/
    YieldAggregator.sol  — DSC yield strategies
    RedemptionContract.sol — DSC → WETH collateral redemption
  libraries/
    OracleLib.sol        — Chainlink stale price check

script/                  — Foundry deployment scripts
  DeployAll.s.sol        — Deploys all 4 contracts
  HelperConfig.s.sol     — Network config (Sepolia vs Anvil)

test/unit/               — Unit tests
  DSCEngine.t.sol
  YieldAggregator.t.sol
  RedemptionContract.t.sol

frontend/src/
  components/            — React UI components
  hooks/                 — useWeb3, useDSCEngine, useYieldAggregator
  constants/             — Contract addresses and ABIs
```

---

## Frontend Environment Variables

All required variables for `frontend/.env`:

```
VITE_DSC_ENGINE_ADDRESS=
VITE_DSC_TOKEN_ADDRESS=
VITE_YIELD_AGGREGATOR_ADDRESS=
VITE_REDEMPTION_CONTRACT_ADDRESS=
VITE_WETH_ADDRESS=
VITE_WBTC_ADDRESS=
VITE_CHAIN_ID=
```

See `DEPLOYMENT.md` for current Sepolia values.
