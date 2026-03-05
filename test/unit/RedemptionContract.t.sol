// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {RedemptionContract} from "../../src/yield/RedemptionContract.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract RedemptionContractTest is Test {
    DeployDSC deployer;
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig config;
    RedemptionContract redemption;

    address ethUsdPriceFeed;
    address weth;
    uint256 deployerKey;

    address public USER  = makeAddr("user");
    address public USER2 = makeAddr("user2");

    uint256 public constant COLLATERAL    = 10 ether;
    uint256 public constant DSC_TO_MINT   = 2000e18; // $2000 worth of DSC
    uint256 public constant WETH_RESERVE  = 5 ether;
    uint256 public constant ETH_PRICE_USD = 2000;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (ethUsdPriceFeed,, weth,, deployerKey) = config.activeNetworkConfig();

        // Deploy RedemptionContract — test contract is owner
        redemption = new RedemptionContract(address(dsc), weth, address(dsce));

        // Register RedemptionContract in DSCEngine (owner = vm.addr(deployerKey))
        vm.prank(vm.addr(deployerKey));
        dsce.setRedemptionContract(address(redemption));

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

    function testRedeemRevertsIfDscTooSmall() public {
        // wethOut = dscAmount / ethPriceUsd (no 1e18 scaling on price)
        // wethOut == 0 when dscAmount < ethPriceUsd (2000 raw units = 2000 wei)
        vm.startPrank(USER);
        dsc.approve(address(redemption), 1999);
        vm.expectRevert(RedemptionContract.DscAmountTooSmall.selector);
        redemption.redeemDscForWeth(1999);
        vm.stopPrank();
    }

    function testRedeemRevertsIfInsufficientWeth() public {
        // Need dscAmount such that wethOut > WETH_RESERVE (5 WETH)
        // wethOut = dscAmount / 2000, so dscAmount > 5e18 * 2000 = 10000e18
        uint256 bigDsc = 12000e18; // → wethOut = 6 WETH > 5 WETH reserve
        ERC20Mock(weth).mint(USER, 100 ether);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), 100 ether);
        dsce.depositCollateralAndMintDsc(weth, 100 ether, bigDsc);
        dsc.approve(address(redemption), bigDsc);
        vm.expectRevert(RedemptionContract.InsufficientWeth.selector);
        redemption.redeemDscForWeth(bigDsc);
        vm.stopPrank();
    }

    function testRedeemBurnsDsc() public {
        uint256 dscAmount   = 2000e18; // exactly 1 WETH worth
        uint256 supplyBefore = dsc.totalSupply();

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        assertEq(dsc.totalSupply(), supplyBefore - dscAmount);
    }

    function testRedeemDecreasesDscBalance() public {
        uint256 dscAmount   = 2000e18;
        uint256 balBefore   = dsc.balanceOf(USER);

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        assertEq(dsc.balanceOf(USER), balBefore - dscAmount);
    }

    function testRedeemIncreasesUserCollateralInEngine() public {
        uint256 dscAmount = 2000e18; // 1 WETH
        uint256 expectedWethOut = 1 ether;

        (, uint256 collateralBefore) = dsce.getAccountInformation(USER);
        uint256 wethBefore = dsce.getTokenAmountFromUsd(weth, collateralBefore);

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        (, uint256 collateralAfter) = dsce.getAccountInformation(USER);
        uint256 wethAfter = dsce.getTokenAmountFromUsd(weth, collateralAfter);

        assertEq(wethAfter - wethBefore, expectedWethOut);
    }

    function testRedeemDecreasesWethReserve() public {
        uint256 dscAmount  = 2000e18;
        uint256 wethBefore = redemption.getWethBalance();

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        assertEq(redemption.getWethBalance(), wethBefore - 1 ether);
    }

    function testRedeemEmitsEvent() public {
        uint256 dscAmount = 2000e18;

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        vm.expectEmit(true, false, false, true);
        emit RedemptionContract.Redeemed(USER, dscAmount, 1 ether);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();
    }

    function testRedeemDoesNotModifyDscMintedAccounting() public {
        uint256 dscAmount = 2000e18;
        (uint256 dscMintedBefore,) = dsce.getAccountInformation(USER);

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        // burnExternal does NOT change s_DSCMinted for USER
        (uint256 dscMintedAfter,) = dsce.getAccountInformation(USER);
        assertEq(dscMintedAfter, dscMintedBefore);
    }

    function testMultipleRedemptions() public {
        uint256 dscAmount = 2000e18;

        // Give USER extra DSC for second redemption (they only got 2000 in setUp)
        ERC20Mock(weth).mint(USER, COLLATERAL);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, COLLATERAL, dscAmount);

        // Two redemptions of 2000 DSC each → 2 WETH collateral added
        dsc.approve(address(redemption), dscAmount * 2);
        redemption.redeemDscForWeth(dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        assertEq(redemption.getWethBalance(), WETH_RESERVE - 2 ether);
    }

    /*//////////////////////////////////////////////////////////////
                       SET ETH PRICE TESTS
    //////////////////////////////////////////////////////////////*/

    function testSetEthPriceUpdatesValue() public {
        redemption.setEthPrice(3000);
        assertEq(redemption.ethPriceUsd(), 3000);
    }

    function testSetEthPriceRevertsIfNotOwner() public {
        vm.prank(USER);
        vm.expectRevert();
        redemption.setEthPrice(3000);
    }

    function testSetEthPriceAffectsWethOut() public {
        redemption.setEthPrice(4000);
        // 4000 DSC → 1 WETH at $4000/ETH
        assertEq(redemption.getWethOut(4000e18), 1 ether);
    }

    function testSetEthPriceEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit RedemptionContract.EthPriceUpdated(3000);
        redemption.setEthPrice(3000);
    }

    /*//////////////////////////////////////////////////////////////
                         VIEW TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetWethOutAtDefaultPrice() public view {
        // 2000 DSC → 1 WETH at $2000/ETH
        assertEq(redemption.getWethOut(2000e18), 1 ether);
    }

    function testGetWethOutPartialEth() public view {
        // 4000 DSC → 2 WETH at $2000/ETH
        assertEq(redemption.getWethOut(4000e18), 2 ether);
    }

    function testGetWethBalance() public view {
        assertEq(redemption.getWethBalance(), WETH_RESERVE);
    }

    function testInitialEthPrice() public view {
        assertEq(redemption.ethPriceUsd(), ETH_PRICE_USD);
    }
}
