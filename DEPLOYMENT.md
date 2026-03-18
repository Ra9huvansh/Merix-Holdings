# Deployment Guide

## Current Sepolia Deployment

Contracts are deployed on Sepolia (chain ID 11155111). The `frontend/.env` is configured with these addresses:

| Contract | Address |
|---|---|
| DSCEngine | `0x9E1D25C37bf92AC2353df4802E123f7D070f4931` |
| DSC Token | `0x467C5F2153c11feC84A60ea45b28a19F47DA0b15` |
| YieldAggregator | `0x088025Beb69c5691145c8d6DC43138eF8C4A4d41` |
| RedemptionContract | `0xFe35219450b891dcb01EcADC59A0e4aD044295f2` |
| WETH (Sepolia) | `0xdd13E55209Fd76AfE204dBda4007C227904f0a81` |
| WBTC (Sepolia) | `0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063` |

Price feeds (configured in `script/HelperConfig.s.sol`):
- WETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- WBTC/USD: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`

---

## Redeploying to Sepolia

### 1. Deploy contracts

```bash
forge script script/DeployAll.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

`DeployAll.s.sol` deploys all 4 contracts in the correct order and automatically wires the cross-contract references:
- `DSCEngine.setRedemptionContract(redemption)` — authorises RedemptionContract to call `depositCollateralFor` and `burnExternal`
- `YieldAggregator.setRedemptionContract(redemption)` — authorises RedemptionContract to call `deductRealizedProfit`

### 2. Update frontend addresses

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

Also update the same 4 addresses in your **Vercel dashboard** env vars if deploying to production.

### 3. Seed the protocol reserves (Admin Panel)

After deploying, both reserve contracts start empty and must be funded:

1. Open the app → hamburger menu → **Admin Panel** → password: `14140709`
2. **Wrap ETH → WETH** — enter an ETH amount and click Wrap
3. **Fund WETH Redemption Reserve** — funds `RedemptionContract` so users can redeem DSC → WETH collateral
4. **Fund DSC Yield Reserve** — funds `YieldAggregator` so yield profit withdrawals can be paid out

---

## Troubleshooting

**"Insufficient funds"** — get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com/).

**Contract verification failed** — add `--verify` and set `ETHERSCAN_API_KEY`, or remove the flag.

**Frontend shows wrong data after redeploy** — clear browser cache / MetaMask activity data, then hard refresh.
