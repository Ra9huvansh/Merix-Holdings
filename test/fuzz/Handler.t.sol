//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MockV3Aggregator} from "../mocks/MockV3Aggregator.sol";

contract Handler is Test {
    DSCEngine dsce;
    DecentralizedStableCoin dsc;

    ERC20Mock weth;
    ERC20Mock wbtc;

    MockV3Aggregator public ethUsdPriceFeed;

    // address user = makeAddr("user");

    uint256 MAX_DEPOSIT_SIZE = type(uint96).max;
    uint256 MAX_MINTABLE_DSC_SIZE = type(uint96).max;

    // uint256 public timesMintIsCalled;
    // uint256 public timesDepositIsCalled;
    // uint256 public timesRedeemIsCalled;

    constructor(DSCEngine _engine, DecentralizedStableCoin _dsc){
        dsce = _engine;
        dsc = _dsc;

        address[] memory collateralTokens = dsce.getCollateralTokens();
        weth = ERC20Mock(collateralTokens[0]);
        wbtc = ERC20Mock(collateralTokens[1]);

        ethUsdPriceFeed = MockV3Aggregator(dsce.getCollateralTokenPriceFeed(address(weth)));
    }

    // function updateCollateralPrice(uint256 newPrice) public {
    //     int256 newPriceInt = int256(uint256(newPrice));
    //     ethUsdPriceFeed.updateAnswer(newPriceInt);
    // }

    function depositCollateral(uint256 collateralTokenSeed, uint256 amountCollateral) public {
        amountCollateral = bound(amountCollateral, 1, MAX_DEPOSIT_SIZE);

        ERC20Mock collateralToken = _getCollateralTokenFromSeed(collateralTokenSeed);

        // Mint and approve before deposit
        collateralToken.mint(msg.sender, amountCollateral);

        vm.prank(msg.sender);
        collateralToken.approve(address(dsce), amountCollateral);

        vm.prank(msg.sender);
        dsce.depositCollateral(address(collateralToken), amountCollateral);
    }

    /*
     * redeemCollateral never reverts because we are simulating a single user.
     * We are only taking account of depositing and redeeming until now and since there is no DSC minted, 
     * HealthFactor never breaks.
     */
    function redeemCollateral(uint256 collateralTokenSeed, uint256 amountCollateral) public {
        ERC20Mock collateralToken = _getCollateralTokenFromSeed(collateralTokenSeed);

        uint256 maxCollateralToRedeem = dsce.getCollateralBalanceOfUser(address(collateralToken), msg.sender);
        if(maxCollateralToRedeem == 0){
            return;
        }
        amountCollateral = bound(amountCollateral, 1, maxCollateralToRedeem);

        // Simulate remaining collateral and calculate health factor
        (uint256 minted, uint256 collateralUsd) = dsce.getAccountInformation(msg.sender);
        // These functions are not using msg.sender in their code that's why there is not need to vm.prank explicitly.
        uint256 redemptionUsd = dsce.getUsdValue(address(collateralToken), amountCollateral);
        uint256 newCollateralUsd = collateralUsd - redemptionUsd;

        // Health factor formula: (collateralAdjusted * 1e18) / minted
        uint256 newHealthFactor = dsce.calculateHealthFactor(minted, newCollateralUsd);

        // If redeem breaks the health factor, skip
        if (newHealthFactor < dsce.getMinHealthFactor()) {
            vm.stopPrank();
            return;
        }

        vm.prank(msg.sender);
        dsce.redeemCollateral(address(collateralToken), amountCollateral);
    }
    
    function _getCollateralTokenFromSeed(uint256 collateralSeed) private view returns(ERC20Mock){
        if(collateralSeed % 2 == 0){
            return weth;
        }
        return wbtc;
    }

    function mintDsc(uint256 amount) public {
        amount = bound(amount, 1, MAX_MINTABLE_DSC_SIZE); // prevent overflow

        (uint256 minted, uint256 collateralValueInUsd) = dsce.getAccountInformation(msg.sender);

        uint256 totalMintedDsc = minted + amount;

        uint256 healthFactor = dsce.calculateHealthFactor(totalMintedDsc, collateralValueInUsd);
        if (healthFactor < dsce.getMinHealthFactor()) {
            return;
        }

        vm.prank(msg.sender);
        dsce.mintDsc(amount);
    }


}