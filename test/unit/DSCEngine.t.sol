// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { DeployDSC } from "../../script/DeployDSC.s.sol";
import { DSCEngine } from "../../src/DSCEngine.sol";
import { DecentralizedStableCoin } from "../../src/DecentralizedStableCoin.sol";
import { MockV3Aggregator } from "../mocks/MockV3Aggregator.sol";
import { Test, console } from "forge-std/Test.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";
import { ERC20Mock } from "../../test/mocks/ERC20Mock.sol";
import { MockTransferFromFails } from "../mocks/MockTransferFromFails.sol";
import { MockTokenNotAllowed } from "../mocks/MockTokenNotAllowed.sol";
import { MockFailedMintDsc } from "../mocks/MockFailedMintDsc.sol";

contract DSCEngineTest is Test {
    DeployDSC deployer;
    DecentralizedStableCoin dsc;
    DSCEngine dsce;
    HelperConfig config;
    
    address ethUsdPriceFeed;
    address wbtcUsdPriceFeed;
    address weth;
    address wbtc;
    uint256 deployerKey;

    address public USER = makeAddr("User");
    uint256 public constant AMOUNT_COLLATERAL = 10 ether;
    uint256 public constant AMOUNT_DSC_TO_MINT = 1000 ether;
    uint256 public constant STARTING_USER_BALANCE = 10 ether;

    function setUp() public {
        deployer = new DeployDSC();
        (dsc, dsce, config) = deployer.run();
        (ethUsdPriceFeed, wbtcUsdPriceFeed, weth, wbtc, deployerKey) = config.activeNetworkConfig();

        ERC20Mock(weth).mint(USER, STARTING_USER_BALANCE);
        ERC20Mock(wbtc).mint(USER, STARTING_USER_BALANCE);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier depositedCollateral() {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL);
        dsce.depositCollateral(weth, AMOUNT_COLLATERAL);
        vm.stopPrank();
        _;
    }

    modifier depositedCollateralAndMintedDsc() {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL);
        dsce.depositCollateralAndMintDsc(weth, AMOUNT_COLLATERAL, AMOUNT_DSC_TO_MINT);
        vm.stopPrank();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    address[] public tokenAddresses;
    address[] public priceFeedAddresses;

    function testRevertsIfTokenLengthDoesntMatchPriceFeedLength() public {
        tokenAddresses.push(weth);
        priceFeedAddresses.push(ethUsdPriceFeed);
        priceFeedAddresses.push(wbtcUsdPriceFeed);

        vm.expectRevert(DSCEngine.DSCEngine__TokenAddressesAndPriceFeedAddressesMustBeSameLength.selector);
        new DSCEngine(tokenAddresses, priceFeedAddresses, address(dsc));
    }

    /*//////////////////////////////////////////////////////////////
                              PRICE TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetTokenAmountFromUsd() public view{
         // If we want $100 of WETH @ $2000/WETH, that would be 0.05 WETH
        uint256 expectedWeth = 0.05 ether;
        uint256 actualWeth = dsce.getTokenAmountFromUsd(weth, 100 ether);
        assertEq(expectedWeth, actualWeth);
    }

    function testGetUsdValue() public view{
        uint256 ethAmount = 15e18; // 15 ETH
        uint256 expectedUsd = 30000e18;
        uint256 actualUsd = dsce.getUsdValue(weth, ethAmount);
        console.log(actualUsd);
        assertEq(expectedUsd, actualUsd);
    }

    /*//////////////////////////////////////////////////////////////
                        DEPOSIT COLLATERAL TESTS
    //////////////////////////////////////////////////////////////*/

    function testRevertsIfCollateralZero() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL); //ERC20Mock(weth) denotes what type weth is considered. Since it is an ERC20 token, so wrap it up in ERC2OMock.

        vm.expectRevert(DSCEngine.DSCEngine__NeedsMoreThanZero.selector);
        dsce.depositCollateral(weth, 0);
        vm.stopPrank();
    }

    function testRevertsIfTokenNotAllowed() public {
        MockTokenNotAllowed mockAlienToken = new MockTokenNotAllowed();

        vm.startPrank(USER);
        ERC20Mock(address(mockAlienToken)).mint(USER, AMOUNT_COLLATERAL);
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__TokenNotAllowed.selector, address(mockAlienToken)));
        dsce.depositCollateral(address(mockAlienToken), AMOUNT_COLLATERAL);
        vm.stopPrank();
    }

    function testRevertsIfTransferFromFails() public {
        //Arrange
        MockTransferFromFails mockTokenCollateralAddress = new MockTransferFromFails();
        tokenAddresses = [address(mockTokenCollateralAddress)];
        priceFeedAddresses = [ethUsdPriceFeed];
        mockTokenCollateralAddress.mint(USER, AMOUNT_COLLATERAL);

        DSCEngine mockDsce = new DSCEngine(tokenAddresses, priceFeedAddresses, address(dsc));
        vm.startPrank(USER);
        ERC20Mock(address(mockTokenCollateralAddress)).approve(address(mockDsce), AMOUNT_COLLATERAL);
        //Act / Assert
        vm.expectRevert(DSCEngine.DSCEngine__TransferFailed.selector);
        mockDsce.depositCollateral(address(mockTokenCollateralAddress), AMOUNT_COLLATERAL);
        vm.stopPrank();
    }

    function testCanDepositCollateralWithoutMinting() public depositedCollateral {
        uint256 userBalance = dsc.balanceOf(USER);
        assertEq(userBalance, 0);
    }

    function testCanDepositCollateralAndGetAccountInfo() public depositedCollateral {
        (uint256 totalDscMinted, uint256 collateralValueInUsd) = dsce.getAccountInformation(USER);
        uint256 expectedDepositedTokenAmount = dsce.getTokenAmountFromUsd(weth, collateralValueInUsd);
        assertEq(totalDscMinted, 0);
        assertEq(expectedDepositedTokenAmount, AMOUNT_COLLATERAL);
    }

    /*//////////////////////////////////////////////////////////////
                   depositCollateralAndMintDsc TESTS
    //////////////////////////////////////////////////////////////*/

    function testRevertsIfMintedDscBreaksHealthFactor() public {
        (, int price,,,) = MockV3Aggregator(ethUsdPriceFeed).latestRoundData();
        uint256 amountToMint = (AMOUNT_COLLATERAL * (uint256(price) * dsce.getAdditionalFeedPrecision())) / dsce.getPrecision();
        // console.log(amountToMint);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL);

        uint256 expectedHealthFactor = dsce.calculateHealthFactor(amountToMint, dsce.getUsdValue(weth, AMOUNT_COLLATERAL)); //expectedHealthFactor => 5e17 (0.5)
        // console.log(dsce.getUsdValue(weth, AMOUNT_COLLATERAL));
        // console.log(expectedHealthFactor);
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__BreaksHealthFactor.selector, expectedHealthFactor));
        dsce.depositCollateralAndMintDsc(weth, AMOUNT_COLLATERAL, amountToMint);
        vm.stopPrank();
    }

    function testCanMintWithDepositedCollateral() public depositedCollateralAndMintedDsc {
        uint256 userBalance = dsc.balanceOf(USER);
        assertEq(userBalance, AMOUNT_DSC_TO_MINT);
    }

    /*//////////////////////////////////////////////////////////////
                             mintDsc TESTS
    //////////////////////////////////////////////////////////////*/

    /*
     * This test checks if the mint function from the DecentralizedStableCoin contract reverts when it fails.
     * For this, we use a mock contract MockFailedMintDsc that overrides the mint function to always return false.
     * Also we need a DSCEngine(mockDsce) to use the MockFailedMintDsc instead of DecentralizedStableCoin contract.
     */
    function testRevertsIfMintFails() public {
        // Arrange - Setup
        MockFailedMintDsc mockAlienDsc = new MockFailedMintDsc();
        tokenAddresses = [weth];
        priceFeedAddresses = [ethUsdPriceFeed];
        DSCEngine mockDsce = new DSCEngine(tokenAddresses, priceFeedAddresses, address(mockAlienDsc));
        mockAlienDsc.transferOwnership(address(mockDsce));

        // Arrange - User
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(mockDsce), AMOUNT_COLLATERAL);
        
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__MintFailed.selector));
        mockDsce.depositCollateralAndMintDsc(weth, AMOUNT_COLLATERAL, AMOUNT_DSC_TO_MINT);
        vm.stopPrank();
    }

    function testRevertsIfMintAmountIsZero() public {
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL);
        vm.expectRevert(DSCEngine.DSCEngine__NeedsMoreThanZero.selector);
        dsce.depositCollateralAndMintDsc(weth, AMOUNT_COLLATERAL, 0);
        vm.stopPrank();
    }

    function testRevertsIfMintAmountBreaksHealthFactor() public {
        (, int price,,,) = MockV3Aggregator(ethUsdPriceFeed).latestRoundData();
        uint256 amountToMint = (AMOUNT_COLLATERAL * (uint256(price) * dsce.getAdditionalFeedPrecision())) / dsce.getPrecision();
        // console.log(amountToMint);
        vm.startPrank(USER);
        ERC20Mock(weth).approve(address(dsce), AMOUNT_COLLATERAL);
        dsce.depositCollateral(weth, AMOUNT_COLLATERAL); // Without depositCollateral first, the expectedHealthFactor will be 0.
        uint256 expectedHealthFactor = dsce.calculateHealthFactor(amountToMint, dsce.getUsdValue(weth, AMOUNT_COLLATERAL)); //expectedHealthFactor => 5e17 (0.5)
        // console.log(dsce.getUsdValue(weth, AMOUNT_COLLATERAL));
        // console.log(expectedHealthFactor);
        vm.expectRevert(abi.encodeWithSelector(DSCEngine.DSCEngine__BreaksHealthFactor.selector, expectedHealthFactor));
        dsce.mintDsc(amountToMint);
        vm.stopPrank();
    }

    function testCanMintDsc() public depositedCollateral {
        vm.prank(USER);
        dsce.mintDsc(AMOUNT_DSC_TO_MINT);

        uint256 userBalance = dsc.balanceOf(USER);
        assertEq(userBalance, AMOUNT_DSC_TO_MINT);
    }

     /*//////////////////////////////////////////////////////////////
                             BURNDSC TESTS
    //////////////////////////////////////////////////////////////*/
    
}