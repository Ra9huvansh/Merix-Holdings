# Debugging Token Balance Issues

## Issue: WETH balance not showing

If your WETH balance at `0xdd13E55209Fd76AfE204dBda4007C227904f0a81` is not visible:

### 1. Check .env file

Make sure your `frontend/.env` has:
```env
VITE_WETH_ADDRESS=0xdd13E55209Fd76AfE204dBda4007C227904f0a81
VITE_WBTC_ADDRESS=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
VITE_CHAIN_ID=11155111
```

### 2. Check Browser Console

Open browser DevTools (F12) and check the Console tab. You should see:
- "Contract collateral tokens: [...]"
- "WETH_ADDRESS from .env: 0x..."
- "Balance for 0xdd13E55209Fd76AfE204dBda4007C227904f0a81: ..."

### 3. Verify Address Match

The WETH address in your `.env` must match exactly what's in the contract:
- Contract WETH: Check what `getCollateralTokens()` returns
- .env WETH: Should be `0xdd13E55209Fd76AfE204dBda4007C227904f0a81` for Sepolia

### 4. Check Network

Make sure you're connected to Sepolia (chain ID 11155111) in MetaMask.

### 5. Restart Dev Server

After updating `.env`, restart the frontend:
```bash
# Stop the server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

## What the Code Does Now

1. Fetches balances for all tokens from the contract's `getCollateralTokens()`
2. **ALSO** fetches balances for WETH and WBTC from your `.env` file
3. Shows all tokens in the Dashboard (from contract + from .env)
4. Logs debug information to browser console

## Common Issues

### Address Case Sensitivity
Addresses are compared in lowercase, so `0xDD13...` and `0xdd13...` are treated the same.

### Token Contract Not Found
If you see "Could not create token contract", check:
- Is the address correct in .env?
- Is the token contract deployed on the current network?
- Are you on the correct network (Sepolia)?

### Balance Shows 0
- Check if you actually have WETH in that address
- Verify the address in MetaMask
- Check browser console for errors

