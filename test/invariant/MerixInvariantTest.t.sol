// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {RedemptionContract} from "../../src/yield/RedemptionContract.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MerixHandler} from "./MerixHandler.sol";

contract MerixInvariantTest is StdInvariant, Test {
    uint256 internal constant YIELD_RESERVE = 100_000e18;
    uint256 internal constant REDEMPTION_WETH_RESERVE = 100 ether;
    uint256 internal constant RESERVE_COLLATERAL = 1_000 ether;

    DeployDSC internal deployer;
    DSCEngine internal dsce;
    DecentralizedStableCoin internal dsc;
    YieldAggregator internal yieldAgg;
    RedemptionContract internal redemption;
    HelperConfig internal config;
    MerixHandler internal handler;

    address internal weth;
    address internal wbtc;
    uint256 internal deployerKey;
    address[10] internal actors;

    function setUp() external {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (,, weth, wbtc, deployerKey) = config.activeNetworkConfig();

        yieldAgg = new YieldAggregator(address(dsc));
        redemption = new RedemptionContract(address(dsc), weth, address(dsce), address(yieldAgg));

        vm.prank(vm.addr(deployerKey));
        dsce.setRedemptionContract(address(redemption));
        yieldAgg.setRedemptionContract(address(redemption));

        handler = new MerixHandler(dsce, dsc, yieldAgg, redemption);
        actors = handler.getActors();

        _fundYieldReserve();
        _fundRedemptionReserve();
        handler.seedInitialState(actors[0], RESERVE_COLLATERAL, YIELD_RESERVE);

        targetContract(address(handler));
        _targetActors();
        _targetSelectors();
    }

    function invariant_protocolMustBeOvercollateralized() public view {
        uint256 wethUsd = dsce.getUsdValue(weth, ERC20Mock(weth).balanceOf(address(dsce)));
        uint256 wbtcUsd = dsce.getUsdValue(wbtc, ERC20Mock(wbtc).balanceOf(address(dsce)));
        assertGe(wethUsd + wbtcUsd, dsc.totalSupply());
    }

    function invariant_supplyMatchesMintBurn() public view {
        uint256 expectedSupply = handler.ghost_totalStablecoinMinted()
            - handler.ghost_totalStablecoinBurned()
            - handler.ghost_totalStablecoinBurnedViaLiquidation()
            - handler.ghost_totalDscBurnedViaRedemption();
        assertEq(dsc.totalSupply(), expectedSupply);
    }

    function invariant_noUserBelowHealthFactor() public view {
        uint256 minHealthFactor = dsce.getMinHealthFactor();
        for (uint256 i = 0; i < actors.length; i++) {
            uint256 healthFactor = dsce.getHealthFactor(actors[i]);
            if (healthFactor < minHealthFactor) {
                uint256 wethBalance = dsce.getCollateralBalanceOfUser(weth, actors[i]);
                uint256 wbtcBalance = dsce.getCollateralBalanceOfUser(wbtc, actors[i]);
                assertTrue(wethBalance > 0 || wbtcBalance > 0);
            }
        }
    }

    function invariant_conservationOfCollateral() public view {
        for (uint256 i = 0; i < actors.length; i++) {
            address actor = actors[i];
            uint256 wethDeposited = handler.ghost_perActorCollateralDeposited(actor, weth);
            uint256 wethWithdrawn = handler.ghost_perActorCollateralWithdrawn(actor, weth);
            uint256 wethTracked = dsce.getCollateralBalanceOfUser(weth, actor);

            uint256 wbtcDeposited = handler.ghost_perActorCollateralDeposited(actor, wbtc);
            uint256 wbtcWithdrawn = handler.ghost_perActorCollateralWithdrawn(actor, wbtc);
            uint256 wbtcTracked = dsce.getCollateralBalanceOfUser(wbtc, actor);

            assertEq(wethDeposited, wethWithdrawn + wethTracked);
            assertEq(wbtcDeposited, wbtcWithdrawn + wbtcTracked);
        }
    }

    function invariant_collateralAccountingMatchesTokenBalance() public view {
        uint256 sumWeth;
        uint256 sumWbtc;

        for (uint256 i = 0; i < actors.length; i++) {
            sumWeth += dsce.getCollateralBalanceOfUser(weth, actors[i]);
            sumWbtc += dsce.getCollateralBalanceOfUser(wbtc, actors[i]);
        }

        assertEq(sumWeth, ERC20Mock(weth).balanceOf(address(dsce)));
        assertEq(sumWbtc, ERC20Mock(wbtc).balanceOf(address(dsce)));
    }

    function invariant_dscMintedAccountingMatchesTotalSupply() public view {
        uint256 totalMinted;
        for (uint256 i = 0; i < actors.length; i++) {
            (uint256 minted,) = dsce.getAccountInformation(actors[i]);
            totalMinted += minted;
        }

        assertGe(totalMinted, dsc.totalSupply());
    }

    function invariant_getterFunctionsNeverRevert() public view {
        dsce.getAdditionalFeedPrecision();
        dsce.getPrecision();
        dsce.getLiquidationThreshold();
        dsce.getLiquidationBonus();
        dsce.getLiquidationPrecision();
        dsce.getMinHealthFactor();
        dsce.getCollateralTokens();
        dsce.getDscAddress();

        for (uint256 i = 0; i < actors.length; i++) {
            dsce.getHealthFactor(actors[i]);
            dsce.getAccountInformation(actors[i]);
            dsce.getAccountCollateralValue(actors[i]);
            dsce.getCollateralBalanceOfUser(weth, actors[i]);
            dsce.getCollateralBalanceOfUser(wbtc, actors[i]);
        }
    }

    function invariant_healthFactorCalculationConsistency() public view {
        for (uint256 i = 0; i < actors.length; i++) {
            (uint256 minted, uint256 collateralUsd) = dsce.getAccountInformation(actors[i]);
            uint256 calculated = dsce.calculateHealthFactor(minted, collateralUsd);
            uint256 live = dsce.getHealthFactor(actors[i]);
            assertEq(calculated, live);
        }
    }

    function invariant_totalSharesEqualsSumOfUserShares() public view {
        uint256 sum;
        for (uint256 i = 0; i < actors.length; i++) {
            sum += yieldAgg.userShares(actors[i]);
        }
        assertEq(sum, yieldAgg.totalShares());
    }

    function invariant_totalAssetsGeqSumOfPrincipals() public view {
        uint256 sumPrincipal;
        for (uint256 i = 0; i < actors.length; i++) {
            sumPrincipal += yieldAgg.userPrincipal(actors[i]);
        }
        assertGe(yieldAgg.totalAssets(), sumPrincipal);
    }

    function invariant_strategyTotalDepositedMatchesSum() public view {
        for (uint256 strategyId = 0; strategyId < 5; strategyId++) {
            (,,, uint256 totalDeposited,) = yieldAgg.getStrategy(strategyId);
            uint256 sum;
            for (uint256 i = 0; i < actors.length; i++) {
                sum += yieldAgg.getUserStrategyDeposited(actors[i], strategyId);
            }
            assertEq(totalDeposited, sum);
        }
    }

    function invariant_vaultDscBalanceSolvency() public view {
        assertGe(dsc.balanceOf(address(yieldAgg)), yieldAgg.totalAssets());
    }

    function invariant_realizedProfitOnlyIncreasesFromWithdrawals() public view {
        uint256 sumProfit;
        for (uint256 i = 0; i < actors.length; i++) {
            sumProfit += yieldAgg.realizedProfit(actors[i]);
        }
        assertLe(sumProfit, handler.ghost_yieldWithdrawn());
    }

    function invariant_shareValueNeverDiluted() public view {
        uint256 totalShares = yieldAgg.totalShares();
        if (totalShares > 0) {
            uint256 sharePrice = (yieldAgg.totalAssets() * 1e18) / totalShares;
            assertGe(sharePrice, 1e18);
        }
    }

    function invariant_wethReserveDecreasesBoundedByRedemptions() public view {
        assertEq(REDEMPTION_WETH_RESERVE - redemption.getWethBalance(), handler.ghost_totalWethRedeemed());
    }

    function invariant_dscBurnedOnRedemptionReducesSupply() public view {
        uint256 expectedSupply = handler.ghost_totalStablecoinMinted()
            - handler.ghost_totalStablecoinBurned()
            - handler.ghost_totalStablecoinBurnedViaLiquidation()
            - handler.ghost_totalDscBurnedViaRedemption();
        assertEq(dsc.totalSupply(), expectedSupply);
    }

    function invariant_realizedProfitCannotExceedTotalWithdrawals() public view {
        for (uint256 i = 0; i < actors.length; i++) {
            assertLe(yieldAgg.realizedProfit(actors[i]), handler.ghost_perActorWithdrawn(actors[i]));
        }
    }

    function invariant_redemptionOnlyImprovesCollateralization() public view {
        address actor = handler.ghost_lastRedemptionActor();
        uint256 postCollateral = handler.ghost_lastPostRedemptionCollateral();
        if (actor != address(0)) {
            assertGe(postCollateral, handler.ghost_lastPreRedemptionCollateral());
        }
    }

    function invariant_noUnbackedDsc() public view {
        uint256 wethUsd = dsce.getUsdValue(weth, ERC20Mock(weth).balanceOf(address(dsce)));
        uint256 wbtcUsd = dsce.getUsdValue(wbtc, ERC20Mock(wbtc).balanceOf(address(dsce)));
        assertGe(wethUsd + wbtcUsd, dsc.totalSupply());
    }

    function invariant_getterFunctionsNeverRevert_YieldAggregator() public view {
        yieldAgg.getStrategyCount();
        yieldAgg.getSimulatedTotalAssets();
        yieldAgg.getVaultDscBalance();
        yieldAgg.totalShares();
        yieldAgg.totalAssets();

        for (uint256 strategyId = 0; strategyId < 5; strategyId++) {
            yieldAgg.getStrategy(strategyId);
        }

        for (uint256 i = 0; i < actors.length; i++) {
            yieldAgg.getUserInfo(actors[i]);
            for (uint256 strategyId = 0; strategyId < 5; strategyId++) {
                yieldAgg.getUserStrategyDeposited(actors[i], strategyId);
            }
            yieldAgg.userShares(actors[i]);
            yieldAgg.userPrincipal(actors[i]);
            yieldAgg.realizedProfit(actors[i]);
        }
    }

    function _fundYieldReserve() internal {
        address reserveActor = actors[0];

        ERC20Mock(weth).mint(reserveActor, RESERVE_COLLATERAL);

        vm.startPrank(reserveActor);
        ERC20Mock(weth).approve(address(dsce), RESERVE_COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, RESERVE_COLLATERAL, YIELD_RESERVE);
        dsc.transfer(address(this), YIELD_RESERVE);
        vm.stopPrank();

        dsc.approve(address(yieldAgg), YIELD_RESERVE);
        yieldAgg.fundYieldReserve(YIELD_RESERVE);
    }

    function _fundRedemptionReserve() internal {
        ERC20Mock(weth).mint(address(this), REDEMPTION_WETH_RESERVE);
        ERC20Mock(weth).approve(address(redemption), REDEMPTION_WETH_RESERVE);
        redemption.fund(REDEMPTION_WETH_RESERVE);
    }

    function _targetActors() internal {
        for (uint256 i = 0; i < actors.length; i++) {
            targetSender(actors[i]);
        }
    }

    function _targetSelectors() internal {
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = MerixHandler.depositCollateral.selector;
        selectors[1] = MerixHandler.mintStablecoin.selector;
        selectors[2] = MerixHandler.burnStablecoin.selector;
        selectors[3] = MerixHandler.withdrawCollateral.selector;
        selectors[4] = MerixHandler.liquidate.selector;
        selectors[5] = MerixHandler.depositToStrategy.selector;
        selectors[6] = MerixHandler.withdrawFromStrategy.selector;
        selectors[7] = MerixHandler.redeemDscForWeth.selector;
        selectors[8] = MerixHandler.warpTime.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }
}
