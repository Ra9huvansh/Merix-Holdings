# 💎 Merix Holdings – Decentralized Stablecoin Platform

<div align="center">

![Merix Holdings](https://img.shields.io/badge/Merix%20Holdings-Decentralized%20Stablecoin-667eea?style=for-the-badge&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=for-the-badge&logo=solidity)
![React](https://img.shields.io/badge/React-18+-61dafb?style=for-the-badge&logo=react)
![Foundry](https://img.shields.io/badge/Foundry-Latest-000000?style=for-the-badge)

**A decentralized, pegged, over-collateralized stablecoin protocol built on Ethereum with a stunning Apple-inspired UI**

[Features](#-features) • [Quick Start](#-quick-start) • [Frontend](#-frontend-features) • [Smart Contracts](#-smart-contracts) • [Deployment](#-deployment)

</div>

---

## 🌟 Overview

**Merix Holdings** is a **collateral-backed, over-collateralized stablecoin** protocol that lets you:

- 💰 **Deposit** blue-chip crypto assets (WETH / WBTC) as collateral
- 🪙 **Mint** a decentralized stablecoin (DSC) pegged to $1.00
- 🔄 **Redeem / Burn** to unlock your collateral
- ⚡ **Liquidate** risky positions – fully on-chain, enforced by smart contracts
- 🔒 **Verify Transactions** with AI-powered security analysis

Built with **Foundry** for smart contracts and a **modern React + Vite frontend** featuring an elegant black & silver "timepiece" design inspired by luxury watchmaking.

---

## ✨ Features

### 🏗️ Smart Contract Features

- ✅ **Over-Collateralization** – Your collateral value must exceed your DSC debt
- ✅ **Health Factor System** – Real-time position safety monitoring
- ✅ **Chainlink Price Feeds** – Decentralized, reliable price oracles
- ✅ **Liquidation Mechanism** – Automated protection against undercollateralization
- ✅ **Multi-Collateral Support** – WETH and WBTC support
- ✅ **Security First** – Reentrancy guards, access controls, and comprehensive checks

### 🎨 Frontend Features

- 🖤 **Premium Black & Silver Theme** – Elegant, timepiece-inspired design
- 🌌 **Animated Landing Page** – Orbital logo with mesmerizing effects
- 📊 **Live Market Ticker** – Real-time crypto prices from CoinGecko
- 💫 **Silver Meteor Effects** – Subtle background animations
- 📱 **Fully Responsive** – Beautiful on all devices
- 🔐 **Transaction Verifier** – AI-powered security analysis for MetaMask transactions

---

## 🎯 Core Concepts

### 💵 DSC (Decentralized StableCoin)
An ERC20 token designed to track **$1.00**, backed by more value in collateral than is minted. Think of it as a crypto-backed dollar that you can mint by locking up valuable assets.

### 🏦 Collateral (WETH / WBTC)
You lock WETH or WBTC into the `DSCEngine` contract. This collateral is valued in real-time via **Chainlink price feeds**, ensuring accurate USD valuations.

### ❤️ Health Factor
A critical metric that tells you how safe your position is:
- **> 1.0** → ✅ Safe position
- **≤ 1.0** → ⚠️ Can be liquidated

**Formula:** `(Total Collateral Value × Liquidation Threshold) / Total DSC Debt`

### 🪙 Minting DSC
You can mint DSC tokens against your collateral, but only if your **health factor stays above the minimum threshold**. The more collateral you have, the more DSC you can mint safely.

### 🔄 Redeeming / Burning
- **Redeem Collateral**: Return (burn) DSC → receive your WETH / WBTC back
- **Burn DSC**: Reduces your debt and improves your health factor

### ⚡ Liquidation
If someone's health factor drops too low, another user can **liquidate** their position, repaying their DSC debt and taking a portion of their collateral with a bonus.

---

## 📁 Project Structure

```
Merix Holdings/
├── 📄 src/                          # Smart Contracts
│   ├── DecentralizedStableCoin.sol  # ERC20 stablecoin implementation
│   ├── DSCEngine.sol                # Core protocol logic
│   └── libraries/
│       └── OracleLib.sol            # Chainlink price feed helpers
│
├── 📜 script/                       # Deployment Scripts
│   ├── DeployDSC.s.sol              # Basic deployment
│   ├── HelperConfig.s.sol            # Network configurations
│   └── DeployAndUpdateFrontend.s.sol # Deployment + frontend config
│
├── 🎨 frontend/                     # React + Vite Application
│   ├── src/
│   │   ├── components/             # UI Components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── constants/                # ABIs & addresses
│   │   └── utils/                   # Helper functions
│   └── package.json
│
└── 🧪 test/                         # Foundry Tests
    ├── unit/                        # Unit tests
    └── fuzz/                        # Fuzz & invariant tests
```

---

## 🚀 Quick Start

### Prerequisites

- 📦 **Node.js** (LTS version recommended)
- 🔧 **Foundry** ([Installation Guide](https://book.getfoundry.sh/getting-started/installation))
- 🦊 **MetaMask** browser extension
- 🌐 **Sepolia RPC URL** (for testnet deployment) – Get one from [Infura](https://infura.io) or [Alchemy](https://alchemy.com)

### 1️⃣ Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2️⃣ Install Dependencies

```bash
# Install Foundry dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3️⃣ Deploy Contracts

#### 🏠 Local Development (Anvil)

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts
forge script script/DeployAndUpdateFrontend.s.sol:DeployAndUpdateFrontend \
  --rpc-url http://localhost:8545 \
  --broadcast
```

#### 🌐 Sepolia Testnet

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_without_0x
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
export ETHERSCAN_API_KEY=your_etherscan_key

# Deploy
./deploy-sepolia.sh
```

The deployment script will print contract addresses in this format:

```env
VITE_DSC_ENGINE_ADDRESS=0x...
VITE_DSC_TOKEN_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
VITE_WBTC_ADDRESS=0x...
VITE_CHAIN_ID=11155111
```

### 4️⃣ Configure Frontend

Create `frontend/.env` with the addresses from deployment:

```env
VITE_DSC_ENGINE_ADDRESS=0xYourEngineAddress
VITE_DSC_TOKEN_ADDRESS=0xYourDSCAddress
VITE_WETH_ADDRESS=0xYourWETHAddress
VITE_WBTC_ADDRESS=0xYourWBTCAddress
VITE_CHAIN_ID=11155111
VITE_OPENAI_API_KEY=your_openai_key_optional
```

**⚠️ Important:** No spaces around `=` signs!

### 5️⃣ Run Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser! 🎉

---

## 🎨 Frontend Features

### 🏠 Landing Page (Disconnected State)

When you first visit Merix Holdings, you're greeted by a stunning landing page:

- ⚡ **Animated Hero** – Merix Holdings logo at the center of three orbiting rings, creating an "endless timepiece" effect
- 📊 **Live Market Ticker** – Continuously scrolling prices for BTC, ETH, SOL, AVAX, LINK, and ARB with real-time data from CoinGecko
- 💫 **Silver Meteor Effects** – Subtle animated streaks in key sections
- 📖 **Protocol Overview** – Clear explanations of features, use cases, and how it works
- 🔗 **Seamless Connection** – One-click wallet connection that instantly transitions to the dashboard

### 💼 Dashboard (Connected State)

Once connected, you get access to a comprehensive dashboard:

#### 📊 Account Overview
- **Health Factor** – Color-coded indicator (green = safe, red = risky)
- **Total Collateral Value** – USD value of all deposited collateral
- **DSC Minted** – Your current stablecoin debt

#### 💰 Collateral Positions
For each token (WETH / WBTC):
- Deposited amount
- Wallet balance
- Token symbol & address

#### 🎯 Actions Available
- **Deposit** – Lock WETH or WBTC as collateral
- **Mint DSC** – Create stablecoins against your collateral
- **Redeem** – Withdraw collateral by burning DSC
- **Burn DSC** – Reduce debt to improve health factor
- **Liquidate** – Close undercollateralized positions (with bonus!)

### 🔒 Transaction Verifier (NEW! 🎉)

A **premium security feature** that analyzes MetaMask transactions before you sign them:

- 🔍 **AI-Powered Analysis** – Uses OpenAI GPT to detect malicious patterns
- 🛡️ **Risk Assessment** – Get risk levels (Critical, High, Medium, Low, Safe)
- 📋 **Function Selector Analysis** – Examines the first 4 bytes of calldata
- 💡 **Heuristic Fallback** – Works even without an API key
- ⚡ **Transaction Hash Support** – Paste a hash or raw calldata

**How to Use:**
1. Click the **"Verify TX"** button in the navigation bar
2. Paste a transaction hash (from Etherscan) or raw calldata
3. Get instant risk analysis and recommendations
4. Make informed decisions before signing!

**Setup (Optional):**
Add `VITE_OPENAI_API_KEY` to your `frontend/.env` for enhanced AI analysis. Without it, the verifier uses heuristic analysis.

---

## 🏗️ Smart Contracts

### Core Contracts

#### `DecentralizedStableCoin.sol`
- ERC20 token implementation
- Burnable (users can burn their DSC)
- Ownable (DSCEngine controls minting)

#### `DSCEngine.sol`
The heart of the protocol:

**Functions:**
- `depositCollateral()` – Lock WETH/WBTC
- `redeemCollateral()` – Withdraw collateral (must burn DSC first)
- `mintDsc()` – Create DSC tokens
- `burnDsc()` – Destroy DSC tokens (reduces debt)
- `liquidate()` – Close unhealthy positions
- `getHealthFactor()` – Calculate position safety
- `getAccountCollateralValue()` – Total collateral in USD

**Security Features:**
- ReentrancyGuard
- Health factor checks before risky operations
- Only allowed collateral tokens
- Chainlink price feed integration

#### `OracleLib.sol`
- Price feed helpers
- Staleness checks
- Round completeness validation

---

## 🔄 Usage Flow

### Complete User Journey

1. **🌐 Visit Landing Page**
   - Admire the beautiful design
   - Read about Merix Holdings' features
   - Watch the live market ticker

2. **🔗 Connect Wallet**
   - Click "Connect Wallet"
   - MetaMask opens with account selection
   - App automatically switches to dashboard

3. **💰 Deposit Collateral**
   - Navigate to **Deposit** tab
   - Select WETH or WBTC
   - Enter amount (or click MAX)
   - Approve token (first time only)
   - Confirm deposit transaction

4. **🪙 Mint DSC**
   - Go to **Mint DSC** tab
   - Enter desired DSC amount
   - System checks health factor
   - Confirm mint transaction

5. **🔄 Manage Position**
   - **Redeem**: Withdraw collateral by burning DSC
   - **Burn**: Reduce DSC debt to improve health
   - Monitor your health factor on the dashboard

6. **⚡ Liquidate (Advanced)**
   - Find unhealthy positions
   - Use **Liquidate** tab
   - Repay their DSC debt
   - Receive collateral + bonus

7. **🔒 Verify Transactions**
   - Before signing any suspicious transaction
   - Use **Verify TX** to analyze calldata
   - Get AI-powered risk assessment
   - Make informed decisions

---

## 📚 Additional Documentation

- 📖 [`FRONTEND_SETUP.md`](./FRONTEND_SETUP.md) – Detailed frontend setup guide
- 🚀 [`DEPLOY_SEPOLIA.md`](./DEPLOY_SEPOLIA.md) – Complete Sepolia deployment walkthrough
- 🔍 [`GET_ADDRESSES.md`](./GET_ADDRESSES.md) – How to retrieve and manage contract addresses
- ⚡ [`SEPOLIA_QUICK_START.md`](./SEPOLIA_QUICK_START.md) – Quick reference for Sepolia setup

---

## 💡 Tips & Troubleshooting

### Common Issues

**🔴 Frontend not updating?**
- Restart `npm run dev` after changing `.env`
- Clear browser cache
- Check that addresses in `.env` match deployment output

**🔴 MetaMask auto-connecting wrong account?**
1. Use MetaMask "Connected sites" to disconnect
2. Click **Disconnect** button in the app
3. Reconnect – the app forces account selection

**🔴 Transaction failing?**
- Check your health factor (must stay above 1.0)
- Ensure you have enough collateral
- Verify you're on the correct network (Sepolia or local)

**🔴 Dropdown not visible?**
- The select dropdown should now have proper dark styling
- If issues persist, check browser console for errors

### Development Tips

- 🧪 **Testing**: Run `forge test` to execute all smart contract tests
- 📝 **Linting**: Use `forge fmt` to format Solidity code
- 🔍 **Debugging**: Check browser console and Foundry logs
- 🎨 **Styling**: Main styles in `frontend/src/App.css`

---

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** 0.8.19+
- **Foundry** – Development framework
- **Chainlink** – Price feeds
- **OpenZeppelin** – Security libraries

### Frontend
- **React** 18+
- **Vite** – Build tool
- **Ethers.js** – Ethereum interaction
- **CoinGecko API** – Market data

### Security
- **ReentrancyGuard** – Protection against reentrancy attacks
- **Access Control** – Ownable pattern
- **Health Factor Checks** – Prevent unsafe operations
- **AI Transaction Verification** – Additional security layer

---

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome! If you find any issues or have ideas for improvements, feel free to open an issue.

---

## 📄 License

This project is open source. See individual files for specific licenses.

---

## 🙏 Acknowledgments

- **Chainlink** for reliable price feeds
- **OpenZeppelin** for battle-tested security patterns
- **Foundry** for an amazing development experience
- **Ethereum** for the decentralized infrastructure

---

<div align="center">

### 💎 Built with passion and precision 💎

**Merix Holdings** – Where elegance meets DeFi

⭐ Star this repo if you find it helpful!

</div>

---

## 📞 Support

Having issues? Check the documentation files or review the smart contract comments in `src/DSCEngine.sol` for detailed protocol information.

---

**Made with ❤️ for the DeFi community**

*"A minimal, bold, and fully interactive decentralized stablecoin platform."*
