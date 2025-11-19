// SPDX-License-Identifier: MIT

// This is considered an Exogenous, Decentralized, Anchored (pegged), Crypto Collateralized low volatility coin

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// view & pure functions

pragma solidity ^0.8.18;

import {DecentralizedStableCoin} from "./DecentralizedStableCoin.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {console} from "forge-std/Test.sol";
import {OracleLib} from "./libraries/OracleLib.sol"; 

/**
 * @title DSCEngine
 * @author Raghuvansh Rastogi, Ashutosh Tandon, Praveen Kumar
 * 
 * The system is designed to be as minimal as possible, and have the tokens maintain 1 token == $1 peg all the times.
 * This is a stablecoin with the properties:
 * - Exogenously Collateralized
 * - Dollar Pegged
 * - Algorithmically Stablized
 * 
 * It is similar to DAI if DAI had no governance, no fees, and was backed only by WETH and WBTC.
 * 
 * Our DSCEngine should always be "overcollateralized". At no point, should the value of 
 * all collateral < the $ backed value of all the DSC in circulation.
 * 
 * @notice This contract is the core of the Decentralized Stablecoin system. It handles all the logic
 * for minting and redeeming DSC, as well as depositing and withdrawing collateral.
 * 
 * @notice This contract is based on the MakerDAO DSS system.
 */

contract DSCEngine is ReentrancyGuard{

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    using OracleLib for AggregatorV3Interface;

    /*//////////////////////////////////////////////////////////////
                                 ERROS
    //////////////////////////////////////////////////////////////*/

    error DSCEngine__NeedsMoreThanZero();
    error DSCEngine__TokenAddressesAndPriceFeedAddressesMustBeSameLength();
    error DSCEngine__TokenNotAllowed(address token);
    error DSCEngine__TransferFailed();
    error DSCEngine__BreaksHealthFactor(uint256 healthFactor);
    error DSCEngine__MintFailed();
    error DSCEngine__HealthFactorOk();
    error DSCEngine__HealthFactorNotImproved();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    mapping(address token => address priceFeed) public s_priceFeeds;
    DecentralizedStableCoin private immutable i_dsc;
    mapping(address user => mapping(address token => uint256 amount)) private s_collateralDeposited;
    mapping(address user => uint256 amountDscMinted) private s_DSCMinted;
    address[] private s_collateralTokens;

    uint256 private constant ADDITIONAL_FEED_PRECISION = 1e10;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant LIQUIDATION_THRESHOLD = 50; //Assures a user's position is 200% over-collateralized.
    uint256 private constant LIQUIDATION_PRECISION = 100;
    uint256 private constant MIN_HEALTH_FACTOR = 1e18;
    uint256 private constant LIQUIDATION_BONUS = 10; //10% bonus for liquidators


    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event CollateralDeposited(address indexed user, address indexed token, uint256 indexed amount);
    event CollateralRedeemed(address indexed redeemedFrom, address indexed redeemedTo, address indexed token, uint256 amount);

     /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier moreThanZero(uint256 amount) {
        if(amount <= 0){
            revert DSCEngine__NeedsMoreThanZero();
        }
        _;
    }

    modifier isAllowedToken(address token){
        if(s_priceFeeds[token] == address(0)){
            revert DSCEngine__TokenNotAllowed(token);
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    constructor(address[] memory tokenAddresses, address[] memory priceFeedAddresses, address dscAddress){
        if(tokenAddresses.length != priceFeedAddresses.length){
            revert DSCEngine__TokenAddressesAndPriceFeedAddressesMustBeSameLength();
        }

        for(uint256 i=0; i<tokenAddresses.length; i++){
            s_priceFeeds[tokenAddresses[i]] = priceFeedAddresses[i];
            s_collateralTokens.push(tokenAddresses[i]);
        }

        i_dsc = DecentralizedStableCoin(dscAddress);
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*
    * @param tokenCollateralAddress: The address of the token to deposit as collateral
    * @param amountCollateral: The amount of collateral to deposit
    * @param amountDscToMint: The amount of DecentralizedStableCoin to mint
    * @notice: This function will deposit your collateral and mint DSC in one transaction
    * 
    */
    function depositCollateralAndMintDsc(address tokenCollateralAddress, uint256 amountCollateral, uint256 amountDscToMint) external {
        depositCollateral(tokenCollateralAddress, amountCollateral);
        mintDsc(amountDscToMint);
    }

    /*
     * @param tokenCollateralAddress: THE ERC20 token address of the collateral you're depositing
     * @param amountCollateral: The amount of collateral you're depositing
     */
    function depositCollateral(address tokenCollateralAddress, uint256 amountCollateral) public moreThanZero(amountCollateral) isAllowedToken(tokenCollateralAddress) nonReentrant{
        s_collateralDeposited[msg.sender][tokenCollateralAddress] += amountCollateral;
        emit CollateralDeposited(msg.sender, tokenCollateralAddress, amountCollateral);
        
        bool success = IERC20(tokenCollateralAddress).transferFrom(msg.sender, address(this), amountCollateral);

        if(!success){
            revert DSCEngine__TransferFailed();
        }
    }

    /*
     * @param tokenCollateralAddress: The collateral address to redeem
     * @param amountCollateral: The amount of collateral to redeem
     * @param amountDscToBurn: amount of DSC to burn
     * @notice: This function burns DSC and redeems underlying collateral in one transaction.
     */
    function redeemCollateralForDsc(address tokenCollateralAddress, uint256 amountCollateral, uint256 amountDscToBurn) external {
        burnDsc(amountDscToBurn);
        redeemCollateral(tokenCollateralAddress, amountCollateral);
    }

    function redeemCollateral(address tokenCollateralAddress, uint256 amountCollateral) public moreThanZero(amountCollateral) nonReentrant {
        _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender);
        //The CEI rule is broken here because it is gas efficient.
    }

    /*
     * @param amountDscToMint: The amount of DSC you want to mint
     * You can only mint DSC if you have enough collateral.
     */
    function mintDsc(uint256 amountDscToMint) public moreThanZero(amountDscToMint) nonReentrant{
        s_DSCMinted[msg.sender] += amountDscToMint;
        _revertIfHealthFactorIsBroken(msg.sender);  
        bool minted = i_dsc.mint(msg.sender, amountDscToMint);

        if(!minted){
            revert DSCEngine__MintFailed();
        }
    }

    function burnDsc(uint256 amount) public moreThanZero(amount) {
        _burnDsc(amount, msg.sender, msg.sender);
        _revertIfHealthFactorIsBroken(msg.sender); //Not required, as burning of DSC will only make the Health Factor better.
    }

    /*
     * @param collateral: The ERC20 token address of the collateral you're using to make the protocol solvent again.
     * This is collateral that you're going to take from the user who is insolvent.
     * In return, you have to burn your DSC to pay off their debt, but you don't pay off your own.
     * @param user: The user who is insolvent. They have to have a _healthFactor below MIN_HEALTH_FACTOR.
     * @param debtToCover: The amount of DSC you want to burn to cover the user's debt.
     * 
     * @notice: You can partially liquidate a user.
     * @notice: You will get a 10% LIQUIDATION_BONUS for taking the users funds.
     * @notice: This function working assumes that the protocol will be roughly 150% overcollateralized in order for
     * this to work.
     * For example, if the price of the collateral plummeted before anyone could be liquidated.
     */
    function liquidate(address collateral, address user, uint256 debtToCover) external moreThanZero(debtToCover) nonReentrant{
        uint256 startingUserHealthFactor = _healthFactor(user);
        if(startingUserHealthFactor > MIN_HEALTH_FACTOR){
            revert DSCEngine__HealthFactorOk();
        }

        uint256 tokenAmountFromDebtCovered = getTokenAmountFromUsd(collateral, debtToCover);

        uint256 bonusCollateral = (tokenAmountFromDebtCovered * LIQUIDATION_BONUS) / LIQUIDATION_PRECISION;

        uint256 totalCollateralRedeemed = tokenAmountFromDebtCovered + bonusCollateral;

        _redeemCollateral(collateral, totalCollateralRedeemed, user, msg.sender);

        _burnDsc(debtToCover, user, msg.sender);

        uint256 endingUserHealthFactor = _healthFactor(user);
        if(endingUserHealthFactor <= startingUserHealthFactor){
            revert DSCEngine__HealthFactorNotImproved();
        }

        _revertIfHealthFactorIsBroken(msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _redeemCollateral(address tokenCollateralAddress, uint256 amountCollateral, address from, address to) private {
        s_collateralDeposited[from][tokenCollateralAddress] -= amountCollateral;
        emit CollateralRedeemed(from, to, tokenCollateralAddress, amountCollateral);

        bool success = IERC20(tokenCollateralAddress).transfer(to, amountCollateral); // from => address(this)
        if(!success){
            revert DSCEngine__TransferFailed();
        }
    }

    function _burnDsc(uint256 amountDscToBurn, address onBehalfOf, address dscFrom) private {
        s_DSCMinted[onBehalfOf] -= amountDscToBurn;

        bool success = i_dsc.transferFrom(dscFrom, address(this), amountDscToBurn);
        //This conditional is hypothetically unreachable
        if(!success){
            revert DSCEngine__TransferFailed();
        }
        i_dsc.burn(amountDscToBurn);
    }

     /*//////////////////////////////////////////////////////////////
                      PRIVATE & INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _getAccountInformation(address user) private view returns(uint256 totalDscMinted, uint256 collateralValueInUsd){
        totalDscMinted = s_DSCMinted[user];
        collateralValueInUsd = getAccountCollateralValue(user);
    }

    /*
    * Returns how close to liquidation a user is.
    * If a user goes below 1, they can be liquidated.
    */
    function _healthFactor(address user) private view returns(uint256){
        (uint256 totalDscMinted, uint256 collateralValueInUsd) = _getAccountInformation(user);
        return _calculateHealthFactor(totalDscMinted, collateralValueInUsd);   
    }

    function _calculateHealthFactor(uint256 totalDscMinted, uint256 collateralValueInUsd) internal pure returns(uint256){
        if(totalDscMinted == 0){
            return type(uint256).max; //If the user has no DSC minted, they are not at risk of liquidation.
        }
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION; 
        return (collateralAdjustedForThreshold * PRECISION) / totalDscMinted;
    }

    function _revertIfHealthFactorIsBroken(address user) internal view{
        uint256 userHealthFactor = _healthFactor(user);
        if(userHealthFactor < MIN_HEALTH_FACTOR){
            revert DSCEngine__BreaksHealthFactor(userHealthFactor);
        }
    }

    /*//////////////////////////////////////////////////////////////
                    PUBLIC & EXTERNAL VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function calculateHealthFactor(uint256 totalDscMinted, uint256 collateralValueInUsd) external pure returns(uint256){
        return _calculateHealthFactor(totalDscMinted, collateralValueInUsd);
    }

    function getAccountCollateralValue(address user) public view returns(uint256 totalCollateralValueInUsd){
        for(uint256 i=0; i<s_collateralTokens.length; i++){
            address token = s_collateralTokens[i];
            uint256 amount = s_collateralDeposited[user][token];
            totalCollateralValueInUsd += getUsdValue(token, amount);
        }
        return totalCollateralValueInUsd;
    }

    function getUsdValue(address token, uint256 amount) public view returns(uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (,int256 price,,,) = priceFeed.staleCheckLatestRoundData();
        
        /* price is in 8 decimals and amount is in 18 decimals.
         * To convert the price to 18 decimals, we multiply by 10^10 (ADDITIONAL_FEED_PRECISION).
         * ((price in 8 decimals * 10^10) * amount in 18 decimals) / PRECISION (10^18)
         * so the resultant value will be in 18 decimals.
         */
        return ((uint256(price) * ADDITIONAL_FEED_PRECISION) * amount) / PRECISION; 
    }

    function getTokenAmountFromUsd(address token, uint256 usdAmountInWei) public view returns(uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_priceFeeds[token]);
        (,int256 price,,,) = priceFeed.staleCheckLatestRoundData();

        return (usdAmountInWei * PRECISION) / (uint256(price) * ADDITIONAL_FEED_PRECISION);
    }

    function getAccountInformation(address user) external view returns (uint256 totalDscMinted, uint256 collateralValueInUsd){
        return _getAccountInformation(user);
    }

    function getAdditionalFeedPrecision() external pure returns (uint256){
        return ADDITIONAL_FEED_PRECISION;
    }

    function getPrecision() external pure returns (uint256){
        return PRECISION;
    } 

    function getLiquidationThreshold() external pure returns (uint256){
        return LIQUIDATION_THRESHOLD;
    }

    function getLiquidationBonus() external pure returns (uint256){
        return LIQUIDATION_BONUS;
    } 

    function getLiquidationPrecision() external pure returns (uint256){
        return LIQUIDATION_PRECISION;
    }

    function getMinHealthFactor() external pure returns (uint256){
        return MIN_HEALTH_FACTOR;
    }

    function getCollateralTokens() external view returns (address[] memory) {
        return s_collateralTokens;
    }

    function getDscAddress() external view returns (address) {
        return address(i_dsc);
    }

    function getCollateralTokenPriceFeed(address token) external view returns (address) {
        return s_priceFeeds[token];
    }

    function getCollateralBalanceOfUser(address token, address user) external view returns (uint256) {
        return s_collateralDeposited[user][token];
    }

    function getHealthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }
}