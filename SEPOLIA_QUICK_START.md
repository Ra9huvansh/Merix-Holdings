# Sepolia Deployment - Quick Start

## 1. Set Environment Variables

```bash
export PRIVATE_KEY=your_private_key_here
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR use Alchemy:
# export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
export ETHERSCAN_API_KEY=your_etherscan_api_key  # Optional, for verification
```

## 2. Deploy Contracts

```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

Or use the deployment script:
```bash
./deploy-sepolia.sh
```

## 3. Copy Addresses to Frontend

After deployment, copy the addresses from the console output to `frontend/.env`:

```env
VITE_DSC_ENGINE_ADDRESS=0xYourDSCEngineAddress
VITE_DSC_TOKEN_ADDRESS=0xYourDSCTokenAddress
VITE_WETH_ADDRESS=0xdd13E55209Fd76AfE204dBda4007C227904f0a81
VITE_WBTC_ADDRESS=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
VITE_CHAIN_ID=11155111
```

## 4. Start Frontend

```bash
cd frontend
npm run dev
```

## 5. Get Test Tokens

- **Sepolia ETH**: Get from [Sepolia Faucet](https://sepoliafaucet.com/)
- **WETH**: Wrap your Sepolia ETH or use a WETH faucet
- **WBTC**: Use testnet token faucets or mint if available

## That's It! 🎉

Your app is now running on Sepolia testnet. The frontend will automatically:
- Detect Sepolia network
- Switch MetaMask to Sepolia if needed
- Add Sepolia network to MetaMask if not present

