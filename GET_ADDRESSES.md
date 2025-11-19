# How to Get Contract Addresses

## Quick Answer

**All addresses come from the deployment script output!** Use the `DeployAndUpdateFrontend.s.sol` script which prints everything you need.

## Step-by-Step

### 1. Deploy Contracts

Run the deployment script that prints all addresses:

```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend --rpc-url http://localhost:8545 --broadcast -vvv
```

This will print output like:
```
=== DEPLOYMENT COMPLETE ===
DSC Token Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
DSC Engine Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
WETH Address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
WBTC Address: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
===========================

=== FRONTEND CONFIGURATION ===
Add these to your frontend/.env file:
VITE_DSC_ENGINE_ADDRESS= 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_DSC_TOKEN_ADDRESS= 0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_WETH_ADDRESS= 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_WBTC_ADDRESS= 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
VITE_CHAIN_ID=31337
===============================
```

### 2. Copy to .env

Just copy those lines into your `frontend/.env` file!

---

## Why Each Address is Needed

### 1. **DSC Engine Address** (`VITE_DSC_ENGINE_ADDRESS`)
- **What**: The main contract that handles all operations
- **Why**: The frontend needs this to call functions like:
  - `depositCollateral()`
  - `mintDsc()`
  - `redeemCollateral()`
  - `burnDsc()`
  - `liquidate()`
  - `getAccountInformation()`
  - `getHealthFactor()`

### 2. **DSC Token Address** (`VITE_DSC_TOKEN_ADDRESS`)
- **What**: The DecentralizedStableCoin (DSC) token contract
- **Why**: The frontend needs this to:
  - Check user's DSC balance
  - Approve DSC spending (for burning/liquidating)
  - Display DSC balances in the UI

### 3. **WETH Address** (`VITE_WETH_ADDRESS`)
- **What**: Wrapped Ether token (or mock token on local Anvil)
- **Why**: The frontend needs this to:
  - Show WETH balance in user's wallet
  - Allow users to select WETH for deposit/redeem operations
  - Approve WETH spending to the DSC Engine
  - Display WETH collateral positions

### 4. **WBTC Address** (`VITE_WBTC_ADDRESS`)
- **What**: Wrapped Bitcoin token (or mock token on local Anvil)
- **Why**: Same as WETH - the frontend needs this to:
  - Show WBTC balance in user's wallet
  - Allow users to select WBTC for deposit/redeem operations
  - Approve WBTC spending to the DSC Engine
  - Display WBTC collateral positions

---

## How Addresses Are Created

### On Local Anvil (Chain ID 31337):
- **WETH & WBTC**: Created as mock tokens (`ERC20Mock`) during deployment
- **DSC Token**: Created as `DecentralizedStableCoin` contract
- **DSC Engine**: Created as `DSCEngine` contract

### On Sepolia Testnet (Chain ID 11155111):
- **WETH & WBTC**: Use real testnet token addresses (hardcoded in `HelperConfig.s.sol`)
- **DSC Token**: Created as `DecentralizedStableCoin` contract
- **DSC Engine**: Created as `DSCEngine` contract

---

## Alternative: Get from Broadcast File

If you already deployed and lost the console output, you can find addresses in:

```bash
cat broadcast/DeployDSC.s.sol/31337/run-latest.json | grep -A 2 "contractName"
```

Or check the latest deployment:
```bash
cat broadcast/DeployDSC.s.sol/31337/run-latest.json
```

Look for:
- `DecentralizedStableCoin` → DSC Token Address
- `DSCEngine` → DSC Engine Address
- `ERC20Mock` (first one) → WETH Address
- `ERC20Mock` (second one) → WBTC Address

---

## Summary

**You get ALL addresses from one deployment command!** The `DeployAndUpdateFrontend.s.sol` script prints everything formatted and ready to copy into your `.env` file.

