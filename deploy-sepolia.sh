#!/bin/bash

# Deploy Merix Holdings to Sepolia Testnet
# Make sure you have PRIVATE_KEY and SEPOLIA_RPC_URL set in your environment

echo "🚀 Deploying Merix Holdings to Sepolia Testnet..."
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo "   Set it with: export PRIVATE_KEY=your_private_key"
    exit 1
fi

# Check if SEPOLIA_RPC_URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "⚠️  Warning: SEPOLIA_RPC_URL not set, using default Infura URL"
    echo "   Set it with: export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY"
    SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
fi

echo "📝 Deploying contracts..."
echo ""

# Deploy contracts
# IMPORTANT: Use --rpc-url (NOT --fork-url) for deployment
echo "📡 Using RPC URL: $SEPOLIA_RPC_URL"
echo ""

forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
    --rpc-url "$SEPOLIA_RPC_URL" \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the contract addresses from the output above"
echo "2. Update frontend/.env with the addresses"
echo "3. Set VITE_CHAIN_ID=11155111 in frontend/.env"
echo "4. Start the frontend: cd frontend && npm run dev"
echo ""

