//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {DecentralizedStableCoin} from "../src/DecentralizedStableCoin.sol";
import {DSCEngine} from "../src/DSCEngine.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {console} from "forge-std/Test.sol";

contract DeployAndUpdateFrontend is Script {

    function run() external returns (DecentralizedStableCoin, DSCEngine, HelperConfig) {
        HelperConfig config = new HelperConfig();

        (address wethUsdPriceFeed, address wbtcUsdPriceFeed, address weth, address wbtc, uint256 deployerKey) = config.activeNetworkConfig();

        address[] memory tokenAddresses = new address[](2);
        address[] memory priceFeedAddresses = new address[](2);
        
        tokenAddresses[0] = weth;
        tokenAddresses[1] = wbtc;
        priceFeedAddresses[0] = wethUsdPriceFeed;
        priceFeedAddresses[1] = wbtcUsdPriceFeed;

        vm.startBroadcast(deployerKey);
        DecentralizedStableCoin dsc = new DecentralizedStableCoin();
        DSCEngine engine = new DSCEngine(tokenAddresses, priceFeedAddresses, address(dsc));
        dsc.transferOwnership(address(engine));
        vm.stopBroadcast();

        // Print contract addresses for frontend configuration
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("DSC Token Address:", address(dsc));
        console.log("DSC Engine Address:", address(engine));
        console.log("WETH Address:", weth);
        console.log("WBTC Address:", wbtc);
        console.log("WETH Price Feed:", wethUsdPriceFeed);
        console.log("WBTC Price Feed:", wbtcUsdPriceFeed);
        console.log("===========================");
        
        console.log("\n=== FRONTEND CONFIGURATION ===");
        console.log("Add these to your frontend/.env file:");
        console.log("VITE_DSC_ENGINE_ADDRESS=", address(engine));
        console.log("VITE_DSC_TOKEN_ADDRESS=", address(dsc));
        console.log("VITE_WETH_ADDRESS=", weth);
        console.log("VITE_WBTC_ADDRESS=", wbtc);
        console.log("VITE_CHAIN_ID=", block.chainid);
        console.log("===============================");

        return (dsc, engine, config);
    }
}

