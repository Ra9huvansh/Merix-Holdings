// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract YieldAggregatorTest is Test {
    DeployDSC deployer;
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig config;
    YieldAggregator yieldAgg;

    address ethUsdPriceFeed;
    address weth;
    uint256 deployerKey;

    address public USER  = makeAddr("user");
    address public USER2 = makeAddr("user2");

    uint256 public constant COLLATERAL      = 10 ether;
    uint256 public constant DSC_TO_MINT     = 1000e18;
    uint256 public constant DEPOSIT_AMOUNT  = 100e18;
    uint256 public constant YIELD_RESERVE   = 200e18;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (ethUsdPriceFeed,, weth,, deployerKey) = config.activeNetworkConfig();

        // YieldAggregator is owned by this test contract
        yieldAgg = new YieldAggregator(address(dsc));

        // Give USER WETH → deposit collateral → mint DSC
        ERC20Mock(weth).mint(USER, COLLATERAL);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, DSC_TO_MINT);
        vm.stopPrank();

        // Give USER2 WETH → deposit collateral → mint DSC
        ERC20Mock(weth).mint(USER2, COLLATERAL);
        vm.startPrank(USER2);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, DSC_TO_MINT);
        vm.stopPrank();
    }

    // Helper: test contract gets DSC (for funding yield reserve)
    function _mintDscForOwner(uint256 dscAmount) internal {
        ERC20Mock(weth).mint(address(this), COLLATERAL);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, dscAmount);
    }

    modifier userDeposited() {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                          DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testDepositMintsSharesOneToOne() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(yieldAgg.userShares(USER), DEPOSIT_AMOUNT);
        assertEq(yieldAgg.totalShares(), DEPOSIT_AMOUNT);
        assertEq(yieldAgg.totalAssets(), DEPOSIT_AMOUNT);
    }

    function testDepositUpdatesPrincipal() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(yieldAgg.userPrincipal(USER), DEPOSIT_AMOUNT);
    }

    function testDepositUpdatesStrategyTotalDeposited() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(2, DEPOSIT_AMOUNT); // Aave
        vm.stopPrank();

        (,,, uint256 totalDeposited,) = yieldAgg.getStrategy(2);
        assertEq(totalDeposited, DEPOSIT_AMOUNT);
    }

    function testDepositUpdatesUserStrategyDeposited() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(3, DEPOSIT_AMOUNT); // Compound
        vm.stopPrank();

        assertEq(yieldAgg.getUserStrategyDeposited(USER, 3), DEPOSIT_AMOUNT);
    }

    function testDepositTransfersDscToVault() public {
        uint256 vaultBefore = dsc.balanceOf(address(yieldAgg));
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(dsc.balanceOf(address(yieldAgg)), vaultBefore + DEPOSIT_AMOUNT);
    }

    function testDepositRevertsIfInvalidStrategy() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        vm.expectRevert(YieldAggregator.InvalidStrategy.selector);
        yieldAgg.depositToStrategy(99, DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function testDepositRevertsIfAmountZero() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        vm.expectRevert(YieldAggregator.AmountZero.selector);
        yieldAgg.depositToStrategy(0, 0);
        vm.stopPrank();
    }

    function testSecondDepositGetsProportionalShares() public {
        // USER deposits 100 DSC first
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // USER2 deposits same amount in same block (no yield elapsed)
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Equal deposits at same time → equal shares
        assertEq(yieldAgg.userShares(USER), yieldAgg.userShares(USER2));
    }

    function testMultipleStrategyDepositsTrackedSeparately() public {
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT * 2);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(1, DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(yieldAgg.getUserStrategyDeposited(USER, 0), DEPOSIT_AMOUNT);
        assertEq(yieldAgg.getUserStrategyDeposited(USER, 1), DEPOSIT_AMOUNT);
        assertEq(yieldAgg.userPrincipal(USER), DEPOSIT_AMOUNT * 2);
    }

    /*//////////////////////////////////////////////////////////////
                          WITHDRAW TESTS
    //////////////////////////////////////////////////////////////*/

    function testWithdrawReturnsDscToUser() public userDeposited {
        uint256 balanceBefore = dsc.balanceOf(USER);
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT);
        assertEq(dsc.balanceOf(USER), balanceBefore + DEPOSIT_AMOUNT);
    }

    function testWithdrawBurnsShares() public userDeposited {
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT);
        assertEq(yieldAgg.userShares(USER), 0);
        assertEq(yieldAgg.totalShares(), 0);
    }

    function testWithdrawReducesTotalAssets() public userDeposited {
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT);
        assertEq(yieldAgg.totalAssets(), 0);
    }

    function testWithdrawReducesStrategyTotalDeposited() public userDeposited {
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT);
        (,,, uint256 totalDeposited,) = yieldAgg.getStrategy(0);
        assertEq(totalDeposited, 0);
    }

    function testWithdrawNoProfitWithoutYield() public userDeposited {
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT);
        assertEq(yieldAgg.realizedProfit(USER), 0);
    }

    function testWithdrawRevertsIfAmountZero() public userDeposited {
        vm.prank(USER);
        vm.expectRevert(YieldAggregator.AmountZero.selector);
        yieldAgg.withdrawFromStrategy(0, 0);
    }

    function testWithdrawRevertsIfNoStrategyDeposit() public userDeposited {
        vm.prank(USER);
        vm.expectRevert(YieldAggregator.NoStrategyDeposit.selector);
        yieldAgg.withdrawFromStrategy(1, DEPOSIT_AMOUNT); // deposited into strategy 0, not 1
    }

    function testWithdrawRevertsIfInvalidStrategy() public userDeposited {
        vm.prank(USER);
        vm.expectRevert(YieldAggregator.InvalidStrategy.selector);
        yieldAgg.withdrawFromStrategy(99, DEPOSIT_AMOUNT);
    }

    function testWithdrawRevertsIfInsufficientShares() public userDeposited {
        vm.prank(USER);
        vm.expectRevert(YieldAggregator.InsufficientShares.selector);
        yieldAgg.withdrawFromStrategy(0, DEPOSIT_AMOUNT * 2);
    }

    function testWithdrawPartialReturnsCorrectAmount() public userDeposited {
        uint256 balanceBefore = dsc.balanceOf(USER);
        uint256 half = DEPOSIT_AMOUNT / 2;
        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, half);
        assertEq(dsc.balanceOf(USER), balanceBefore + half);
        assertEq(yieldAgg.userPrincipal(USER), half);
    }

    /*//////////////////////////////////////////////////////////////
                          YIELD / HARVEST TESTS
    //////////////////////////////////////////////////////////////*/

    function testTotalAssetsGrowsAfterYieldHarvest() public userDeposited {
        uint256 assetsBefore = yieldAgg.totalAssets();
        vm.warp(block.timestamp + 30 days);

        // Trigger harvest via a new deposit
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), 1e18);
        yieldAgg.depositToStrategy(0, 1e18);
        vm.stopPrank();

        assertGt(yieldAgg.totalAssets(), assetsBefore + 1e18);
    }

    function testSimulatedTotalAssetsExceedsTotalAssetsBeforeHarvest() public userDeposited {
        vm.warp(block.timestamp + 10 days);
        assertGt(yieldAgg.getSimulatedTotalAssets(), yieldAgg.totalAssets());
    }

    function testWithdrawWithProfitAfterOneYear() public {
        // Fund yield reserve (test contract = owner)
        _mintDscForOwner(YIELD_RESERVE);
        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);

        // USER deposits 100 DSC into XAU strategy (4% APY)
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Warp 1 year → yield = 100 * 4% = 4 DSC
        vm.warp(block.timestamp + 365 days);

        // Expected withdraw: 100 principal + 4 yield = 104 DSC
        uint256 expectedWithdraw = DEPOSIT_AMOUNT + (DEPOSIT_AMOUNT * 400) / 10_000;

        vm.prank(USER);
        yieldAgg.withdrawFromStrategy(0, expectedWithdraw);

        assertEq(yieldAgg.realizedProfit(USER), expectedWithdraw - DEPOSIT_AMOUNT);
    }

    function testHigherApyStrategyAccruesMoreYield() public {
        // USER deposits into XAU (4%) and USER2 deposits into Uniswap LP (18%)
        vm.startPrank(USER);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(0, DEPOSIT_AMOUNT); // XAU 4%
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        // Peek at accrued yield per strategy after harvest (triggered by USER2 deposit)
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), DEPOSIT_AMOUNT);
        yieldAgg.depositToStrategy(4, DEPOSIT_AMOUNT); // Uniswap 18%
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        // Trigger harvest for strategy 4 via another deposit
        vm.startPrank(USER2);
        dsc.approve(address(yieldAgg), 1e18);
        yieldAgg.depositToStrategy(4, 1e18);
        vm.stopPrank();

        (,,,, uint256 xauAccrued)      = yieldAgg.getStrategy(0);
        (,,,, uint256 uniswapAccrued)  = yieldAgg.getStrategy(4);

        assertGt(uniswapAccrued, xauAccrued);
    }

    /*//////////////////////////////////////////////////////////////
                       FUND YIELD RESERVE TESTS
    //////////////////////////////////////////////////////////////*/

    function testFundYieldReserveIncreasesVaultBalance() public {
        _mintDscForOwner(YIELD_RESERVE);
        uint256 balanceBefore = dsc.balanceOf(address(yieldAgg));
        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);
        assertEq(dsc.balanceOf(address(yieldAgg)), balanceBefore + YIELD_RESERVE);
    }

    function testFundYieldReserveDoesNotMintShares() public {
        _mintDscForOwner(YIELD_RESERVE);
        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);

        assertEq(yieldAgg.totalShares(), 0);
        assertEq(yieldAgg.totalAssets(), 0);
    }

    function testFundYieldReserveRevertsIfNotOwner() public {
        vm.prank(USER);
        vm.expectRevert();
        yieldAgg.fundYieldReserve(100e18);
    }

    function testFundYieldReserveEmitsEvent() public {
        _mintDscForOwner(YIELD_RESERVE);
        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        vm.expectEmit(false, false, false, true);
        emit YieldAggregator.YieldReserveFunded(YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetStrategyCountIsfive() public view {
        assertEq(yieldAgg.getStrategyCount(), 5);
    }

    function testGetStrategyReturnsCorrectData() public view {
        (string memory name, string memory riskLevel, uint256 apyBps,,) = yieldAgg.getStrategy(0);
        assertEq(name, "XAU (Gold)");
        assertEq(riskLevel, "Low");
        assertEq(apyBps, 400);
    }

    function testGetStrategyApyValues() public view {
        (, ,uint256 apy0,,) = yieldAgg.getStrategy(0); // XAU
        (, ,uint256 apy1,,) = yieldAgg.getStrategy(1); // XAG
        (, ,uint256 apy2,,) = yieldAgg.getStrategy(2); // Aave
        (, ,uint256 apy3,,) = yieldAgg.getStrategy(3); // Compound
        (, ,uint256 apy4,,) = yieldAgg.getStrategy(4); // Uniswap
        assertEq(apy0, 400);
        assertEq(apy1, 300);
        assertEq(apy2, 500);
        assertEq(apy3, 600);
        assertEq(apy4, 1800);
    }

    function testGetUserInfoZeroForNewUser() public view {
        (uint256 shares, uint256 principal, uint256 realizedPft, uint256 currentValue) =
            yieldAgg.getUserInfo(USER);
        assertEq(shares, 0);
        assertEq(principal, 0);
        assertEq(realizedPft, 0);
        assertEq(currentValue, 0);
    }

    function testGetUserInfoAfterDeposit() public userDeposited {
        (uint256 shares, uint256 principal,, uint256 currentValue) = yieldAgg.getUserInfo(USER);
        assertEq(shares, DEPOSIT_AMOUNT);
        assertEq(principal, DEPOSIT_AMOUNT);
        assertEq(currentValue, DEPOSIT_AMOUNT); // no yield harvested yet
    }

    function testGetUserStrategyDepositedTracksCorrectly() public userDeposited {
        assertEq(yieldAgg.getUserStrategyDeposited(USER, 0), DEPOSIT_AMOUNT);
        assertEq(yieldAgg.getUserStrategyDeposited(USER, 1), 0);
    }

    function testGetVaultDscBalance() public userDeposited {
        assertEq(yieldAgg.getVaultDscBalance(), DEPOSIT_AMOUNT);
    }

    function testGetSimulatedTotalAssetsEqualsRealWhenNoYield() public userDeposited {
        // At exact same timestamp, no elapsed → simulated == real
        assertEq(yieldAgg.getSimulatedTotalAssets(), yieldAgg.totalAssets());
    }
}
