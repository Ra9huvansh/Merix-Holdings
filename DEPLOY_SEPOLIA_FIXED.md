# Deploy to Sepolia - CORRECT COMMAND

## The Error
If you see: `error: a value is required for '--fork-url <URL>' but none was supplied`

**This means you're using the wrong flag!**

## ✅ CORRECT Command for Sepolia Deployment

```bash
# Set your environment variables first
export PRIVATE_KEY=your_private_key_here
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Use --rpc-url (NOT --fork-url)
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

## Key Difference

- **`--rpc-url`** = Used for deployment scripts (what you need!)
- **`--fork-url`** = Used for running tests with forking (NOT for deployment)

## Step-by-Step

1. **Set environment variables:**
   ```bash
   export PRIVATE_KEY=0x...
   export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   ```

2. **Deploy (use --rpc-url):**
   ```bash
   forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
       --rpc-url $SEPOLIA_RPC_URL \
       --broadcast \
       --verify \
       -vvvv
   ```

3. **Copy addresses from output to frontend/.env**

4. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## Alternative: Use the Deployment Script

```bash
./deploy-sepolia.sh
```

This script uses the correct flags automatically.

