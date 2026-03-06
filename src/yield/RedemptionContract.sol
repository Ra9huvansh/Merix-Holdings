// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDSCEngine {
    function depositCollateralFor(address user, address token, uint256 amount) external;
    function burnExternal(uint256 amount) external;
    function getTokenAmountFromUsd(address token, uint256 usdAmountInWei) external view returns (uint256);
}

interface IYieldAggregator {
    function realizedProfit(address user) external view returns (uint256);
    function deductRealizedProfit(address user, uint256 amount) external;
}

/**
 * @title RedemptionContract
 * @notice Allows users to convert realized profit DSC into WETH collateral in DSCEngine.
 *
 * Flow:
 *   1. User approves this contract to spend their DSC
 *   2. User calls redeemDscForWeth(dscAmount)
 *   3. Contract checks dscAmount <= user's realizedProfit in YieldAggregator
 *   4. DSC pulled from user → transferred to DSCEngine → burned (supply decreases)
 *   5. WETH approved to DSCEngine → depositCollateralFor(user) called
 *   6. User's collateral in DSCEngine increases → health factor improves immediately
 *   7. realizedProfit[user] is decremented by dscAmount in YieldAggregator
 *
 * The owner must pre-fund this contract with WETH to back redemptions.
 * WETH conversion uses the live Chainlink oracle via DSCEngine.getTokenAmountFromUsd().
 */
contract RedemptionContract is Ownable, ReentrancyGuard {

    IERC20            public immutable dsc;
    IERC20            public immutable weth;
    IDSCEngine        public immutable dscEngine;
    IYieldAggregator  public immutable yieldAggregator;

    event Redeemed(address indexed user, uint256 dscBurned, uint256 wethCollateralAdded);
    event Funded(uint256 wethAmount);

    error AmountZero();
    error ExceedsRealizedProfit(uint256 requested, uint256 available);
    error WethOutZero();
    error InsufficientWeth();

    constructor(
        address dscAddress,
        address wethAddress,
        address dscEngineAddress,
        address yieldAggregatorAddress
    ) Ownable(msg.sender) {
        dsc             = IERC20(dscAddress);
        weth            = IERC20(wethAddress);
        dscEngine       = IDSCEngine(dscEngineAddress);
        yieldAggregator = IYieldAggregator(yieldAggregatorAddress);
    }

    /**
     * @param dscAmount DSC to redeem (18 decimals, $1 peg assumed).
     *                  Must not exceed the caller's realizedProfit in YieldAggregator.
     * @notice DSC is burned via DSCEngine. Equivalent WETH (live Chainlink price) is
     *         deposited as collateral for the caller. realizedProfit is decremented.
     */
    function redeemDscForWeth(uint256 dscAmount) external nonReentrant {
        if (dscAmount == 0) revert AmountZero();

        uint256 available = yieldAggregator.realizedProfit(msg.sender);
        if (dscAmount > available) revert ExceedsRealizedProfit(dscAmount, available);

        uint256 wethOut = dscEngine.getTokenAmountFromUsd(address(weth), dscAmount);
        if (wethOut == 0) revert WethOutZero();
        if (weth.balanceOf(address(this)) < wethOut) revert InsufficientWeth();

        // 1. Pull DSC from user into this contract
        dsc.transferFrom(msg.sender, address(this), dscAmount);

        // 2. Approve DSCEngine to pull DSC from this contract, then burn it
        dsc.approve(address(dscEngine), dscAmount);
        dscEngine.burnExternal(dscAmount);

        // 3. Approve DSCEngine to pull WETH from this contract
        weth.approve(address(dscEngine), wethOut);

        // 4. DSCEngine deposits WETH as collateral credited to the caller
        dscEngine.depositCollateralFor(msg.sender, address(weth), wethOut);

        // 5. Consume the realized profit so it cannot be reused
        yieldAggregator.deductRealizedProfit(msg.sender, dscAmount);

        emit Redeemed(msg.sender, dscAmount, wethOut);
    }

    /**
     * @notice Owner funds the contract with WETH to back future redemptions.
     */
    function fund(uint256 wethAmount) external onlyOwner {
        weth.transferFrom(msg.sender, address(this), wethAmount);
        emit Funded(wethAmount);
    }

    function getWethBalance() external view returns (uint256) {
        return weth.balanceOf(address(this));
    }
}
