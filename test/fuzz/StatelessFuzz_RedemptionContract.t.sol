// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {RedemptionContract} from "../../src/yield/RedemptionContract.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract StatelessFuzz_RedemptionContract is Test {
    DeployDSC deployer;
    DSCEngine dsce;
    DecentralizedStableCoin dsc;
    RedemptionContract redemption;
    YieldAggregator yieldAgg;
    HelperConfig config;

    address weth;
    uint256 deployerKey;

    address USER = makeAddr("user");

    // Mock ETH price = $2000 → 1 WETH = 2000 DSC
    uint256 constant ETH_PRICE_USD  = 2000e18; // in 18-decimal USD
    uint256 constant WETH_RESERVE   = 20 ether;
    uint256 constant USER_COLLATERAL = 100 ether;
    uint256 constant USER_DSC_MINT  = 5000e18;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (,, weth,, deployerKey) = config.activeNetworkConfig();

        yieldAgg  = new YieldAggregator(address(dsc));
        redemption = new RedemptionContract(address(dsc), weth, address(dsce), address(yieldAgg));

        // Wire up contracts
        vm.prank(vm.addr(deployerKey));
        dsce.setRedemptionContract(address(redemption));
        yieldAgg.setRedemptionContract(address(redemption));

        // Fund redemption contract with WETH reserve
        ERC20Mock(weth).mint(address(this), WETH_RESERVE);
        ERC20Mock(weth).approve(address(redemption), WETH_RESERVE);
        redemption.fund(WETH_RESERVE);

        // Give USER enough DSC to redeem with
        ERC20Mock(weth).mint(USER, USER_COLLATERAL);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), USER_COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, USER_COLLATERAL, USER_DSC_MINT);
        vm.stopPrank();
    }

    // Write realized profit directly into YieldAggregator storage slot 6
    function _setRealizedProfit(address user, uint256 amount) internal {
        bytes32 slot = keccak256(abi.encode(user, uint256(6)));
        vm.store(address(yieldAgg), slot, bytes32(amount));
    }

    /*//////////////////////////////////////////////////////////////
                        27. testFuzz_Fund
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Fund(uint256 wethAmount) public {
        wethAmount = bound(wethAmount, 1, 100 ether);

        ERC20Mock(weth).mint(address(this), wethAmount);
        ERC20Mock(weth).approve(address(redemption), wethAmount);

        uint256 balBefore = redemption.getWethBalance();
        redemption.fund(wethAmount);

        assertEq(redemption.getWethBalance(), balBefore + wethAmount);
    }

    /*//////////////////////////////////////////////////////////////
                    28. testFuzz_RedeemDscForWeth
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemDscForWeth(uint256 dscAmount) public {
        // Max redeemable: what the WETH_RESERVE can cover at $2000/ETH
        // WETH_RESERVE = 20 ether → max DSC = 20 * 2000 = 40_000e18
        // But USER only has USER_DSC_MINT = 5000e18, so cap there
        dscAmount = bound(dscAmount, 1e18, USER_DSC_MINT);

        // Ensure redemption contract has enough WETH
        uint256 wethOut = dsce.getTokenAmountFromUsd(weth, dscAmount);
        vm.assume(wethOut > 0 && wethOut <= redemption.getWethBalance());

        _setRealizedProfit(USER, dscAmount);

        uint256 supplyBefore   = dsc.totalSupply();
        uint256 collBefore     = dsce.getCollateralBalanceOfUser(weth, USER);
        uint256 reserveBefore  = redemption.getWethBalance();

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        // DSC supply burned
        assertEq(dsc.totalSupply(), supplyBefore - dscAmount);
        // User collateral in DSCEngine increased by wethOut
        assertEq(dsce.getCollateralBalanceOfUser(weth, USER), collBefore + wethOut);
        // WETH reserve decreased by wethOut
        assertEq(redemption.getWethBalance(), reserveBefore - wethOut);
        // Realized profit consumed
        assertEq(yieldAgg.realizedProfit(USER), 0);
    }

    /*//////////////////////////////////////////////////////////////
                29. testFuzz_RedeemExceedsProfit_Reverts
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemExceedsProfit_Reverts(uint256 profit, uint256 redeemAmount) public {
        profit       = bound(profit,       0,           USER_DSC_MINT - 1);
        redeemAmount = bound(redeemAmount, profit + 1,  USER_DSC_MINT);

        _setRealizedProfit(USER, profit);

        vm.startPrank(USER);
        dsc.approve(address(redemption), redeemAmount);
        vm.expectRevert(
            abi.encodeWithSelector(RedemptionContract.ExceedsRealizedProfit.selector, redeemAmount, profit)
        );
        redemption.redeemDscForWeth(redeemAmount);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                30. testFuzz_RedeemWethMathIsCorrect
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemWethMathIsCorrect(uint256 dscAmount) public {
        dscAmount = bound(dscAmount, 1e18, USER_DSC_MINT);

        uint256 expectedWethOut = dsce.getTokenAmountFromUsd(weth, dscAmount);
        vm.assume(expectedWethOut > 0 && expectedWethOut <= redemption.getWethBalance());

        _setRealizedProfit(USER, dscAmount);

        uint256 collBefore = dsce.getCollateralBalanceOfUser(weth, USER);

        vm.startPrank(USER);
        dsc.approve(address(redemption), dscAmount);
        redemption.redeemDscForWeth(dscAmount);
        vm.stopPrank();

        // The exact WETH added to collateral must match getTokenAmountFromUsd
        assertEq(dsce.getCollateralBalanceOfUser(weth, USER) - collBefore, expectedWethOut);
    }
}
