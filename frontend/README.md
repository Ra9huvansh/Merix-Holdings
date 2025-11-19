# Merix Holdings Frontend

A minimalistic financial platform frontend for the Merix Holdings decentralized stablecoin protocol.

## Features

- **Wallet Connection**: Connect with MetaMask
- **Dashboard**: View account overview, health factor, collateral, and DSC balances
- **Deposit Collateral**: Deposit WETH or WBTC as collateral
- **Mint DSC**: Mint DSC tokens against collateral
- **Redeem Collateral**: Withdraw deposited collateral
- **Burn DSC**: Burn DSC tokens to reduce debt
- **Liquidation**: Liquidate undercollateralized positions (10% bonus)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory:
```env
VITE_DSC_ENGINE_ADDRESS=0x...
VITE_DSC_TOKEN_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
VITE_WBTC_ADDRESS=0x...
VITE_CHAIN_ID=31337
```

3. Start the development server:
```bash
npm run dev
```

## Configuration

Update the `.env` file with your deployed contract addresses. You can get these addresses from the deployment script output or from the `broadcast/` directory.

## Build

To build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

