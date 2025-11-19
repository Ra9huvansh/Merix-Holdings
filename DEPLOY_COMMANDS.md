# Deployment Commands

## Deploy to Sepolia Testnet

### Prerequisites
```bash
export PRIVATE_KEY=your_private_key_here
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
# OR
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Deploy Contracts
```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

**Important**: Make sure to use `--rpc-url` (not `--fork-url`). The `--fork-url` flag is only for running tests with forking.

## Run Tests (Local)

```bash
# Run all tests (no fork needed)
forge test

# Run with verbose output
forge test -vvv
```

## Common Errors

### Error: "a value is required for '--fork-url <URL>'"
**Solution**: You're using the wrong flag. Use `--rpc-url` for deployment:
```bash
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast
```

### Error: "fork-url required"
**Solution**: This only happens with fork tests. For deployment, use `--rpc-url` instead.

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy to Sepolia | `forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend --rpc-url $SEPOLIA_RPC_URL --broadcast --verify` |
| Deploy to Local Anvil | `forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend --rpc-url http://localhost:8545 --broadcast` |
| Run Tests | `forge test` |
| Run Tests with Fork | `forge test --fork-url $SEPOLIA_RPC_URL` |

