//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {DeployDSC} from "../../script/DeployDSC.s.sol";
import {DSCEngine} from "../../src/DSCEngine.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Handler} from "./Handler.t.sol";

contract Invariants is StdInvariant, Test {
    DeployDSC deployer;
    DSCEngine dsce;
    DecentralizedStableCoin dsc;
    HelperConfig config;
    address weth;
    address wbtc;

    Handler handler;

    function setUp() external {
        console.log(address(this));
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (,,weth,wbtc,) = config.activeNetworkConfig();
        // targetContract(address(dsce));

        handler = new Handler(dsce, dsc);
        targetContract(address(handler));
    }

    function invariant_protocolMustHaveMoreValueThanTotalSupply() public view{
        uint256 totalSupply = dsc.totalSupply();
        uint256 totalWethDeposited = IERC20(weth).balanceOf(address(dsce));
        uint256 totalWbtcDeposited = IERC20(wbtc).balanceOf(address(dsce));

        uint256 wethValue = dsce.getUsdValue(weth, totalWethDeposited);
        uint256 wbtcValue = dsce.getUsdValue(wbtc, totalWbtcDeposited);

        console.log("weth: ", weth);
        console.log("wbtc: ", wbtc);
        console.log("totalSupply: ", totalSupply);
        console.log("wethValue: ", wethValue);
        console.log("wbtcValue: ", wbtcValue);
        // console.log("Times Mint Called: ", handler.timesMintIsCalled());
        // console.log("Times Deposit Called: ", handler.timesDepositIsCalled());
        // console.log("Times Redeem Called: ", handler.timesRedeemIsCalled());    

        assert(wethValue + wbtcValue >= totalSupply);
    }

    function invariant_getterFunctionsNeverRevert() public view{
        dsce.getAdditionalFeedPrecision();
        dsce.getPrecision();
        dsce.getLiquidationThreshold();
        dsce.getLiquidationBonus();
        dsce.getLiquidationPrecision();
        dsce.getCollateralTokens();
        dsce.getMinHealthFactor();
        dsce.getDscAddress();
    } 
}