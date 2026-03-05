// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {DecentralizedStableCoin} from "../src/DecentralizedStableCoin.sol";
import {DSCEngine} from "../src/DSCEngine.sol";
import {YieldAggregator} from "../src/yield/YieldAggregator.sol";
import {RedemptionContract} from "../src/yield/RedemptionContract.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Full deployment script for Merix Holdings.
 *         Deploys: DSC + DSCEngine + YieldAggregator + RedemptionContract
 *         Seeds:   YieldAggregator yield reserve (400 DSC) + RedemptionContract (5 WETH)
 *
 * Run on Sepolia:
 *   forge script script/DeployAll.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --private-key $PRIVATE_KEY
 *
 * After running, copy the printed addresses into frontend/.env
 */
contract DeployAll is Script {
    // Sepolia addresses — hardcoded to avoid HelperConfig vm.envUint dependency
    address constant WETH_USD_PRICE_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant WBTC_USD_PRICE_FEED = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43;
    address constant WETH = 0xdd13E55209Fd76AfE204dBda4007C227904f0a81;
    address constant WBTC = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;

    function run() external {
        address[] memory tokenAddresses     = new address[](2);
        address[] memory priceFeedAddresses = new address[](2);
        tokenAddresses[0]     = WETH;
        tokenAddresses[1]     = WBTC;
        priceFeedAddresses[0] = WETH_USD_PRICE_FEED;
        priceFeedAddresses[1] = WBTC_USD_PRICE_FEED;

        vm.startBroadcast();

        // ── Core ──────────────────────────────────────────────────────────────
        DecentralizedStableCoin dsc    = new DecentralizedStableCoin();
        DSCEngine               engine = new DSCEngine(tokenAddresses, priceFeedAddresses, address(dsc));
        dsc.transferOwnership(address(engine));

        // Sanity check: DSCEngine must own DSC before any minting or burning can happen
        require(dsc.owner() == address(engine), "DeployAll: DSC ownership transfer failed");

        // ── Yield ─────────────────────────────────────────────────────────────
        YieldAggregator    yieldAgg   = new YieldAggregator(address(dsc));
        RedemptionContract redemption = new RedemptionContract(address(dsc), WETH, address(engine));

        // Authorise RedemptionContract in DSCEngine (required for depositCollateralFor + burnExternal)
        engine.setRedemptionContract(address(redemption));

        vm.stopBroadcast();

        // NOTE: After deployment, seed the contracts manually:
        //   1. YieldAggregator: deposit WETH collateral → mint DSC → fundYieldReserve(dscAmount)
        //   2. RedemptionContract: wrap ETH to WETH → redemption.fund(wethAmount)

        console.log("=== MERIX HOLDINGS - FULL DEPLOYMENT ===");
        console.log("DSC Token:           ", address(dsc));
        console.log("DSC Engine:          ", address(engine));
        console.log("WETH:                ", WETH);
        console.log("WBTC:                ", WBTC);
        console.log("YieldAggregator:     ", address(yieldAgg));
        console.log("RedemptionContract:  ", address(redemption));
        console.log("");
        console.log("=== Copy to frontend/.env ===");
        console.log("VITE_DSC_ENGINE_ADDRESS=",          address(engine));
        console.log("VITE_DSC_TOKEN_ADDRESS=",           address(dsc));
        console.log("VITE_WETH_ADDRESS=",                WETH);
        console.log("VITE_WBTC_ADDRESS=",                WBTC);
        console.log("VITE_YIELD_AGGREGATOR_ADDRESS=",    address(yieldAgg));
        console.log("VITE_REDEMPTION_CONTRACT_ADDRESS=", address(redemption));
        console.log("VITE_CHAIN_ID=11155111");
    }
}
