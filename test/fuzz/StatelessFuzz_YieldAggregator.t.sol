// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract StatelessFuzz_YieldAggregator is Test {
    DeployDSC deployer;
    DSCEngine dsce;
    DecentralizedStableCoin dsc;
    YieldAggregator yieldAgg;
    HelperConfig config;

    address weth;
    uint256 deployerKey;

    address USER  = makeAddr("user");
    address USER2 = makeAddr("user2");

    uint256 constant COLLATERAL    = 100 ether;
    uint256 constant DSC_TO_MINT   = 5000e18;
    uint256 constant MAX_DEPOSIT   = 1000e18; // stay within minted DSC
    uint256 constant YIELD_RESERVE = 10_000e18;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (,, weth,, deployerKey) = config.activeNetworkConfig();

        yieldAgg = new YieldAggregator(address(dsc));

        // Mint DSC for USER and USER2
        _mintDscFor(USER,  COLLATERAL, DSC_TO_MINT);
        _mintDscFor(USER2, COLLATERAL, DSC_TO_MINT);

        // Fund yield reserve (test contract = owner)
        _mintDscFor(address(this), COLLATERAL * 2, YIELD_RESERVE);
        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);
    }

    function _mintDscFor(address user, uint256 col, uint256 dscAmount) internal {
        ERC20Mock(weth).mint(user, col);
        vm.startPrank(user);
        ERC20Mock(weth).approve(address(dsce), col);
        dsce.depositCollateralAndMintDsc(weth, col, dscAmount);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    20. testFuzz_DepositToStrategy
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositToStrategy(uint256 strategyId, uint256 amount) public {
        strategyId = bound(strategyId, 0, 4);
        amount     = bound(amount, 1, MAX_DEPOSIT);

        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), amount);
        yieldAgg.depositToStrategy(strategyId, amount);
        vm.stopPrank();

        assertEq(yieldAgg.userPrincipal(USER), amount);
        assertEq(yieldAgg.getUserStrategyDeposited(USER, strategyId), amount);
        assertEq(yieldAgg.totalAssets(), amount);
    }

    /*//////////////////////////////////////////////////////////////
            21. testFuzz_DepositToStrategy_RevertsIfInvalidStrategy
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositToStrategy_RevertsIfInvalidStrategy(uint256 strategyId, uint256 amount) public {
        strategyId = bound(strategyId, 5, type(uint256).max);
        amount     = bound(amount, 1, MAX_DEPOSIT);

        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), amount);
        vm.expectRevert(YieldAggregator.InvalidStrategy.selector);
        yieldAgg.depositToStrategy(strategyId, amount);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                22. testFuzz_WithdrawFromStrategy
    //////////////////////////////////////////////////////////////*/

    function testFuzz_WithdrawFromStrategy(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount  = bound(depositAmount,  2, MAX_DEPOSIT);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), depositAmount);
        yieldAgg.depositToStrategy(0, depositAmount);

        uint256 balBefore = dsc.balanceOf(USER);
        yieldAgg.withdrawFromStrategy(0, withdrawAmount);
        vm.stopPrank();

        assertEq(dsc.balanceOf(USER), balBefore + withdrawAmount);
        // principal reduced by withdrawn amount (no yield in same block)
        assertEq(yieldAgg.userPrincipal(USER), depositAmount - withdrawAmount);
    }

    /*//////////////////////////////////////////////////////////////
                23. testFuzz_ShareMathIsCorrect
    //////////////////////////////////////////////////////////////*/

    function testFuzz_ShareMathIsCorrect(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1e18, MAX_DEPOSIT / 2);
        amount2 = bound(amount2, 1e18, MAX_DEPOSIT / 2);

        // USER deposits amount1
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), amount1);
        yieldAgg.depositToStrategy(0, amount1);
        vm.stopPrank();

        // USER2 deposits amount2 in same block (no yield between deposits)
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), amount2);
        yieldAgg.depositToStrategy(0, amount2);
        vm.stopPrank();

        uint256 shares1 = yieldAgg.userShares(USER);
        uint256 shares2 = yieldAgg.userShares(USER2);
        uint256 total   = yieldAgg.totalShares();

        // Total shares == sum of individual shares
        assertEq(total, shares1 + shares2);

        // Share proportion matches deposit proportion (within 1 wei rounding)
        // shares1 / total ≈ amount1 / (amount1 + amount2)
        // Cross-multiply to avoid division: shares1 * (amount1 + amount2) ≈ amount1 * total
        assertApproxEqAbs(shares1 * (amount1 + amount2), amount1 * total, total);
    }

    /*//////////////////////////////////////////////////////////////
                24. testFuzz_YieldAccrualOverTime
    //////////////////////////////////////////////////////////////*/

    function testFuzz_YieldAccrualOverTime(uint256 depositAmount, uint256 timeElapsed) public {
        depositAmount = bound(depositAmount, 1e18, MAX_DEPOSIT);
        timeElapsed   = bound(timeElapsed, 1 days, 365 days);

        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), depositAmount);
        yieldAgg.depositToStrategy(0, depositAmount); // XAU 4% APY
        vm.stopPrank();

        uint256 assetsBefore = yieldAgg.totalAssets();
        vm.warp(block.timestamp + timeElapsed);

        // Trigger harvest via a small deposit
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), 1e18);
        yieldAgg.depositToStrategy(0, 1e18);
        vm.stopPrank();

        // totalAssets should have grown (harvest adds yield on top of new deposit)
        assertGt(yieldAgg.totalAssets(), assetsBefore + 1e18);

        // Simulated assets must match or exceed actual after harvest
        assertGe(yieldAgg.getSimulatedTotalAssets(), yieldAgg.totalAssets());
    }

    /*//////////////////////////////////////////////////////////////
                    25. testFuzz_FundYieldReserve
    //////////////////////////////////////////////////////////////*/

    function testFuzz_FundYieldReserve(uint256 fundAmount) public {
        fundAmount = bound(fundAmount, 1, 1000e18);

        // Mint extra DSC for this test contract (owner)
        _mintDscFor(address(this), 50 ether, fundAmount);
        dsc.approve(address(yieldAgg), fundAmount);

        uint256 sharesBefore  = yieldAgg.totalShares();
        uint256 assetsBefore  = yieldAgg.totalAssets();
        uint256 balanceBefore = dsc.balanceOf(address(yieldAgg));

        yieldAgg.fundYieldReserve(fundAmount);

        // Vault DSC balance increases
        assertEq(dsc.balanceOf(address(yieldAgg)), balanceBefore + fundAmount);
        // No new shares minted
        assertEq(yieldAgg.totalShares(), sharesBefore);
        // totalAssets does NOT change (reserve is separate from tracked assets)
        assertEq(yieldAgg.totalAssets(), assetsBefore);
    }

    /*//////////////////////////////////////////////////////////////
                    26. testFuzz_MultiUserDeposits
    //////////////////////////////////////////////////////////////*/

    function testFuzz_MultiUserDeposits(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1e18, MAX_DEPOSIT / 2);
        amount2 = bound(amount2, 1e18, MAX_DEPOSIT / 2);

        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), amount1);
        yieldAgg.depositToStrategy(0, amount1);
        vm.stopPrank();

        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), amount2);
        yieldAgg.depositToStrategy(0, amount2);
        vm.stopPrank();

        // Invariant: totalShares == sum of all userShares
        assertEq(yieldAgg.totalShares(), yieldAgg.userShares(USER) + yieldAgg.userShares(USER2));

        // Invariant: totalAssets >= sum of all principals (yield can only increase it)
        assertGe(yieldAgg.totalAssets(), yieldAgg.userPrincipal(USER) + yieldAgg.userPrincipal(USER2));
    }
}
