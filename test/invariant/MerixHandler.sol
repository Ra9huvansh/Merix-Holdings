// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {YieldAggregator} from "../../src/yield/YieldAggregator.sol";
import {RedemptionContract} from "../../src/yield/RedemptionContract.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MockV3Aggregator} from "../mocks/MockV3Aggregator.sol";

contract MerixHandler is Test {
    DSCEngine public immutable dsce;
    DecentralizedStableCoin public immutable dsc;
    YieldAggregator public immutable yieldAgg;
    RedemptionContract public immutable redemption;

    ERC20Mock public immutable weth;
    ERC20Mock public immutable wbtc;
    MockV3Aggregator public immutable wethUsdPriceFeed;
    MockV3Aggregator public immutable wbtcUsdPriceFeed;

    address[10] internal s_actors;
    address public currentActor;

    uint256 public ghost_totalCollateralDeposited;
    uint256 public ghost_totalStablecoinMinted;
    uint256 public ghost_totalStablecoinBurned;
    uint256 public ghost_totalStablecoinBurnedViaLiquidation;
    uint256 public ghost_totalCollateralWithdrawn;
    uint256 public ghost_yieldDeposited;
    uint256 public ghost_yieldWithdrawn;
    uint256 public ghost_totalWethRedeemed;
    uint256 public ghost_totalDscBurnedViaRedemption;

    mapping(address => mapping(address => uint256)) public ghost_perActorCollateralDeposited;
    mapping(address => mapping(address => uint256)) public ghost_perActorCollateralWithdrawn;
    mapping(address => uint256) public ghost_perActorDscMinted;
    mapping(address => uint256) public ghost_perActorWithdrawn;

    address public ghost_lastRedemptionActor;
    uint256 public ghost_lastPreRedemptionCollateral;
    uint256 public ghost_lastPostRedemptionCollateral;

    modifier useActor(uint256 seed) {
        currentActor = s_actors[seed % s_actors.length];
        vm.startPrank(currentActor);
        _;
        vm.stopPrank();
    }

    constructor(
        DSCEngine _dsce,
        DecentralizedStableCoin _dsc,
        YieldAggregator _yieldAgg,
        RedemptionContract _redemption
    ) {
        dsce = _dsce;
        dsc = _dsc;
        yieldAgg = _yieldAgg;
        redemption = _redemption;

        address[] memory collateralTokens = dsce.getCollateralTokens();
        weth = ERC20Mock(collateralTokens[0]);
        wbtc = ERC20Mock(collateralTokens[1]);
        wethUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(address(weth)));
        wbtcUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(address(wbtc)));

        for (uint256 i = 0; i < s_actors.length; i++) {
            s_actors[i] = makeAddr(string(abi.encodePacked("actor-", vm.toString(i))));
            vm.deal(s_actors[i], 100 ether);
        }
    }

    function getActors() external view returns (address[10] memory) {
        return s_actors;
    }

    function seedInitialState(address actor, uint256 wethCollateral, uint256 mintedDsc) external {
        ghost_totalCollateralDeposited += wethCollateral;
        ghost_totalStablecoinMinted += mintedDsc;
        ghost_perActorCollateralDeposited[actor][address(weth)] += wethCollateral;
        ghost_perActorDscMinted[actor] += mintedDsc;
    }

    function depositCollateral(uint256 actorSeed, uint256 collateralSeed, uint256 amount) external useActor(actorSeed) {
        ERC20Mock token = _getCollateralTokenFromSeed(collateralSeed);
        amount = bound(amount, 1, type(uint96).max);

        token.mint(currentActor, amount);
        token.approve(address(dsce), amount);
        dsce.depositCollateral(address(token), amount);

        ghost_totalCollateralDeposited += amount;
        ghost_perActorCollateralDeposited[currentActor][address(token)] += amount;
    }

    function mintStablecoin(uint256 actorSeed, uint256 amount) external useActor(actorSeed) {
        amount = bound(amount, 1, type(uint96).max);

        (uint256 currentMinted, uint256 collateralUsd) = dsce.getAccountInformation(currentActor);
        uint256 maxMintable = collateralUsd / 2;
        if (maxMintable <= currentMinted) {
            return;
        }
        maxMintable -= currentMinted;
        amount = bound(amount, 1, maxMintable);

        dsce.mintDsc(amount);

        ghost_totalStablecoinMinted += amount;
        ghost_perActorDscMinted[currentActor] += amount;
    }

    function burnStablecoin(uint256 actorSeed, uint256 amount) external useActor(actorSeed) {
        uint256 balance = dsc.balanceOf(currentActor);
        if (balance == 0) {
            return;
        }

        amount = bound(amount, 1, balance);
        dsc.approve(address(dsce), amount);
        dsce.burnDsc(amount);

        ghost_totalStablecoinBurned += amount;
    }

    function withdrawCollateral(uint256 actorSeed, uint256 collateralSeed, uint256 amount) external useActor(actorSeed) {
        ERC20Mock token = _getCollateralTokenFromSeed(collateralSeed);
        uint256 balance = dsce.getCollateralBalanceOfUser(address(token), currentActor);
        if (balance == 0) {
            return;
        }

        amount = bound(amount, 1, balance);

        (uint256 minted, uint256 collateralUsd) = dsce.getAccountInformation(currentActor);
        uint256 redemptionUsd = dsce.getUsdValue(address(token), amount);
        uint256 newCollateralUsd = collateralUsd - redemptionUsd;
        uint256 newHealthFactor = dsce.calculateHealthFactor(minted, newCollateralUsd);
        if (newHealthFactor < dsce.getMinHealthFactor()) {
            return;
        }

        dsce.redeemCollateral(address(token), amount);

        ghost_totalCollateralWithdrawn += amount;
        ghost_perActorCollateralWithdrawn[currentActor][address(token)] += amount;
    }

    function liquidate(uint256 actorSeed, uint256 collateralSeed, uint256 debtSeed, uint256 actorIndexSeed)
        external
        useActor(actorSeed)
    {
        address targetActor = s_actors[actorIndexSeed % s_actors.length];
        if (targetActor == currentActor) {
            return;
        }

        uint256 healthFactor = dsce.getHealthFactor(targetActor);
        if (healthFactor >= dsce.getMinHealthFactor()) {
            return;
        }

        ERC20Mock token = _getCollateralTokenFromSeed(collateralSeed);
        uint256 targetCollateral = dsce.getCollateralBalanceOfUser(address(token), targetActor);
        if (targetCollateral == 0) {
            return;
        }

        (uint256 targetMinted,) = dsce.getAccountInformation(targetActor);
        if (targetMinted == 0) {
            return;
        }

        uint256 collateralUsd = dsce.getUsdValue(address(token), targetCollateral);
        uint256 maxDebtByCollateral = (collateralUsd * dsce.getLiquidationPrecision())
            / (dsce.getLiquidationPrecision() + dsce.getLiquidationBonus());
        uint256 maxDebtToCover = targetMinted < maxDebtByCollateral ? targetMinted : maxDebtByCollateral;
        if (maxDebtToCover == 0) {
            return;
        }

        uint256 debtToCover = bound(debtSeed, 1, maxDebtToCover);
        _ensureCurrentActorHasDsc(debtToCover);

        dsc.approve(address(dsce), debtToCover);
        dsce.liquidate(address(token), targetActor, debtToCover);

        uint256 collateralFromDebt = dsce.getTokenAmountFromUsd(address(token), debtToCover);
        uint256 bonusCollateral =
            (collateralFromDebt * dsce.getLiquidationBonus()) / dsce.getLiquidationPrecision();
        uint256 totalCollateralRedeemed = collateralFromDebt + bonusCollateral;

        ghost_totalStablecoinBurnedViaLiquidation += debtToCover;
        ghost_totalCollateralWithdrawn += totalCollateralRedeemed;
        ghost_perActorCollateralWithdrawn[targetActor][address(token)] += totalCollateralRedeemed;
    }

    function depositToStrategy(uint256 actorSeed, uint256 stratSeed, uint256 amount) external useActor(actorSeed) {
        uint256 strategyId = stratSeed % 5;
        uint256 balance = dsc.balanceOf(currentActor);
        if (balance < 1e18) {
            return;
        }

        uint256 maxAmount = balance < 1000e18 ? balance : 1000e18;
        amount = bound(amount, 1e18, maxAmount);

        dsc.approve(address(yieldAgg), amount);
        yieldAgg.depositToStrategy(strategyId, amount);

        ghost_yieldDeposited += amount;
    }

    function withdrawFromStrategy(uint256 actorSeed, uint256 stratSeed, uint256 amount) external useActor(actorSeed) {
        uint256 strategyId = stratSeed % 5;
        uint256 deposited = yieldAgg.getUserStrategyDeposited(currentActor, strategyId);
        if (deposited == 0) {
            return;
        }

        amount = bound(amount, 1, deposited);
        yieldAgg.withdrawFromStrategy(strategyId, amount);

        ghost_yieldWithdrawn += amount;
        ghost_perActorWithdrawn[currentActor] += amount;
    }

    function redeemDscForWeth(uint256 actorSeed, uint256 amount) external useActor(actorSeed) {
        uint256 profit = yieldAgg.realizedProfit(currentActor);
        if (profit == 0) {
            return;
        }

        amount = bound(amount, 1, profit);
        uint256 wethOut = dsce.getTokenAmountFromUsd(address(weth), amount);
        if (wethOut == 0 || redemption.getWethBalance() < wethOut) {
            return;
        }
        if (dsc.balanceOf(currentActor) < amount) {
            return;
        }

        uint256 preCollateral = dsce.getCollateralBalanceOfUser(address(weth), currentActor);

        dsc.approve(address(redemption), amount);
        redemption.redeemDscForWeth(amount);

        uint256 postCollateral = dsce.getCollateralBalanceOfUser(address(weth), currentActor);

        ghost_totalWethRedeemed += wethOut;
        ghost_totalDscBurnedViaRedemption += amount;
        ghost_totalCollateralDeposited += wethOut;
        ghost_perActorCollateralDeposited[currentActor][address(weth)] += wethOut;
        ghost_lastRedemptionActor = currentActor;
        ghost_lastPreRedemptionCollateral = preCollateral;
        ghost_lastPostRedemptionCollateral = postCollateral;
    }

    function warpTime(uint256 secondsForward) external {
        secondsForward = bound(secondsForward, 1, 7 days);
        vm.warp(block.timestamp + secondsForward);
        wethUsdPriceFeed.updateAnswer(wethUsdPriceFeed.latestAnswer());
        wbtcUsdPriceFeed.updateAnswer(wbtcUsdPriceFeed.latestAnswer());
    }

    function _ensureCurrentActorHasDsc(uint256 requiredAmount) internal {
        uint256 currentBalance = dsc.balanceOf(currentActor);
        if (currentBalance >= requiredAmount) {
            return;
        }

        uint256 shortfall = requiredAmount - currentBalance;
        uint256 collateralAmount = dsce.getTokenAmountFromUsd(address(weth), shortfall * 2);
        if (collateralAmount == 0) {
            collateralAmount = 1;
        }

        weth.mint(currentActor, collateralAmount);
        weth.approve(address(dsce), collateralAmount);
        dsce.depositCollateral(address(weth), collateralAmount);
        dsce.mintDsc(shortfall);

        ghost_totalCollateralDeposited += collateralAmount;
        ghost_totalStablecoinMinted += shortfall;
        ghost_perActorCollateralDeposited[currentActor][address(weth)] += collateralAmount;
        ghost_perActorDscMinted[currentActor] += shortfall;
    }

    function _getCollateralTokenFromSeed(uint256 collateralSeed) internal view returns (ERC20Mock) {
        return collateralSeed % 2 == 0 ? weth : wbtc;
    }
}
