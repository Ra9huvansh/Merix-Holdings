// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MockV3Aggregator} from "../mocks/MockV3Aggregator.sol";

contract StatelessFuzz_DSCEngine is Test {
    DeployDSC deployer;
    DSCEngine dsce;
    DecentralizedStableCoin dsc;
    HelperConfig config;

    address ethUsdPriceFeed;
    address wbtcUsdPriceFeed;
    address weth;
    address wbtc;
    uint256 deployerKey;

    address USER = makeAddr("user");
    address LIQUIDATOR = makeAddr("liquidator");

    uint256 constant STARTING_BALANCE = 1000 ether;
    uint256 constant ETH_USD_PRICE    = 2000e8; // $2000 per ETH (8 decimals, mock)
    uint256 constant MAX_COLLATERAL   = type(uint96).max;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (ethUsdPriceFeed, wbtcUsdPriceFeed, weth, wbtc, deployerKey) = config.activeNetworkConfig();

        ERC20Mock(weth).mint(USER, STARTING_BALANCE);
        ERC20Mock(wbtc).mint(USER, STARTING_BALANCE);
        ERC20Mock(weth).mint(LIQUIDATOR, STARTING_BALANCE);
    }

    /*//////////////////////////////////////////////////////////////
                    1. testFuzz_DepositCollateral
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositCollateral(uint256 amountCollateral) public {
        amountCollateral = bound(amountCollateral, 1, MAX_COLLATERAL);

        ERC20Mock(weth).mint(USER, amountCollateral); // ensure USER has exactly enough
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), amountCollateral);
        dsce.depositCollateral(weth, amountCollateral);
        vm.stopPrank();

        uint256 recorded = dsce.getCollateralBalanceOfUser(weth, USER);
        assertEq(recorded, amountCollateral);
    }

    /*//////////////////////////////////////////////////////////////
                2. testFuzz_DepositCollateral_RevertsIfZero
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositCollateral_RevertsIfZero(uint256 amount) public {
        // any non-zero amount is fine; only zero must revert
        amount = 0;
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), 0);
        vm.expectRevert(DSCEngine.DSCEngine__NeedsMoreThanZero.selector);
        dsce.depositCollateral(weth, amount);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
            3. testFuzz_DepositCollateral_RevertsIfTokenNotAllowed
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositCollateral_RevertsIfTokenNotAllowed(address randomToken) public {
        // Exclude known allowed tokens
        vm.assume(randomToken != weth && randomToken != wbtc && randomToken != address(0));

        vm.startPrank(USER);
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__TokenNotAllowed.selector, randomToken));
        dsce.depositCollateral(randomToken, 1 ether);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        4. testFuzz_MintDsc
    //////////////////////////////////////////////////////////////*/

    function testFuzz_MintDsc(uint256 collateral, uint256 mintAmount) public {
        collateral  = bound(collateral,  1e18, MAX_COLLATERAL);
        // collateral value at $2000/ETH; max safe mint = collateral * 2000 * 50%
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2; // 200% collateralisation
        vm.assume(maxSafeMint > 0);
        mintAmount  = bound(mintAmount, 1, maxSafeMint);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateral(weth, collateral);
        dsce.mintDsc(mintAmount);
        vm.stopPrank();

        (uint256 minted,) = dsce.getAccountInformation(USER);
        assertEq(minted, mintAmount);
        assertEq(dsc.balanceOf(USER), mintAmount);
    }

    /*//////////////////////////////////////////////////////////////
            5. testFuzz_MintDsc_RevertsIfBreaksHealthFactor
    //////////////////////////////////////////////////////////////*/

    function testFuzz_MintDsc_RevertsIfBreaksHealthFactor(uint256 collateral, uint256 extraMint) public {
        collateral = bound(collateral, 1e18, MAX_COLLATERAL);
        // Mint exactly at the limit first, then try to mint extra on top
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2;
        vm.assume(maxSafeMint > 0);
        // extra pushes it over the limit
        extraMint = bound(extraMint, 1, maxSafeMint);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateral(weth, collateral);
        dsce.mintDsc(maxSafeMint); // at limit

        // Now trying to mint even 1 more should break HF
        vm.expectRevert();
        dsce.mintDsc(extraMint);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        6. testFuzz_BurnDsc
    //////////////////////////////////////////////////////////////*/

    function testFuzz_BurnDsc(uint256 collateral, uint256 mintAmount, uint256 burnAmount) public {
        collateral = bound(collateral, 1e18, MAX_COLLATERAL);
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2;
        vm.assume(maxSafeMint > 0);
        mintAmount  = bound(mintAmount,  1, maxSafeMint);
        burnAmount  = bound(burnAmount,  1, mintAmount);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateral(weth, collateral);
        dsce.mintDsc(mintAmount);

        dsc.approve(address(dsce), burnAmount);
        dsce.burnDsc(burnAmount);
        vm.stopPrank();

        (uint256 minted,) = dsce.getAccountInformation(USER);
        assertEq(minted, mintAmount - burnAmount);
    }

    /*//////////////////////////////////////////////////////////////
                    7. testFuzz_RedeemCollateral
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemCollateral(uint256 depositAmount, uint256 redeemAmount) public {
        depositAmount = bound(depositAmount, 1e18, MAX_COLLATERAL);
        redeemAmount  = bound(redeemAmount,  1, depositAmount);

        ERC20Mock(weth).mint(USER, depositAmount);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), depositAmount);
        dsce.depositCollateral(weth, depositAmount);
        // No DSC minted → HF is always max, safe to redeem anything
        dsce.redeemCollateral(weth, redeemAmount);
        vm.stopPrank();

        uint256 remaining = dsce.getCollateralBalanceOfUser(weth, USER);
        assertEq(remaining, depositAmount - redeemAmount);
    }

    /*//////////////////////////////////////////////////////////////
            8. testFuzz_RedeemCollateral_RevertsIfBreaksHealthFactor
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemCollateral_RevertsIfBreaksHealthFactor(
        uint256 collateral,
        uint256 mintFraction
    ) public {
        collateral   = bound(collateral,   2e18, MAX_COLLATERAL);
        // Mint at exactly 50% LTV (the safe limit)
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2;
        vm.assume(maxSafeMint > 1e18);
        mintFraction = bound(mintFraction, 1e18, maxSafeMint);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateral(weth, collateral);
        dsce.mintDsc(mintFraction);

        // Attempt to redeem ALL collateral — will break HF
        vm.expectRevert();
        dsce.redeemCollateral(weth, collateral);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                9. testFuzz_DepositCollateralAndMintDsc
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DepositCollateralAndMintDsc(uint256 collateral, uint256 mintAmount) public {
        collateral = bound(collateral, 1e18, MAX_COLLATERAL);
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2;
        vm.assume(maxSafeMint > 0);
        mintAmount = bound(mintAmount, 1, maxSafeMint);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateralAndMintDsc(weth, collateral, mintAmount);
        vm.stopPrank();

        (uint256 minted, uint256 collateralValue) = dsce.getAccountInformation(USER);
        assertEq(minted, mintAmount);
        assertEq(collateralValue, collateralUsd);
    }

    /*//////////////////////////////////////////////////////////////
                10. testFuzz_RedeemCollateralForDsc
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RedeemCollateralForDsc(uint256 collateral, uint256 mintAmount, uint256 burnAmount) public {
        collateral = bound(collateral, 2e18, MAX_COLLATERAL);
        uint256 collateralUsd = dsce.getUsdValue(weth, collateral);
        uint256 maxSafeMint   = collateralUsd / 2;
        vm.assume(maxSafeMint >= 1e18);
        // Bound mint and burn to at least 1e18 so token conversion never rounds to 0
        mintAmount = bound(mintAmount, 1e18, maxSafeMint);
        burnAmount = bound(burnAmount, 1e18, mintAmount);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateralAndMintDsc(weth, collateral, mintAmount);

        // Redeem only the token equivalent of the DSC being burned (1:1 USD match)
        // This keeps collateral ratio intact since we burn DSC at the same time
        uint256 safeRedeem = dsce.getTokenAmountFromUsd(weth, burnAmount);
        vm.assume(safeRedeem > 0 && safeRedeem <= collateral);

        dsc.approve(address(dsce), burnAmount);
        dsce.redeemCollateralForDsc(weth, safeRedeem, burnAmount);
        vm.stopPrank();

        (uint256 mintedAfter,) = dsce.getAccountInformation(USER);
        assertEq(mintedAfter, mintAmount - burnAmount);
    }

    /*//////////////////////////////////////////////////////////////
                        11. testFuzz_Liquidate
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Liquidate(uint256 collateral, uint256 priceDropPercent) public {
        collateral       = bound(collateral,       2e18, 10 ether);
        // For partial liquidation to improve HF, collateral value after drop must be
        // > 1.1 × mintAmount (= 0.55 × collUSD_before), so drop must be < 45%.
        // Any drop at all makes user liquidatable since they mint at exactly 50% LTV.
        priceDropPercent = bound(priceDropPercent, 1, 40);

        // Mint at exactly 50% LTV so any price drop makes HF < 1
        uint256 collateralUsdBefore = dsce.getUsdValue(weth, collateral);
        uint256 mintAmount          = collateralUsdBefore / 2;
        vm.assume(mintAmount > 1e18);

        ERC20Mock(weth).mint(USER, collateral);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), collateral);
        dsce.depositCollateralAndMintDsc(weth, collateral, mintAmount);
        vm.stopPrank();

        // Drop ETH price — user goes below 200% collateralisation
        uint256 newPrice = ETH_USD_PRICE * (100 - priceDropPercent) / 100;
        MockV3Aggregator(ethUsdPriceFeed).updateAnswer(int256(newPrice));

        uint256 hfBefore = dsce.getHealthFactor(USER);
        vm.assume(hfBefore < dsce.getMinHealthFactor());

        // Seize at most half the post-drop collateral value (conservative, avoids bonus overflow)
        uint256 collValueAfterDrop = dsce.getUsdValue(weth, collateral);
        uint256 debtToCover = collValueAfterDrop / 4; // well within 1-bonus seize limit
        vm.assume(debtToCover >= 1e18);

        vm.startPrank(LIQUIDATOR);
        ERC20Mock(weth).approve(address(dsce), STARTING_BALANCE);
        dsce.depositCollateral(weth, STARTING_BALANCE);
        dsce.mintDsc(debtToCover);
        dsc.approve(address(dsce), debtToCover);
        dsce.liquidate(weth, USER, debtToCover);
        vm.stopPrank();

        uint256 hfAfter = dsce.getHealthFactor(USER);
        assertGt(hfAfter, hfBefore);
    }

    /*//////////////////////////////////////////////////////////////
                    12. testFuzz_GetUsdValue
    //////////////////////////////////////////////////////////////*/

    function testFuzz_GetUsdValue(uint256 amount) public view {
        amount = bound(amount, 1, type(uint128).max);
        // At $2000/ETH with 8-decimal feed and 1e10 additional precision:
        // usd = amount * 2000e8 * 1e10 / 1e18 = amount * 2000
        uint256 usdValue = dsce.getUsdValue(weth, amount);
        uint256 expected = (amount * uint256(ETH_USD_PRICE) * dsce.getAdditionalFeedPrecision()) / dsce.getPrecision();
        assertEq(usdValue, expected);
    }

    /*//////////////////////////////////////////////////////////////
                13. testFuzz_GetTokenAmountFromUsd
    //////////////////////////////////////////////////////////////*/

    function testFuzz_GetTokenAmountFromUsd(uint256 usdAmount) public view {
        usdAmount = bound(usdAmount, 1e18, type(uint128).max);
        uint256 tokenAmount = dsce.getTokenAmountFromUsd(weth, usdAmount);
        // Inverse: tokenAmount * price * addPrec / precision == usdAmount (within rounding)
        uint256 reconstructed = (tokenAmount * uint256(ETH_USD_PRICE) * dsce.getAdditionalFeedPrecision()) / dsce.getPrecision();
        // Allow 1 wei of rounding loss
        assertApproxEqAbs(reconstructed, usdAmount, dsce.getAdditionalFeedPrecision());
    }

    /*//////////////////////////////////////////////////////////////
                14. testFuzz_CalculateHealthFactor
    //////////////////////////////////////////////////////////////*/

    function testFuzz_CalculateHealthFactor(uint256 dscMinted, uint256 collateralUsd) public view {
        // If no DSC minted, health factor is max regardless of collateral
        if (dscMinted == 0) {
            uint256 hf = dsce.calculateHealthFactor(0, collateralUsd);
            assertEq(hf, type(uint256).max);
            return;
        }
        collateralUsd = bound(collateralUsd, 1, type(uint128).max);
        dscMinted     = bound(dscMinted,     1, type(uint128).max);

        uint256 hf = dsce.calculateHealthFactor(dscMinted, collateralUsd);
        // Mirror the contract's single-division formula (no divide-before-multiply):
        // hf = (collateralUsd * LIQUIDATION_THRESHOLD * PRECISION) / (LIQUIDATION_PRECISION * dscMinted)
        uint256 expected = (collateralUsd * dsce.getLiquidationThreshold() * dsce.getPrecision())
            / (dsce.getLiquidationPrecision() * dscMinted);
        assertEq(hf, expected);
    }

    /*//////////////////////////////////////////////////////////////
              16. testFuzz_ZeroDepositCannotMint
    //////////////////////////////////////////////////////////////*/

    function testFuzz_ZeroDepositCannotMint(uint256 mintAmount) public {
        mintAmount = bound(mintAmount, 1, type(uint128).max);
        // USER has no collateral deposited — any mint attempt must revert
        vm.prank(USER);
        vm.expectRevert();
        dsce.mintDsc(mintAmount);
    }

    /*//////////////////////////////////////////////////////////////
                17. testFuzz_NoFreeTokens
    //////////////////////////////////////////////////////////////*/

    function testFuzz_NoFreeTokens(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);
        // DSC balance of USER must remain 0 without any collateral deposited
        // Attempting to mint without collateral reverts; balance never changes
        vm.prank(USER);
        vm.expectRevert();
        dsce.mintDsc(amount);

        assertEq(dsc.balanceOf(USER), 0);
    }

    /*//////////////////////////////////////////////////////////////
                    15. testFuzz_PriceFeedStale
    //////////////////////////////////////////////////////////////*/

    function testFuzz_PriceFeedStale(uint256 stalePeriod) public {
        // Anything strictly above 3 hours should revert with OracleLib__StalePrice
        stalePeriod = bound(stalePeriod, 3 hours + 1, 30 days);
        vm.warp(block.timestamp + stalePeriod);

        vm.expectRevert(); // OracleLib__StalePrice
        dsce.getUsdValue(weth, 1 ether);
    }
}
