// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDSCEngine {
    function depositCollateralFor(address user, address token, uint256 amount) external;
    function burnExternal(uint256 amount) external;
}

/**
 * @title RedemptionContract
 * @notice Allows users to convert profit DSC into WETH collateral in DSCEngine.
 *
 * Flow:
 *   1. User approves this contract to spend their DSC
 *   2. User calls redeemDscForWeth(dscAmount)
 *   3. DSC pulled from user → transferred to DSCEngine → burned (supply decreases)
 *   4. WETH approved to DSCEngine → depositCollateralFor(user) called
 *   5. User's collateral in DSCEngine increases → health factor improves immediately
 *
 * The owner must pre-fund this contract with WETH to back redemptions.
 * Simulated price: 1 ETH = $2,000 USD (adjustable by owner).
 */
contract RedemptionContract is Ownable, ReentrancyGuard {

    IERC20     public immutable dsc;
    IERC20     public immutable weth;
    IDSCEngine public immutable dscEngine;

    uint256 public ethPriceUsd = 2000; // Simulated: $2000 per ETH

    event Redeemed(address indexed user, uint256 dscBurned, uint256 wethCollateralAdded);
    event Funded(uint256 wethAmount);
    event EthPriceUpdated(uint256 newPrice);

    error AmountZero();
    error DscAmountTooSmall();
    error InsufficientWeth();

    constructor(address dscAddress, address wethAddress, address dscEngineAddress) Ownable(msg.sender) {
        dsc       = IERC20(dscAddress);
        weth      = IERC20(wethAddress);
        dscEngine = IDSCEngine(dscEngineAddress);
    }

    /**
     * @param dscAmount DSC to redeem (18 decimals, $1 peg assumed)
     * @notice DSC is burned via DSCEngine. Equivalent WETH is deposited as collateral for caller.
     *         wethOut = dscAmount / ethPriceUsd  (both 1e18 scale → result in 1e18 scale)
     */
    function redeemDscForWeth(uint256 dscAmount) external nonReentrant {
        if (dscAmount == 0) revert AmountZero();

        uint256 wethOut = dscAmount / ethPriceUsd;
        if (wethOut == 0) revert DscAmountTooSmall();
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

        emit Redeemed(msg.sender, dscAmount, wethOut);
    }

    /**
     * @notice Owner funds the contract with WETH to back future redemptions.
     */
    function fund(uint256 wethAmount) external onlyOwner {
        weth.transferFrom(msg.sender, address(this), wethAmount);
        emit Funded(wethAmount);
    }

    function setEthPrice(uint256 newPrice) external onlyOwner {
        ethPriceUsd = newPrice;
        emit EthPriceUpdated(newPrice);
    }

    function getWethOut(uint256 dscAmount) external view returns (uint256) {
        return dscAmount / ethPriceUsd;
    }

    function getWethBalance() external view returns (uint256) {
        return weth.balanceOf(address(this));
    }
}
