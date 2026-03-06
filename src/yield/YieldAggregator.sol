// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title YieldAggregator
 * @notice ERC4626-style vault that accepts DSC and allocates to simulated yield strategies.
 *         Operates completely independently from DSCEngine — does NOT touch collateral,
 *         s_DSCMinted, or health factor.
 *
 * Share accounting:
 *   - On deposit: sharesToMint = amount * totalShares / totalAssets  (1:1 on first deposit)
 *   - On withdraw: dscOut = sharesToBurn * totalAssets / totalShares
 *   - totalAssets grows over time via _harvestAll() (called on every deposit/withdraw)
 *
 * Yield reserve:
 *   - Owner pre-funds with DSC via fundYieldReserve() so withdrawals covering yield can be paid.
 *   - fundYieldReserve does NOT mint shares — it just adds real DSC to the vault balance.
 */
contract YieldAggregator is Ownable, ReentrancyGuard {

    struct Strategy {
        string name;
        string riskLevel;
        uint256 apyBps;         // APY in basis points (400 = 4%)
        uint256 totalDeposited; // Total DSC deposited to this strategy across all users
        uint256 lastHarvestTime;
        uint256 accruedYield;   // Total yield accrued since inception (for info)
        bool active;
    }

    IERC20 public immutable dsc;

    // Global vault accounting (ERC4626-style)
    uint256 public totalShares; // Total yDSC shares in circulation
    uint256 public totalAssets; // Virtual total: deposits + simulated yield (grows on harvest)

    // Per-user
    mapping(address => uint256) public userShares;
    mapping(address => uint256) public userPrincipal;   // DSC deposited (cost basis)
    mapping(address => uint256) public realizedProfit;  // Profit taken on withdrawals

    address public redemptionContract;

    // Per-user per-strategy: DSC allocated to each strategy
    mapping(address => mapping(uint256 => uint256)) public userStrategyDeposited;

    Strategy[] public strategies;

    event Deposited(address indexed user, uint256 indexed strategyId, uint256 dscAmount, uint256 sharesMinted);
    event Withdrawn(address indexed user, uint256 indexed strategyId, uint256 dscAmount, uint256 profit);
    event YieldReserveFunded(uint256 amount);
    event Harvested(uint256 newYield);

    error InvalidStrategy();
    error StrategyInactive();
    error AmountZero();
    error InsufficientShares();
    error NoStrategyDeposit();
    error InsufficientVaultLiquidity();
    error NotRedemptionContract();
    error InsufficientRealizedProfit();

    constructor(address dscAddress) Ownable(msg.sender) {
        dsc = IERC20(dscAddress);

        // Initialise 5 strategies
        strategies.push(Strategy("XAU (Gold)",   "Low",    400,  0, block.timestamp, 0, true));
        strategies.push(Strategy("XAG (Silver)", "Low",    300,  0, block.timestamp, 0, true));
        strategies.push(Strategy("Aave Lending", "Low",    500,  0, block.timestamp, 0, true));
        strategies.push(Strategy("Compound",     "Medium", 600,  0, block.timestamp, 0, true));
        strategies.push(Strategy("Uniswap LP",   "High",   1800, 0, block.timestamp, 0, true));
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @param strategyId Index of the strategy to deposit into (0-4)
     * @param amount DSC amount to deposit (18 decimals)
     */
    function depositToStrategy(uint256 strategyId, uint256 amount) external nonReentrant {
        if (strategyId >= strategies.length) revert InvalidStrategy();
        if (!strategies[strategyId].active)   revert StrategyInactive();
        if (amount == 0)                       revert AmountZero();

        // Crystallise yield before computing share price
        _harvestAll();

        // ERC4626 share math: 1:1 on first deposit, proportional thereafter
        uint256 sharesToMint = (totalShares == 0 || totalAssets == 0)
            ? amount
            : (amount * totalShares) / totalAssets;

        dsc.transferFrom(msg.sender, address(this), amount);

        totalShares += sharesToMint;
        totalAssets += amount;

        userShares[msg.sender]   += sharesToMint;
        userPrincipal[msg.sender] += amount;
        userStrategyDeposited[msg.sender][strategyId] += amount;
        strategies[strategyId].totalDeposited += amount;

        emit Deposited(msg.sender, strategyId, amount, sharesToMint);
    }

    /**
     * @param strategyId Strategy to withdraw from
     * @param dscAmount DSC amount to receive back
     * @notice dscAmount must be <= user's proportional share of totalAssets
     */
    function withdrawFromStrategy(uint256 strategyId, uint256 dscAmount) external nonReentrant {
        if (strategyId >= strategies.length) revert InvalidStrategy();
        if (dscAmount == 0) revert AmountZero();
        if (userStrategyDeposited[msg.sender][strategyId] == 0) revert NoStrategyDeposit();

        _harvestAll();

        if (totalShares == 0 || totalAssets == 0) revert InsufficientShares();

        // Shares to burn for this withdrawal
        uint256 sharesToBurn = (dscAmount * totalShares) / totalAssets;
        if (sharesToBurn > userShares[msg.sender]) revert InsufficientShares();

        // Proportional cost-basis reduction
        uint256 principalReduction = userShares[msg.sender] > 0
            ? (sharesToBurn * userPrincipal[msg.sender]) / userShares[msg.sender]
            : 0;
        uint256 profit = dscAmount > principalReduction ? dscAmount - principalReduction : 0;

        // Strategy accounting
        uint256 stratDeposited = userStrategyDeposited[msg.sender][strategyId];
        uint256 stratReduction = dscAmount < stratDeposited ? dscAmount : stratDeposited;
        strategies[strategyId].totalDeposited = strategies[strategyId].totalDeposited > stratReduction
            ? strategies[strategyId].totalDeposited - stratReduction : 0;
        userStrategyDeposited[msg.sender][strategyId] -= stratReduction;

        // Global vault
        totalShares -= sharesToBurn;
        totalAssets -= dscAmount;
        userShares[msg.sender]    -= sharesToBurn;
        userPrincipal[msg.sender]  = userPrincipal[msg.sender] > principalReduction
            ? userPrincipal[msg.sender] - principalReduction : 0;

        realizedProfit[msg.sender] += profit;

        if (dsc.balanceOf(address(this)) < dscAmount) revert InsufficientVaultLiquidity();
        dsc.transfer(msg.sender, dscAmount);

        emit Withdrawn(msg.sender, strategyId, dscAmount, profit);
    }

    /**
     * @notice Burn all remaining shares the caller holds and receive proportional DSC.
     * @dev    Used when userStrategyDeposited is 0 but shares still exist (residual yield).
     *         No per-strategy accounting is touched since those balances are already 0.
     */
    function withdrawRemainingShares() external nonReentrant {
        uint256 sharesToBurn = userShares[msg.sender];
        if (sharesToBurn == 0) revert InsufficientShares();

        _harvestAll();

        if (totalShares == 0 || totalAssets == 0) revert InsufficientShares();

        uint256 dscOut = (sharesToBurn * totalAssets) / totalShares;

        uint256 principalReduction = userPrincipal[msg.sender] < dscOut
            ? userPrincipal[msg.sender]
            : dscOut;
        uint256 profit = dscOut > principalReduction ? dscOut - principalReduction : 0;

        totalShares               -= sharesToBurn;
        totalAssets               -= dscOut;
        userShares[msg.sender]     = 0;
        userPrincipal[msg.sender]  = 0;
        realizedProfit[msg.sender] += profit;

        if (dsc.balanceOf(address(this)) < dscOut) revert InsufficientVaultLiquidity();
        dsc.transfer(msg.sender, dscOut);

        emit Withdrawn(msg.sender, type(uint256).max, dscOut, profit);
    }

    /**
     * @notice Owner sets the authorised RedemptionContract address.
     */
    function setRedemptionContract(address _redemptionContract) external onlyOwner {
        redemptionContract = _redemptionContract;
    }

    /**
     * @notice Called by RedemptionContract after a successful redemption to consume
     *         the user's realized profit balance so it cannot be double-spent.
     */
    function deductRealizedProfit(address user, uint256 amount) external {
        if (msg.sender != redemptionContract) revert NotRedemptionContract();
        if (realizedProfit[user] < amount) revert InsufficientRealizedProfit();
        realizedProfit[user] -= amount;
    }

    /**
     * @notice Owner pre-funds vault with DSC to cover yield payouts.
     *         Does NOT mint shares — balance increase is purely to back yield withdrawals.
     */
    function fundYieldReserve(uint256 amount) external onlyOwner {
        dsc.transferFrom(msg.sender, address(this), amount);
        emit YieldReserveFunded(amount);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _harvestAll() internal {
        uint256 newYield;
        for (uint256 i = 0; i < strategies.length; i++) {
            newYield += _harvestStrategy(i);
        }
        if (newYield > 0) emit Harvested(newYield);
    }

    function _harvestStrategy(uint256 id) internal returns (uint256 yieldAmount) {
        Strategy storage s = strategies[id];
        if (s.totalDeposited == 0) return 0;
        uint256 elapsed = block.timestamp - s.lastHarvestTime;
        yieldAmount = (s.totalDeposited * s.apyBps * elapsed) / (365 days * 10_000);
        s.accruedYield    += yieldAmount;
        s.lastHarvestTime  = block.timestamp;
        totalAssets       += yieldAmount;
    }

    /*//////////////////////////////////////////////////////////////
                             VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getStrategyCount() external view returns (uint256) {
        return strategies.length;
    }

    function getStrategy(uint256 id) external view returns (
        string memory name,
        string memory riskLevel,
        uint256 apyBps,
        uint256 totalDeposited,
        uint256 accruedYield
    ) {
        Strategy storage s = strategies[id];
        return (s.name, s.riskLevel, s.apyBps, s.totalDeposited, s.accruedYield);
    }

    function getUserInfo(address user) external view returns (
        uint256 shares,
        uint256 principal,
        uint256 realizedPft,
        uint256 currentValue
    ) {
        shares       = userShares[user];
        principal    = userPrincipal[user];
        realizedPft  = realizedProfit[user];
        currentValue = totalShares == 0 ? 0 : (shares * totalAssets) / totalShares;
    }

    /**
     * @notice Returns totalAssets + unharvested yield across all strategies.
     *         Off-chain read only — used by frontend for live display.
     */
    function getSimulatedTotalAssets() external view returns (uint256) {
        uint256 sim = totalAssets;
        for (uint256 i = 0; i < strategies.length; i++) {
            Strategy storage s = strategies[i];
            if (s.totalDeposited == 0) continue;
            uint256 elapsed = block.timestamp - s.lastHarvestTime;
            sim += (s.totalDeposited * s.apyBps * elapsed) / (365 days * 10_000);
        }
        return sim;
    }

    function getUserStrategyDeposited(address user, uint256 strategyId) external view returns (uint256) {
        return userStrategyDeposited[user][strategyId];
    }

    function getVaultDscBalance() external view returns (uint256) {
        return dsc.balanceOf(address(this));
    }
}
