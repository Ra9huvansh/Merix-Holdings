// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {RedemptionContract} from "../../src/yield/RedemptionContract.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract RedemptionContractTest is Test {
    DeployDSC deployer;
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig config;
    RedemptionContract redemption;
    YieldAggregator yieldAgg;

    address ethUsdPriceFeed;
    address weth;
    uint256 deployerKey;

    address public USER  = makeAddr("user");
    address public USER2 = makeAddr("user2");

    uint256 public constant COLLATERAL   = 10 ether;
    uint256 public constant DSC_TO_MINT  = 2000e18;
    uint256 public constant WETH_RESERVE = 5 ether;

    // Mock ETH price in HelperConfig is $2000 (2000e8 from mock feed)
    // getTokenAmountFromUsd(weth, 2000e18) → 1 ether
    uint256 public constant DSC_FOR_1_WETH = 2000e18;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (ethUsdPriceFeed,, weth,, deployerKey) = config.activeNetworkConfig();

        // Deploy YieldAggregator and RedemptionContract
        yieldAgg  = new YieldAggregator(address(dsc));
        redemption = new RedemptionContract(address(dsc), weth, address(dsce), address(yieldAgg));

        // Register RedemptionContract in DSCEngine
        vm.prank(vm.addr(deployerKey));
        dsce.setRedemptionContract(address(redemption));

        // Register RedemptionContract in YieldAggregator
        yieldAgg.setRedemptionContract(address(redemption));

        // Fund RedemptionContract with WETH
        ERC20Mock(weth).mint(address(this), WETH_RESERVE);
        ERC20Mock(weth).approve(address(redemption), WETH_RESERVE);
        redemption.fund(WETH_RESERVE);

        // Give USER collateral → mint DSC
        ERC20Mock(weth).mint(USER, COLLATERAL);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, DSC_TO_MINT);
        vm.stopPrank();
    }

    // ── Helper: write realizedProfit[user] directly into YieldAggregator storage ──
    // realizedProfit is at slot 6 (Ownable._owner=0, ReentrancyGuard._status=1,
    // totalShares=2, totalAssets=3, userShares=4, userPrincipal=5, realizedProfit=6)
    function _setRealizedProfit(address user, uint256 amount) internal {
        bytes32 slot = keccak256(abi.encode(user, uint256(6)));
        vm.store(address(yieldAgg), slot, bytes32(amount));
    }

    /*//////////////////////////////////////////////////////////////
                            FUND TESTS
    //////////////////////////////////////////////////////////////*/

    function testFundIncreasesWethBalance() public view {
        assertEq(redemption.getWethBalance(), WETH_RESERVE);
    }

    function testFundRevertsIfNotOwner() public {
        ERC20Mock(weth).mint(USER, 1 ether);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(redemption), 1 ether);
        vm.expectRevert();
        redemption.fund(1 ether);
        vm.stopPrank();
    }

    function testFundEmitsEvent() public {
        ERC20Mock(weth).mint(address(this), 1 ether);
        ERC20Mock(weth).approve(address(redemption), 1 ether);
        vm.expectEmit(false, false, false, true);
        emit RedemptionContract.Funded(1 ether);
        redemption.fund(1 ether);
    }

    function testFundAccumulatesMultipleFundings() public {
        ERC20Mock(weth).mint(address(this), 2 ether);
        ERC20Mock(weth).approve(address(redemption), 2 ether);
        redemption.fund(2 ether);
        assertEq(redemption.getWethBalance(), WETH_RESERVE + 2 ether);
    }

    /*//////////////////////////////////////////////////////////////
                        REDEEM TESTS
    //////////////////////////////////////////////////////////////*/

    function testRedeemRevertsIfAmountZero() public {
        vm.prank(USER);
        vm.expectRevert(RedemptionContract.AmountZero.selector);
        redemption.redeemDscForWeth(0);
    }

    function testRedeemRevertsIfExceedsRealizedProfit() public {
        // USER has 0 realized profit — any amount should revert
        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        vm.expectRevert(
            abi.encodeWithSelector(
                RedemptionContract.ExceedsRealizedProfit.selector,
                DSC_FOR_1_WETH,
                0
            )
        );
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();
    }

    function testRedeemRevertsIfInsufficientWeth() public {
        // At $2000/ETH: 12000 DSC → 6 WETH, but reserve is only 5 WETH
        uint256 bigDsc = 12000e18;
        ERC20Mock(weth).mint(USER, 100 ether);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), 100 ether);
        dsce.depositCollateralAndMintDsc(weth, 100 ether, bigDsc);
        vm.stopPrank();

        // Must set realized profit >= bigDsc so the profit check passes
        // and we reach the InsufficientWeth check
        _setRealizedProfit(USER, bigDsc);

        vm.startPrank(USER);
        dsc.approve(address(redemption), bigDsc);
        vm.expectRevert(RedemptionContract.InsufficientWeth.selector);
        redemption.redeemDscForWeth(bigDsc);
        vm.stopPrank();
    }

    function testRedeemBurnsDsc() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);
        uint256 supplyBefore = dsc.totalSupply();

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        assertEq(dsc.totalSupply(), supplyBefore - DSC_FOR_1_WETH);
    }

    function testRedeemDecreasesDscBalance() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);
        uint256 balBefore = dsc.balanceOf(USER);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        assertEq(dsc.balanceOf(USER), balBefore - DSC_FOR_1_WETH);
    }

    function testRedeemIncreasesUserCollateralInEngine() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);
        uint256 expectedWethOut = 1 ether;

        (, uint256 collateralBefore) = dsce.getAccountInformation(USER);
        uint256 wethBefore = dsce.getTokenAmountFromUsd(weth, collateralBefore);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        (, uint256 collateralAfter) = dsce.getAccountInformation(USER);
        uint256 wethAfter = dsce.getTokenAmountFromUsd(weth, collateralAfter);

        assertEq(wethAfter - wethBefore, expectedWethOut);
    }

    function testRedeemDecreasesWethReserve() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);
        uint256 wethBefore = redemption.getWethBalance();

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        assertEq(redemption.getWethBalance(), wethBefore - 1 ether);
    }

    function testRedeemEmitsEvent() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        vm.expectEmit(true, false, false, true);
        emit RedemptionContract.Redeemed(USER, DSC_FOR_1_WETH, 1 ether);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();
    }

    function testRedeemDecrementsRealizedProfit() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        assertEq(yieldAgg.realizedProfit(USER), 0);
    }

    function testRedeemCannotDoubleSpendRealizedProfit() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH * 2);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        // Second redeem should revert — profit already consumed
        vm.expectRevert(
            abi.encodeWithSelector(
                RedemptionContract.ExceedsRealizedProfit.selector,
                DSC_FOR_1_WETH,
                0
            )
        );
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();
    }

    function testRedeemDoesNotModifyDscMintedAccounting() public {
        _setRealizedProfit(USER, DSC_FOR_1_WETH);
        (uint256 dscMintedBefore,) = dsce.getAccountInformation(USER);

        vm.startPrank(USER);
        dsc.approve(address(redemption), DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        (uint256 dscMintedAfter,) = dsce.getAccountInformation(USER);
        assertEq(dscMintedAfter, dscMintedBefore);
    }

    function testMultipleRedemptions() public {
        // Give USER enough realized profit for 2 WETH worth
        _setRealizedProfit(USER, DSC_FOR_1_WETH * 2);

        // Give USER extra DSC for second redemption
        ERC20Mock(weth).mint(USER, COLLATERAL);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, DSC_FOR_1_WETH);

        dsc.approve(address(redemption), DSC_FOR_1_WETH * 2);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        redemption.redeemDscForWeth(DSC_FOR_1_WETH);
        vm.stopPrank();

        assertEq(redemption.getWethBalance(), WETH_RESERVE - 2 ether);
        assertEq(yieldAgg.realizedProfit(USER), 0);
    }

    /*//////////////////////////////////////////////////////////////
                         VIEW TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetWethBalance() public view {
        assertEq(redemption.getWethBalance(), WETH_RESERVE);
    }
}
