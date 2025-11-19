# Frontend Setup Guide

## Quick Start

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the `frontend` directory with your contract addresses:
   ```env
   VITE_DSC_ENGINE_ADDRESS=0xYourDSCEngineAddress
   VITE_DSC_TOKEN_ADDRESS=0xYourDSCTokenAddress
   VITE_WETH_ADDRESS=0xYourWETHAddress
   VITE_WBTC_ADDRESS=0xYourWBTCAddress
   VITE_CHAIN_ID=31337
   ```

   **To get your contract addresses:**
   - Deploy your contracts using Foundry:
     ```bash
     forge script script/DeployDSC.s.sol:DeployDSC --rpc-url http://localhost:8545 --broadcast
     ```
   - Check the deployment output or look in `broadcast/DeployDSC.s.sol/31337/run-latest.json`
   - The addresses will be printed in the console

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:3000`

## Features

The frontend includes all functions from DSCEngine.sol:

### Dashboard
- View health factor (color-coded: green = healthy, yellow = warning, red = at risk)
- Total collateral value in USD
- DSC minted and balance
- Collateral positions for each token

### Deposit Collateral
- Deposit WETH or WBTC as collateral
- Option to deposit and mint DSC in one transaction
- Shows wallet balance and allows MAX button

### Mint DSC
- Mint DSC tokens against deposited collateral
- Shows current collateral and health factor

### Redeem Collateral
- Withdraw deposited collateral
- Option to redeem and burn DSC in one transaction
- Shows deposited amount

### Burn DSC
- Burn DSC tokens to reduce debt
- Improves health factor
- Shows current balance

### Liquidation
- Liquidate undercollateralized positions
- 10% bonus for liquidators
- Requires user address and debt amount

## Network Configuration

The frontend is configured to work with:
- **Local Anvil**: Chain ID 31337 (default)
- **Sepolia Testnet**: Chain ID 11155111

Update `VITE_CHAIN_ID` in your `.env` file to match your network.

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Troubleshooting

1. **"Please install MetaMask!"**
   - Install the MetaMask browser extension
   - Make sure it's enabled

2. **Transaction fails with "insufficient allowance"**
   - The app automatically handles approvals, but if it fails, try approving manually in MetaMask

3. **Wrong network**
   - The app will prompt you to switch networks
   - Make sure you're on the correct chain (Anvil local or Sepolia)

4. **Contract addresses not found**
   - Double-check your `.env` file
   - Make sure addresses start with `0x` and are 42 characters long
   - Verify contracts are deployed on the network you're using

## Architecture

- **React 18** with Vite for fast development
- **ethers.js v6** for Web3 interactions
- **Custom hooks** for Web3 and contract interactions
- **Minimalistic design** with gradient accents
- **Responsive** layout for mobile and desktop

## Security Notes

- Never commit your `.env` file with private keys
- Always verify contract addresses before using
- Test on a testnet before mainnet deployment
- The frontend handles approvals automatically but always review transactions in MetaMask

