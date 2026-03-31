/Users/ra9huvansh/Library/Python/3.9/lib/python/site-packages/urllib3/__init__.py:35: NotOpenSSLWarning: urllib3 v2 only supports OpenSSL 1.1.1+, currently the 'ssl' module is compiled with 'LibreSSL 2.8.3'. See: https://github.com/urllib3/urllib3/issues/3020
  warnings.warn(
'forge clean' running (wd: /Users/ra9huvansh/Desktop/Merix-Holdings)
'forge config --json' running
'forge build --build-info --skip ./test/** ./script/** --force' running (wd: /Users/ra9huvansh/Desktop/Merix-Holdings)
INFO:Detectors:
Detector: unchecked-transfer
RedemptionContract.redeemDscForWeth(uint256) (src/yield/RedemptionContract.sol#68-95) ignores return value by dsc.transferFrom(msg.sender,address(this),dscAmount) (src/yield/RedemptionContract.sol#79)
RedemptionContract.fund(uint256) (src/yield/RedemptionContract.sol#100-103) ignores return value by weth.transferFrom(msg.sender,address(this),wethAmount) (src/yield/RedemptionContract.sol#101)
YieldAggregator.depositToStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#86-110) ignores return value by dsc.transferFrom(msg.sender,address(this),amount) (src/yield/YieldAggregator.sol#99)
YieldAggregator.withdrawFromStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#117-156) ignores return value by dsc.transfer(msg.sender,dscAmount) (src/yield/YieldAggregator.sol#153)
YieldAggregator.withdrawRemainingShares() (src/yield/YieldAggregator.sol#163-188) ignores return value by dsc.transfer(msg.sender,dscOut) (src/yield/YieldAggregator.sol#185)
YieldAggregator.fundYieldReserve(uint256) (src/yield/YieldAggregator.sol#211-214) ignores return value by dsc.transferFrom(msg.sender,address(this),amount) (src/yield/YieldAggregator.sol#212)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unchecked-transfer
INFO:Detectors:
Detector: divide-before-multiply
DSCEngine._calculateHealthFactor(uint256,uint256) (src/DSCEngine.sol#331-337) performs a multiplication on the result of a division:
	- collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION (src/DSCEngine.sol#335)
	- (collateralAdjustedForThreshold * PRECISION) / totalDscMinted (src/DSCEngine.sol#336)
YieldAggregator.withdrawFromStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#117-156) performs a multiplication on the result of a division:
	- sharesToBurn = (dscAmount * totalShares) / totalAssets (src/yield/YieldAggregator.sol#127)
	- principalReduction = (sharesToBurn * userPrincipal[msg.sender]) / userShares[msg.sender] (src/yield/YieldAggregator.sol#131-133)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#divide-before-multiply
INFO:Detectors:
Detector: incorrect-equality
YieldAggregator._harvestStrategy(uint256) (src/yield/YieldAggregator.sol#228-236) uses a dangerous strict equality:
	- s.totalDeposited == 0 || elapsed == 0 (src/yield/YieldAggregator.sol#232)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities
INFO:Detectors:
Detector: reentrancy-no-eth
Reentrancy in YieldAggregator.depositToStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#86-110):
	External calls:
	- dsc.transferFrom(msg.sender,address(this),amount) (src/yield/YieldAggregator.sol#99)
	State variables written after the call(s):
	- strategies[strategyId].totalDeposited += amount (src/yield/YieldAggregator.sol#107)
	YieldAggregator.strategies (src/yield/YieldAggregator.sol#51) can be used in cross function reentrancies:
	- YieldAggregator.constructor(address) (src/yield/YieldAggregator.sol#67-76)
	- YieldAggregator.getSimulatedTotalAssets() (src/yield/YieldAggregator.sol#273-282)
	- YieldAggregator.getStrategy(uint256) (src/yield/YieldAggregator.sol#246-255)
	- YieldAggregator.getStrategyCount() (src/yield/YieldAggregator.sol#242-244)
	- YieldAggregator.strategies (src/yield/YieldAggregator.sol#51)
	- totalAssets += amount (src/yield/YieldAggregator.sol#102)
	YieldAggregator.totalAssets (src/yield/YieldAggregator.sol#39) can be used in cross function reentrancies:
	- YieldAggregator.getSimulatedTotalAssets() (src/yield/YieldAggregator.sol#273-282)
	- YieldAggregator.getUserInfo(address) (src/yield/YieldAggregator.sol#257-267)
	- YieldAggregator.totalAssets (src/yield/YieldAggregator.sol#39)
	- totalShares += sharesToMint (src/yield/YieldAggregator.sol#101)
	YieldAggregator.totalShares (src/yield/YieldAggregator.sol#38) can be used in cross function reentrancies:
	- YieldAggregator.getUserInfo(address) (src/yield/YieldAggregator.sol#257-267)
	- YieldAggregator.totalShares (src/yield/YieldAggregator.sol#38)
Reentrancy in DSCEngine.liquidate(address,address,uint256) (src/DSCEngine.sol#264-286):
	External calls:
	- _redeemCollateral(collateral,totalCollateralRedeemed,user,msg.sender) (src/DSCEngine.sol#276)
		- success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral) (src/DSCEngine.sol#296)
	- _burnDsc(debtToCover,user,msg.sender) (src/DSCEngine.sol#278)
		- success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn) (src/DSCEngine.sol#305)
		- i_dsc.burn(amountDscToBurn) (src/DSCEngine.sol#310)
	State variables written after the call(s):
	- _burnDsc(debtToCover,user,msg.sender) (src/DSCEngine.sol#278)
		- s_DSCMinted[onBehalfOf] -= amountDscToBurn (src/DSCEngine.sol#303)
	DSCEngine.s_DSCMinted (src/DSCEngine.sol#84) can be used in cross function reentrancies:
	- DSCEngine._burnDsc(uint256,address,address) (src/DSCEngine.sol#302-311)
	- DSCEngine._getAccountInformation(address) (src/DSCEngine.sol#317-320)
	- DSCEngine.mintDsc(uint256) (src/DSCEngine.sol#195-203)
Reentrancy in DSCEngine.redeemCollateralForDsc(address,uint256,uint256) (src/DSCEngine.sol#180-183):
	External calls:
	- burnDsc(amountDscToBurn) (src/DSCEngine.sol#181)
		- success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn) (src/DSCEngine.sol#305)
		- i_dsc.burn(amountDscToBurn) (src/DSCEngine.sol#310)
	- redeemCollateral(tokenCollateralAddress,amountCollateral) (src/DSCEngine.sol#182)
		- success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral) (src/DSCEngine.sol#296)
	State variables written after the call(s):
	- redeemCollateral(tokenCollateralAddress,amountCollateral) (src/DSCEngine.sol#182)
		- s_collateralDeposited[from][tokenCollateralAddress] -= amountCollateral (src/DSCEngine.sol#293)
	DSCEngine.s_collateralDeposited (src/DSCEngine.sol#83) can be used in cross function reentrancies:
	- DSCEngine._redeemCollateral(address,uint256,address,address) (src/DSCEngine.sol#292-300)
	- DSCEngine.depositCollateral(address,uint256) (src/DSCEngine.sol#163-172)
	- DSCEngine.getAccountCollateralValue(address) (src/DSCEngine.sol#354-361)
	- DSCEngine.getCollateralBalanceOfUser(address,address) (src/DSCEngine.sol#422-424)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-1
INFO:Detectors:
Detector: uninitialized-local
YieldAggregator._harvestAll().newYield (src/yield/YieldAggregator.sol#221) is a local variable never initialized
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#uninitialized-local-variables
INFO:Detectors:
Detector: unused-return
DSCEngine.getUsdValue(address,uint256) (src/DSCEngine.sol#363-373) ignores return value by (None,price,None,None,None) = priceFeed.staleCheckLatestRoundData() (src/DSCEngine.sol#365)
DSCEngine.getTokenAmountFromUsd(address,uint256) (src/DSCEngine.sol#375-380) ignores return value by (None,price,None,None,None) = priceFeed.staleCheckLatestRoundData() (src/DSCEngine.sol#377)
RedemptionContract.redeemDscForWeth(uint256) (src/yield/RedemptionContract.sol#68-95) ignores return value by dsc.approve(address(dscEngine),dscAmount) (src/yield/RedemptionContract.sol#82)
RedemptionContract.redeemDscForWeth(uint256) (src/yield/RedemptionContract.sol#68-95) ignores return value by weth.approve(address(dscEngine),wethOut) (src/yield/RedemptionContract.sol#86)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return
INFO:Detectors:
Detector: events-access
DSCEngine.setRedemptionContract(address) (src/DSCEngine.sol#214-216) should emit an event for: 
	- redemptionContract = rc (src/DSCEngine.sol#215) 
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-events-access-control
INFO:Detectors:
Detector: missing-zero-check
DSCEngine.setRedemptionContract(address).rc (src/DSCEngine.sol#214) lacks a zero-check on :
		- redemptionContract = rc (src/DSCEngine.sol#215)
YieldAggregator.setRedemptionContract(address)._redemptionContract (src/yield/YieldAggregator.sol#193) lacks a zero-check on :
		- redemptionContract = _redemptionContract (src/yield/YieldAggregator.sol#194)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation
INFO:Detectors:
Detector: reentrancy-benign
Reentrancy in YieldAggregator.depositToStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#86-110):
	External calls:
	- dsc.transferFrom(msg.sender,address(this),amount) (src/yield/YieldAggregator.sol#99)
	State variables written after the call(s):
	- userPrincipal[msg.sender] += amount (src/yield/YieldAggregator.sol#105)
	- userShares[msg.sender] += sharesToMint (src/yield/YieldAggregator.sol#104)
	- userStrategyDeposited[msg.sender][strategyId] += amount (src/yield/YieldAggregator.sol#106)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-2
INFO:Detectors:
Detector: reentrancy-events
Reentrancy in RedemptionContract.fund(uint256) (src/yield/RedemptionContract.sol#100-103):
	External calls:
	- weth.transferFrom(msg.sender,address(this),wethAmount) (src/yield/RedemptionContract.sol#101)
	Event emitted after the call(s):
	- Funded(wethAmount) (src/yield/RedemptionContract.sol#102)
Reentrancy in YieldAggregator.fundYieldReserve(uint256) (src/yield/YieldAggregator.sol#211-214):
	External calls:
	- dsc.transferFrom(msg.sender,address(this),amount) (src/yield/YieldAggregator.sol#212)
	Event emitted after the call(s):
	- YieldReserveFunded(amount) (src/yield/YieldAggregator.sol#213)
Reentrancy in DSCEngine.redeemCollateralForDsc(address,uint256,uint256) (src/DSCEngine.sol#180-183):
	External calls:
	- burnDsc(amountDscToBurn) (src/DSCEngine.sol#181)
		- success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn) (src/DSCEngine.sol#305)
		- i_dsc.burn(amountDscToBurn) (src/DSCEngine.sol#310)
	- redeemCollateral(tokenCollateralAddress,amountCollateral) (src/DSCEngine.sol#182)
		- success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral) (src/DSCEngine.sol#296)
	Event emitted after the call(s):
	- CollateralRedeemed(from,to,tokenCollateralAddress,amountCollateral) (src/DSCEngine.sol#294)
		- redeemCollateral(tokenCollateralAddress,amountCollateral) (src/DSCEngine.sol#182)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3
INFO:Detectors:
Detector: timestamp
YieldAggregator.depositToStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#86-110) uses timestamp for comparisons
	Dangerous comparisons:
	- (totalShares == 0 || totalAssets == 0) (src/yield/YieldAggregator.sol#95-97)
YieldAggregator.withdrawFromStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#117-156) uses timestamp for comparisons
	Dangerous comparisons:
	- totalShares == 0 || totalAssets == 0 (src/yield/YieldAggregator.sol#124)
	- strategies[strategyId].totalDeposited > stratReduction (src/yield/YieldAggregator.sol#139-140)
YieldAggregator.withdrawRemainingShares() (src/yield/YieldAggregator.sol#163-188) uses timestamp for comparisons
	Dangerous comparisons:
	- totalShares == 0 || totalAssets == 0 (src/yield/YieldAggregator.sol#169)
YieldAggregator._harvestAll() (src/yield/YieldAggregator.sol#220-226) uses timestamp for comparisons
	Dangerous comparisons:
	- i < strategies.length (src/yield/YieldAggregator.sol#222)
	- newYield > 0 (src/yield/YieldAggregator.sol#225)
YieldAggregator._harvestStrategy(uint256) (src/yield/YieldAggregator.sol#228-236) uses timestamp for comparisons
	Dangerous comparisons:
	- s.totalDeposited == 0 || elapsed == 0 (src/yield/YieldAggregator.sol#232)
YieldAggregator.getSimulatedTotalAssets() (src/yield/YieldAggregator.sol#273-282) uses timestamp for comparisons
	Dangerous comparisons:
	- i < strategies.length (src/yield/YieldAggregator.sol#275)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: cyclomatic-complexity
YieldAggregator.withdrawFromStrategy(uint256,uint256) (src/yield/YieldAggregator.sol#117-156) has a high cyclomatic complexity (12).
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#cyclomatic-complexity
INFO:Detectors:
Detector: missing-inheritance
DSCEngine (src/DSCEngine.sol#56-430) should inherit from IDSCEngine (src/yield/RedemptionContract.sol#8-12)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance
INFO:Detectors:
Detector: naming-convention
Variable DSCEngine.s_priceFeeds (src/DSCEngine.sol#81) is not in mixedCase
Variable DSCEngine.s_DSCMinted (src/DSCEngine.sol#84) is not in mixedCase
Parameter DecentralizedStableCoin.burn(uint256)._amount (src/DecentralizedStableCoin.sol#51) is not in mixedCase
Parameter DecentralizedStableCoin.mint(address,uint256)._to (src/DecentralizedStableCoin.sol#62) is not in mixedCase
Parameter DecentralizedStableCoin.mint(address,uint256)._amount (src/DecentralizedStableCoin.sol#62) is not in mixedCase
Parameter YieldAggregator.setRedemptionContract(address)._redemptionContract (src/yield/YieldAggregator.sol#193) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Detectors:
Detector: cache-array-length
Loop condition i < strategies.length (src/yield/YieldAggregator.sol#222) should use cached array length instead of referencing `length` member of the storage array.
 Loop condition i < s_collateralTokens.length (src/DSCEngine.sol#355) should use cached array length instead of referencing `length` member of the storage array.
 Loop condition i < strategies.length (src/yield/YieldAggregator.sol#275) should use cached array length instead of referencing `length` member of the storage array.
 Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#cache-array-length
INFO:Slither:. analyzed (18 contracts with 100 detectors), 41 result(s) found
**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [unchecked-transfer](#unchecked-transfer) (6 results) (High)
 - [divide-before-multiply](#divide-before-multiply) (2 results) (Medium)
 - [incorrect-equality](#incorrect-equality) (1 results) (Medium)
 - [reentrancy-no-eth](#reentrancy-no-eth) (3 results) (Medium)
 - [uninitialized-local](#uninitialized-local) (1 results) (Medium)
 - [unused-return](#unused-return) (4 results) (Medium)
 - [events-access](#events-access) (1 results) (Low)
 - [missing-zero-check](#missing-zero-check) (2 results) (Low)
 - [reentrancy-benign](#reentrancy-benign) (1 results) (Low)
 - [reentrancy-events](#reentrancy-events) (3 results) (Low)
 - [timestamp](#timestamp) (6 results) (Low)
 - [cyclomatic-complexity](#cyclomatic-complexity) (1 results) (Informational)
 - [missing-inheritance](#missing-inheritance) (1 results) (Informational)
 - [naming-convention](#naming-convention) (6 results) (Informational)
 - [cache-array-length](#cache-array-length) (3 results) (Optimization)
## unchecked-transfer
Impact: High
Confidence: Medium
 - [ ] ID-0
[YieldAggregator.fundYieldReserve(uint256)](src/yield/YieldAggregator.sol#L211-L214) ignores return value by [dsc.transferFrom(msg.sender,address(this),amount)](src/yield/YieldAggregator.sol#L212)

src/yield/YieldAggregator.sol#L211-L214


 - [ ] ID-1
[YieldAggregator.withdrawFromStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L117-L156) ignores return value by [dsc.transfer(msg.sender,dscAmount)](src/yield/YieldAggregator.sol#L153)

src/yield/YieldAggregator.sol#L117-L156


 - [ ] ID-2
[RedemptionContract.redeemDscForWeth(uint256)](src/yield/RedemptionContract.sol#L68-L95) ignores return value by [dsc.transferFrom(msg.sender,address(this),dscAmount)](src/yield/RedemptionContract.sol#L79)

src/yield/RedemptionContract.sol#L68-L95


 - [ ] ID-3
[RedemptionContract.fund(uint256)](src/yield/RedemptionContract.sol#L100-L103) ignores return value by [weth.transferFrom(msg.sender,address(this),wethAmount)](src/yield/RedemptionContract.sol#L101)

src/yield/RedemptionContract.sol#L100-L103


 - [ ] ID-4
[YieldAggregator.withdrawRemainingShares()](src/yield/YieldAggregator.sol#L163-L188) ignores return value by [dsc.transfer(msg.sender,dscOut)](src/yield/YieldAggregator.sol#L185)

src/yield/YieldAggregator.sol#L163-L188


 - [ ] ID-5
[YieldAggregator.depositToStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L86-L110) ignores return value by [dsc.transferFrom(msg.sender,address(this),amount)](src/yield/YieldAggregator.sol#L99)

src/yield/YieldAggregator.sol#L86-L110


## divide-before-multiply
Impact: Medium
Confidence: Medium
 - [ ] ID-6
[DSCEngine._calculateHealthFactor(uint256,uint256)](src/DSCEngine.sol#L331-L337) performs a multiplication on the result of a division:
	- [collateralAdjustedForThreshold = (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION](src/DSCEngine.sol#L335)
	- [(collateralAdjustedForThreshold * PRECISION) / totalDscMinted](src/DSCEngine.sol#L336)

src/DSCEngine.sol#L331-L337


 - [ ] ID-7
[YieldAggregator.withdrawFromStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L117-L156) performs a multiplication on the result of a division:
	- [sharesToBurn = (dscAmount * totalShares) / totalAssets](src/yield/YieldAggregator.sol#L127)
	- [principalReduction = (sharesToBurn * userPrincipal[msg.sender]) / userShares[msg.sender]](src/yield/YieldAggregator.sol#L131-L133)

src/yield/YieldAggregator.sol#L117-L156


## incorrect-equality
Impact: Medium
Confidence: High
 - [ ] ID-8
[YieldAggregator._harvestStrategy(uint256)](src/yield/YieldAggregator.sol#L228-L236) uses a dangerous strict equality:
	- [s.totalDeposited == 0 || elapsed == 0](src/yield/YieldAggregator.sol#L232)

src/yield/YieldAggregator.sol#L228-L236


## reentrancy-no-eth
Impact: Medium
Confidence: Medium
 - [ ] ID-9
Reentrancy in [YieldAggregator.depositToStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L86-L110):
	External calls:
	- [dsc.transferFrom(msg.sender,address(this),amount)](src/yield/YieldAggregator.sol#L99)
	State variables written after the call(s):
	- [strategies[strategyId].totalDeposited += amount](src/yield/YieldAggregator.sol#L107)
	[YieldAggregator.strategies](src/yield/YieldAggregator.sol#L51) can be used in cross function reentrancies:
	- [YieldAggregator.constructor(address)](src/yield/YieldAggregator.sol#L67-L76)
	- [YieldAggregator.getSimulatedTotalAssets()](src/yield/YieldAggregator.sol#L273-L282)
	- [YieldAggregator.getStrategy(uint256)](src/yield/YieldAggregator.sol#L246-L255)
	- [YieldAggregator.getStrategyCount()](src/yield/YieldAggregator.sol#L242-L244)
	- [YieldAggregator.strategies](src/yield/YieldAggregator.sol#L51)
	- [totalAssets += amount](src/yield/YieldAggregator.sol#L102)
	[YieldAggregator.totalAssets](src/yield/YieldAggregator.sol#L39) can be used in cross function reentrancies:
	- [YieldAggregator.getSimulatedTotalAssets()](src/yield/YieldAggregator.sol#L273-L282)
	- [YieldAggregator.getUserInfo(address)](src/yield/YieldAggregator.sol#L257-L267)
	- [YieldAggregator.totalAssets](src/yield/YieldAggregator.sol#L39)
	- [totalShares += sharesToMint](src/yield/YieldAggregator.sol#L101)
	[YieldAggregator.totalShares](src/yield/YieldAggregator.sol#L38) can be used in cross function reentrancies:
	- [YieldAggregator.getUserInfo(address)](src/yield/YieldAggregator.sol#L257-L267)
	- [YieldAggregator.totalShares](src/yield/YieldAggregator.sol#L38)

src/yield/YieldAggregator.sol#L86-L110


 - [ ] ID-10
Reentrancy in [DSCEngine.liquidate(address,address,uint256)](src/DSCEngine.sol#L264-L286):
	External calls:
	- [_redeemCollateral(collateral,totalCollateralRedeemed,user,msg.sender)](src/DSCEngine.sol#L276)
		- [success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral)](src/DSCEngine.sol#L296)
	- [_burnDsc(debtToCover,user,msg.sender)](src/DSCEngine.sol#L278)
		- [success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn)](src/DSCEngine.sol#L305)
		- [i_dsc.burn(amountDscToBurn)](src/DSCEngine.sol#L310)
	State variables written after the call(s):
	- [_burnDsc(debtToCover,user,msg.sender)](src/DSCEngine.sol#L278)
		- [s_DSCMinted[onBehalfOf] -= amountDscToBurn](src/DSCEngine.sol#L303)
	[DSCEngine.s_DSCMinted](src/DSCEngine.sol#L84) can be used in cross function reentrancies:
	- [DSCEngine._burnDsc(uint256,address,address)](src/DSCEngine.sol#L302-L311)
	- [DSCEngine._getAccountInformation(address)](src/DSCEngine.sol#L317-L320)
	- [DSCEngine.mintDsc(uint256)](src/DSCEngine.sol#L195-L203)

src/DSCEngine.sol#L264-L286


 - [ ] ID-11
Reentrancy in [DSCEngine.redeemCollateralForDsc(address,uint256,uint256)](src/DSCEngine.sol#L180-L183):
	External calls:
	- [burnDsc(amountDscToBurn)](src/DSCEngine.sol#L181)
		- [success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn)](src/DSCEngine.sol#L305)
		- [i_dsc.burn(amountDscToBurn)](src/DSCEngine.sol#L310)
	- [redeemCollateral(tokenCollateralAddress,amountCollateral)](src/DSCEngine.sol#L182)
		- [success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral)](src/DSCEngine.sol#L296)
	State variables written after the call(s):
	- [redeemCollateral(tokenCollateralAddress,amountCollateral)](src/DSCEngine.sol#L182)
		- [s_collateralDeposited[from][tokenCollateralAddress] -= amountCollateral](src/DSCEngine.sol#L293)
	[DSCEngine.s_collateralDeposited](src/DSCEngine.sol#L83) can be used in cross function reentrancies:
	- [DSCEngine._redeemCollateral(address,uint256,address,address)](src/DSCEngine.sol#L292-L300)
	- [DSCEngine.depositCollateral(address,uint256)](src/DSCEngine.sol#L163-L172)
	- [DSCEngine.getAccountCollateralValue(address)](src/DSCEngine.sol#L354-L361)
	- [DSCEngine.getCollateralBalanceOfUser(address,address)](src/DSCEngine.sol#L422-L424)

src/DSCEngine.sol#L180-L183


## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-12
[YieldAggregator._harvestAll().newYield](src/yield/YieldAggregator.sol#L221) is a local variable never initialized

src/yield/YieldAggregator.sol#L221


## unused-return
Impact: Medium
Confidence: Medium
 - [ ] ID-13
[DSCEngine.getUsdValue(address,uint256)](src/DSCEngine.sol#L363-L373) ignores return value by [(None,price,None,None,None) = priceFeed.staleCheckLatestRoundData()](src/DSCEngine.sol#L365)

src/DSCEngine.sol#L363-L373


 - [ ] ID-14
[RedemptionContract.redeemDscForWeth(uint256)](src/yield/RedemptionContract.sol#L68-L95) ignores return value by [weth.approve(address(dscEngine),wethOut)](src/yield/RedemptionContract.sol#L86)

src/yield/RedemptionContract.sol#L68-L95


 - [ ] ID-15
[DSCEngine.getTokenAmountFromUsd(address,uint256)](src/DSCEngine.sol#L375-L380) ignores return value by [(None,price,None,None,None) = priceFeed.staleCheckLatestRoundData()](src/DSCEngine.sol#L377)

src/DSCEngine.sol#L375-L380


 - [ ] ID-16
[RedemptionContract.redeemDscForWeth(uint256)](src/yield/RedemptionContract.sol#L68-L95) ignores return value by [dsc.approve(address(dscEngine),dscAmount)](src/yield/RedemptionContract.sol#L82)

src/yield/RedemptionContract.sol#L68-L95


## events-access
Impact: Low
Confidence: Medium
 - [ ] ID-17
[DSCEngine.setRedemptionContract(address)](src/DSCEngine.sol#L214-L216) should emit an event for: 
	- [redemptionContract = rc](src/DSCEngine.sol#L215) 

src/DSCEngine.sol#L214-L216


## missing-zero-check
Impact: Low
Confidence: Medium
 - [ ] ID-18
[DSCEngine.setRedemptionContract(address).rc](src/DSCEngine.sol#L214) lacks a zero-check on :
		- [redemptionContract = rc](src/DSCEngine.sol#L215)

src/DSCEngine.sol#L214


 - [ ] ID-19
[YieldAggregator.setRedemptionContract(address)._redemptionContract](src/yield/YieldAggregator.sol#L193) lacks a zero-check on :
		- [redemptionContract = _redemptionContract](src/yield/YieldAggregator.sol#L194)

src/yield/YieldAggregator.sol#L193


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-20
Reentrancy in [YieldAggregator.depositToStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L86-L110):
	External calls:
	- [dsc.transferFrom(msg.sender,address(this),amount)](src/yield/YieldAggregator.sol#L99)
	State variables written after the call(s):
	- [userPrincipal[msg.sender] += amount](src/yield/YieldAggregator.sol#L105)
	- [userShares[msg.sender] += sharesToMint](src/yield/YieldAggregator.sol#L104)
	- [userStrategyDeposited[msg.sender][strategyId] += amount](src/yield/YieldAggregator.sol#L106)

src/yield/YieldAggregator.sol#L86-L110


## reentrancy-events
Impact: Low
Confidence: Medium
 - [ ] ID-21
Reentrancy in [YieldAggregator.fundYieldReserve(uint256)](src/yield/YieldAggregator.sol#L211-L214):
	External calls:
	- [dsc.transferFrom(msg.sender,address(this),amount)](src/yield/YieldAggregator.sol#L212)
	Event emitted after the call(s):
	- [YieldReserveFunded(amount)](src/yield/YieldAggregator.sol#L213)

src/yield/YieldAggregator.sol#L211-L214


 - [ ] ID-22
Reentrancy in [DSCEngine.redeemCollateralForDsc(address,uint256,uint256)](src/DSCEngine.sol#L180-L183):
	External calls:
	- [burnDsc(amountDscToBurn)](src/DSCEngine.sol#L181)
		- [success = i_dsc.transferFrom(dscFrom,address(this),amountDscToBurn)](src/DSCEngine.sol#L305)
		- [i_dsc.burn(amountDscToBurn)](src/DSCEngine.sol#L310)
	- [redeemCollateral(tokenCollateralAddress,amountCollateral)](src/DSCEngine.sol#L182)
		- [success = IERC20(tokenCollateralAddress).transfer(to,amountCollateral)](src/DSCEngine.sol#L296)
	Event emitted after the call(s):
	- [CollateralRedeemed(from,to,tokenCollateralAddress,amountCollateral)](src/DSCEngine.sol#L294)
		- [redeemCollateral(tokenCollateralAddress,amountCollateral)](src/DSCEngine.sol#L182)

src/DSCEngine.sol#L180-L183


 - [ ] ID-23
Reentrancy in [RedemptionContract.fund(uint256)](src/yield/RedemptionContract.sol#L100-L103):
	External calls:
	- [weth.transferFrom(msg.sender,address(this),wethAmount)](src/yield/RedemptionContract.sol#L101)
	Event emitted after the call(s):
	- [Funded(wethAmount)](src/yield/RedemptionContract.sol#L102)

src/yield/RedemptionContract.sol#L100-L103


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-24
[YieldAggregator.withdrawFromStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L117-L156) uses timestamp for comparisons
	Dangerous comparisons:
	- [totalShares == 0 || totalAssets == 0](src/yield/YieldAggregator.sol#L124)
	- [strategies[strategyId].totalDeposited > stratReduction](src/yield/YieldAggregator.sol#L139-L140)

src/yield/YieldAggregator.sol#L117-L156


 - [ ] ID-25
[YieldAggregator._harvestAll()](src/yield/YieldAggregator.sol#L220-L226) uses timestamp for comparisons
	Dangerous comparisons:
	- [i < strategies.length](src/yield/YieldAggregator.sol#L222)
	- [newYield > 0](src/yield/YieldAggregator.sol#L225)

src/yield/YieldAggregator.sol#L220-L226


 - [ ] ID-26
[YieldAggregator.depositToStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L86-L110) uses timestamp for comparisons
	Dangerous comparisons:
	- [(totalShares == 0 || totalAssets == 0)](src/yield/YieldAggregator.sol#L95-L97)

src/yield/YieldAggregator.sol#L86-L110


 - [ ] ID-27
[YieldAggregator._harvestStrategy(uint256)](src/yield/YieldAggregator.sol#L228-L236) uses timestamp for comparisons
	Dangerous comparisons:
	- [s.totalDeposited == 0 || elapsed == 0](src/yield/YieldAggregator.sol#L232)

src/yield/YieldAggregator.sol#L228-L236


 - [ ] ID-28
[YieldAggregator.withdrawRemainingShares()](src/yield/YieldAggregator.sol#L163-L188) uses timestamp for comparisons
	Dangerous comparisons:
	- [totalShares == 0 || totalAssets == 0](src/yield/YieldAggregator.sol#L169)

src/yield/YieldAggregator.sol#L163-L188


 - [ ] ID-29
[YieldAggregator.getSimulatedTotalAssets()](src/yield/YieldAggregator.sol#L273-L282) uses timestamp for comparisons
	Dangerous comparisons:
	- [i < strategies.length](src/yield/YieldAggregator.sol#L275)

src/yield/YieldAggregator.sol#L273-L282


## cyclomatic-complexity
Impact: Informational
Confidence: High
 - [ ] ID-30
[YieldAggregator.withdrawFromStrategy(uint256,uint256)](src/yield/YieldAggregator.sol#L117-L156) has a high cyclomatic complexity (12).

src/yield/YieldAggregator.sol#L117-L156


## missing-inheritance
Impact: Informational
Confidence: High
 - [ ] ID-31
[DSCEngine](src/DSCEngine.sol#L56-L430) should inherit from [IDSCEngine](src/yield/RedemptionContract.sol#L8-L12)

src/DSCEngine.sol#L56-L430


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-32
Parameter [DecentralizedStableCoin.mint(address,uint256)._to](src/DecentralizedStableCoin.sol#L62) is not in mixedCase

src/DecentralizedStableCoin.sol#L62


 - [ ] ID-33
Parameter [DecentralizedStableCoin.burn(uint256)._amount](src/DecentralizedStableCoin.sol#L51) is not in mixedCase

src/DecentralizedStableCoin.sol#L51


 - [ ] ID-34
Variable [DSCEngine.s_DSCMinted](src/DSCEngine.sol#L84) is not in mixedCase

src/DSCEngine.sol#L84


 - [ ] ID-35
Parameter [DecentralizedStableCoin.mint(address,uint256)._amount](src/DecentralizedStableCoin.sol#L62) is not in mixedCase

src/DecentralizedStableCoin.sol#L62


 - [ ] ID-36
Variable [DSCEngine.s_priceFeeds](src/DSCEngine.sol#L81) is not in mixedCase

src/DSCEngine.sol#L81


 - [ ] ID-37
Parameter [YieldAggregator.setRedemptionContract(address)._redemptionContract](src/yield/YieldAggregator.sol#L193) is not in mixedCase

src/yield/YieldAggregator.sol#L193


## cache-array-length
Impact: Optimization
Confidence: High
 - [ ] ID-38
Loop condition [i < s_collateralTokens.length](src/DSCEngine.sol#L355) should use cached array length instead of referencing `length` member of the storage array.
 
src/DSCEngine.sol#L355


 - [ ] ID-39
Loop condition [i < strategies.length](src/yield/YieldAggregator.sol#L222) should use cached array length instead of referencing `length` member of the storage array.
 
src/yield/YieldAggregator.sol#L222


 - [ ] ID-40
Loop condition [i < strategies.length](src/yield/YieldAggregator.sol#L275) should use cached array length instead of referencing `length` member of the storage array.
 
src/yield/YieldAggregator.sol#L275


