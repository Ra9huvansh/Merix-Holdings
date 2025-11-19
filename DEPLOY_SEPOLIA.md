# Deploying to Sepolia Testnet

Complete guide for deploying Merix Holdings contracts and frontend to Sepolia testnet.

## Prerequisites

1. **MetaMask** installed with Sepolia testnet added
2. **Sepolia ETH** in your wallet (get from [faucets](https://sepoliafaucet.com/))
3. **Private Key** set in environment variable
4. **Infura/Alchemy RPC URL** (optional, but recommended)

## Step 1: Set Up Environment

Create a `.env` file in the project root (not in frontend folder):

```bash
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# OR use Alchemy:
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**⚠️ Security Warning**: Never commit your `.env` file! It's already in `.gitignore`.

## Step 2: Deploy Contracts

Run the deployment script:

```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvv
```

Or if you have the RPC URL in your environment:

```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend --rpc-url https://sepolia.infura.io/v3/YOUR_KEY --broadcast --verify -vvvv
```

The script will:
1. Detect you're on Sepolia (chain ID 11155111)
2. Use Sepolia WETH and WBTC addresses from HelperConfig
3. Deploy DSC Token and DSC Engine contracts
4. Print all addresses for frontend configuration

## Step 3: Copy Contract Addresses

After deployment, you'll see output like:

```
=== DEPLOYMENT COMPLETE ===
DSC Token Address: 0x...
DSC Engine Address: 0x...
WETH Address: 0xdd13E55209Fd76AfE204dBda4007C227904f0a81
WBTC Address: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
...

=== FRONTEND CONFIGURATION ===
Add these to your frontend/.env file:
VITE_DSC_ENGINE_ADDRESS=0x...
VITE_DSC_TOKEN_ADDRESS=0x...
VITE_WETH_ADDRESS=0xdd13E55209Fd76AfE204dBda4007C227904f0a81
VITE_WBTC_ADDRESS=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
VITE_CHAIN_ID=11155111
===============================
```

## Step 4: Configure Frontend

1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Create `.env` file:
   ```bash
   touch .env
   ```

3. Add the addresses from deployment output:
   ```env
   VITE_DSC_ENGINE_ADDRESS=0xYourDSCEngineAddress
   VITE_DSC_TOKEN_ADDRESS=0xYourDSCTokenAddress
   VITE_WETH_ADDRESS=0xdd13E55209Fd76AfE204dBda4007C227904f0a81
   VITE_WBTC_ADDRESS=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
   VITE_CHAIN_ID=11155111
   ```

## Step 5: Get Test Tokens

You'll need WETH and WBTC on Sepolia to use as collateral:

### WETH (Wrapped Ether)
- Go to [Sepolia WETH Contract](https://sepolia.etherscan.io/address/0xdd13E55209Fd76AfE204dBda4007C227904f0a81)
- Wrap your Sepolia ETH to get WETH
- Or use a faucet that provides WETH

### WBTC (Wrapped Bitcoin)
- Go to [Sepolia WBTC Contract](https://sepolia.etherscan.io/address/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063)
- You may need to mint test WBTC if available
- Or use a testnet token faucet

## Step 6: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:3000`

## Step 7: Connect and Test

1. Open the app in your browser
2. Make sure MetaMask is on Sepolia network
3. Click "Connect Wallet"
4. The app will automatically switch to Sepolia if needed
5. Start using the platform!

## Sepolia Network Details

- **Chain ID**: 11155111
- **Network Name**: Sepolia
- **RPC URL**: https://sepolia.infura.io/v3/YOUR_KEY
- **Block Explorer**: https://sepolia.etherscan.io
- **Currency**: ETH (Sepolia ETH)

## Sepolia Token Addresses

These are already configured in `HelperConfig.s.sol`:

- **WETH**: `0xdd13E55209Fd76AfE204dBda4007C227904f0a81`
- **WBTC**: `0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063`
- **WETH Price Feed**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- **WBTC Price Feed**: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`

## Troubleshooting

### "Insufficient funds"
- Make sure you have Sepolia ETH for gas fees
- Get Sepolia ETH from [faucets](https://sepoliafaucet.com/)

### "Wrong network"
- The app will try to switch networks automatically
- If it fails, manually switch to Sepolia in MetaMask

### "Token not found"
- Make sure you have WETH/WBTC on Sepolia
- Check the token addresses match the ones in HelperConfig

### Contract verification failed
- Make sure you have an Etherscan API key set:
  ```bash
  export ETHERSCAN_API_KEY=your_key_here
  ```
- Or add it to your `.env` file

## Verification

After deployment, verify your contracts on Etherscan:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain-id 11155111 --etherscan-api-key $ETHERSCAN_API_KEY
```

## Production Build

To build the frontend for production:

```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to your hosting service (Vercel, Netlify, etc.)

