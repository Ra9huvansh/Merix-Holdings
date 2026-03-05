# Deployment Guide

## Current Sepolia Deployment

Contracts are already deployed on Sepolia (chain ID 11155111). The `frontend/.env` is configured with these addresses:

| Contract | Address |
|---|---|
| DSCEngine | `0x13eDe57f75fBb9B946D772a725C30E9d6a2a943B` |
| DSC Token | `0xb21b832d1d231439B8F4B456e40eeBDa08136360` |
| YieldAggregator | `0x5F6683C554Fcd9E1ee8EF0840B25F1Fa71359d4a` |
| RedemptionContract | `0x45e730e8434940817230065687C17e535A0A96b6` |
| WETH (Sepolia) | `0xdd13E55209Fd76AfE204dBda4007C227904f0a81` |
| WBTC (Sepolia) | `0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063` |

Price feeds (configured in `script/HelperConfig.s.sol`):
- WETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- WBTC/USD: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`

---

## Redeploying to Sepolia

### 1. Set environment variables

Add to the root `.env` file:
```
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key   # optional, for contract verification
```

### 2. Deploy contracts

```bash
./deploy-sepolia.sh
```

Or manually:
```bash
CLEAN_KEY=$(grep "^PRIVATE_KEY" .env | cut -d'=' -f2- | tr -d '[:space:]') && \
FOUNDRY_DISABLE_ENV_FILE=true forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $CLEAN_KEY \
  --broadcast --verify -vvvv
```

> **Note:** Use `--rpc-url` for deployment. `--fork-url` is only for fork tests.

### 3. Update frontend addresses

Copy the printed addresses into `frontend/.env`:
```
VITE_DSC_ENGINE_ADDRESS=0x...
VITE_DSC_TOKEN_ADDRESS=0x...
VITE_YIELD_AGGREGATOR_ADDRESS=0x...
VITE_REDEMPTION_CONTRACT_ADDRESS=0x...
VITE_WETH_ADDRESS=0xdd13E55209Fd76AfE204dBda4007C227904f0a81
VITE_WBTC_ADDRESS=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
VITE_CHAIN_ID=11155111
```

### 4. Seed the protocol reserves (Admin Panel)

After deploying, the YieldAggregator and RedemptionContract need to be funded:
- Open the app → hamburger menu → Admin Panel → password: `14140709`
- Fund DSC Yield Reserve (wrap ETH → WETH → fund)
- Fund WETH Redemption Reserve

---

## Troubleshooting

**"Failed to decode private key"** — trailing space in `.env`. Use the `CLEAN_KEY` command above.

**"Insufficient funds"** — get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com/).

**Contract verification failed** — make sure `ETHERSCAN_API_KEY` is set, or remove `--verify` flag.
