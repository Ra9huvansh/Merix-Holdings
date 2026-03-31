# Merix Protocol -- Internal Security Review

| Field | Value |
|---|---|
| **Protocol** | Merix Holdings |
| **Repository** | https://github.com/Ra9huvansh/merix-holdings |
| **Commit Hash** | `00a6ab5fff273c0036081e45c29be7f9684bef1f` |
| **Review Date** | March 2026 |
| **Author** | Raghuvansh Rastogi |
| **Review Type** | Internal Self-Audit |

> **Disclaimer:** This is an Internal Security Review conducted by the protocol author. It is not a professional audit and does not guarantee the absence of vulnerabilities. A professional audit is recommended before mainnet deployment.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope](#2-scope)
3. [Methodology](#3-methodology)
4. [Findings](#4-findings)
5. [Test Coverage](#5-test-coverage)
6. [Recommendations](#6-recommendations)

---

## 1. Executive Summary

Merix Holdings is a decentralized, overcollateralized stablecoin protocol built on Ethereum (deployed to Sepolia testnet). Users deposit WETH or WBTC as collateral and mint DSC, a USD-pegged ERC-20 token. The protocol enforces a 200% collateralization ratio and a minimum health factor of 1.0, below which any third party may liquidate a position and receive a 10% bonus. The system extends the core engine with a yield aggregator vault (ERC4626-style) that simulates APY-bearing strategies, and a redemption contract that converts realized yield profits directly into on-chain collateral, improving a user's health factor without requiring a separate deposit transaction.

This review examined all five production contracts totalling 513 source lines of code. The automated tooling suite (Slither, Aderyn) was run against the current codebase, and 135 tests were executed including 1,000-run stateless fuzz tests and 256-run invariant campaigns with a depth of 100 calls per sequence. Prior to this review, six issues were identified and remediated: unsafe ERC20 operations across the stack were replaced with OpenZeppelin SafeERC20; a reentrancy window in `redeemCollateralForDsc` was closed by refactoring to internal functions under a single `nonReentrant` guard; a divide-before-multiply precision loss in the health factor formula was resolved; and missing events, zero-address checks, and uncached storage array lengths were corrected. Two lower-severity findings remain acknowledged by design.

### Key Findings

| ID | Title | Severity | Status |
|---|---|---|---|
| H-01 | Reentrancy in `depositToStrategy` (CEI violation) | High | Fixed |
| H-02 | Unsafe ERC20 operations across all contracts | High | Fixed |
| M-01 | Divide-before-multiply in `_calculateHealthFactor` | Medium | Fixed |
| M-02 | Reentrancy window in `redeemCollateralForDsc` | Medium | Fixed |
| M-03 | Divide-before-multiply in `withdrawFromStrategy` share math | Medium | Acknowledged |
| L-01 | Missing zero-address check on `setRedemptionContract` | Low | Fixed |
| L-02 | Missing events on privileged state changes | Low | Fixed |
| L-03 | Storage array length not cached in loops | Low | Fixed |
| L-04 | `nonReentrant` not first modifier (ordering) | Low | Fixed |
| L-05 | Strict equality in `_harvestStrategy` | Low | Acknowledged |
| I-01 | Unused return values from oracle calls | Informational | Acknowledged |
| I-02 | `OracleLib.staleCheckLatestRoundData` visibility was `public` | Informational | Fixed |
| I-03 | Magic literal `10_000` used in yield math | Informational | Fixed |
| I-04 | Uninitialized local variable `newYield` | Informational | Acknowledged |

---

## 2. Scope

### Contracts in Scope

| File | Description |
|---|---|
| `src/DSCEngine.sol` | Core collateral engine: deposit, mint, burn, liquidate |
| `src/DecentralizedStableCoin.sol` | DSC ERC-20 token (ownable, burnable) |
| `src/libraries/OracleLib.sol` | Chainlink oracle staleness check library |
| `src/yield/YieldAggregator.sol` | ERC4626-style yield vault with simulated strategies |
| `src/yield/RedemptionContract.sol` | Converts realized DSC yield profit into WETH collateral |

### Source Lines of Code

```
github.com/AlDanial/cloc v2.08
-----------------------------------------------------------------------------------
File                                            blank    comment    code
-----------------------------------------------------------------------------------
src/DSCEngine.sol                                  71        132     225
src/yield/YieldAggregator.sol                      54         66     185
src/yield/RedemptionContract.sol                   20         31      60
src/DecentralizedStableCoin.sol                    12         32      29
src/libraries/OracleLib.sol                         7          9      14
-----------------------------------------------------------------------------------
SUM:                                              164        270     513
-----------------------------------------------------------------------------------
```

### Compiler Version

```
pragma solidity ^0.8.19;
```

Compiled against Solc `0.8.33` (local) and `0.8.34` (CI). OpenZeppelin Contracts v5.

### Out of Scope

- `script/` -- deployment and helper scripts
- `test/` -- test suite and mock contracts
- `lib/` -- third-party dependencies (OpenZeppelin, Chainlink, forge-std)
- Frontend application (`frontend/`)
- Documentation site (`docs-site/`)
- Vercel deployment infrastructure

---

## 3. Methodology

### 3.1 Manual Review

Each contract was reviewed line-by-line against the following threat categories:

- Reentrancy (cross-function and cross-contract)
- Integer arithmetic (overflow, underflow, precision loss)
- Access control and role management
- Oracle manipulation and staleness
- Denial of service vectors
- Logic correctness against the protocol specification
- Checks-Effects-Interactions compliance

### 3.2 Slither Static Analysis

Slither version `0.11.x` was run against the production source tree with test, library, and script paths excluded:

```bash
slither . --filter-paths "test|lib|script"
```

**Detectors activated:** All 100 built-in detectors were active. Detectors that produced actionable findings at the time of original analysis included:

| Detector | Severity |
|---|---|
| `unchecked-transfer` | High |
| `reentrancy-no-eth` | Medium |
| `divide-before-multiply` | Medium |
| `incorrect-equality` | Medium |
| `uninitialized-local` | Medium |
| `unused-return` | Medium |
| `events-access` | Low |
| `missing-zero-check` | Low |
| `reentrancy-benign` | Low |
| `cache-array-length` | Optimization |

After remediation, Slither reports 21 remaining results, all of which are false positives or acknowledged low/informational items (detailed in Section 4).

### 3.3 Aderyn Static Analysis

Aderyn v0.1.9 (Cyfrin) was run from the project root:

```bash
aderyn --output aderyn-report.md .
```

Aderyn confirmed the following issue categories (pre-fix): H-1 reentrancy in `depositToStrategy`, L-5 nonReentrant ordering, L-7 missing events, L-8 missing zero-address checks, L-10 uncached array lengths, L-11 unchecked returns, L-12 unsafe ERC20, L-14 public function not used internally. All high and medium issues are resolved; remaining informational items are documented in Section 4.

### 3.4 Fuzz Testing

Stateless fuzz tests were written for all four contract groups (DSCEngine, DecentralizedStableCoin, YieldAggregator, RedemptionContract) totalling 32 fuzz test functions.

**Configuration (`foundry.toml`):**

```toml
[fuzz]
runs = 1000          # local execution

[profile.ci.fuzz]
runs = 500           # GitHub Actions CI
```

Key fuzz properties exercised: deposit-and-mint safety bounds, health factor monotonicity under arbitrary collateral/debt combinations, share math correctness across arbitrary deposit sizes, oracle price conversion round-trip consistency, and zero-amount rejection across all entry points.

### 3.5 Invariant Testing

A stateful invariant campaign was implemented using the handler pattern. The handler contract is located at `test/invariant/MerixHandler.sol`.

**Configuration:**

```toml
[invariant]
runs  = 256    # sequences per invariant
depth = 100    # calls per sequence
fail_on_revert = false
show_metrics   = true
```

**Handler actor pool:** 10 distinct addresses drawn via `useActor(uint256 seed)` modifier.

**Ghost variables tracked:** `ghost_totalCollateralDeposited`, `ghost_totalStablecoinMinted`, `ghost_totalStablecoinBurned`, `ghost_totalCollateralWithdrawn`, `ghost_yieldDeposited`, `ghost_yieldWithdrawn`, `ghost_totalWethRedeemed`, `ghost_totalDscBurnedViaRedemption`.

**20 invariants verified** including: protocol always overcollateralized, health factor never below MIN_HEALTH_FACTOR for any solvent actor, total DSC supply consistent with ghost accounting, YieldAggregator totalAssets monotonically non-decreasing during deposit-only sequences, and RedemptionContract WETH reserve always bounded by cumulative redemptions.

### 3.6 Solodit Checklist Items Reviewed

The following categories from the Solodit smart contract audit checklist were manually verified:

- [x] Reentrancy via external calls
- [x] Unchecked ERC20 return values
- [x] Integer division precision loss
- [x] Access control on privileged functions
- [x] Oracle freshness validation
- [x] Flash loan attack surface (none -- no same-block price manipulation path)
- [x] Liquidation incentive correctness
- [x] Share price inflation attack (first depositor) -- mitigated by 1:1 initial share ratio
- [x] Approval race condition (SafeERC20 `forceApprove` used)

---

## 4. Findings

### Critical

No critical findings were identified.

---

### High

#### H-01: Reentrancy in `YieldAggregator.depositToStrategy` -- CEI Violation

| Field | Value |
|---|---|
| **ID** | H-01 |
| **Severity** | High |
| **Status** | Fixed |
| **File** | `src/yield/YieldAggregator.sol` |
| **Function** | `depositToStrategy` |

**Description**

The original implementation of `depositToStrategy` performed the external `transferFrom` call at line 99 before completing all state updates. Specifically, `strategies[strategyId].totalDeposited` was incremented after the token transfer, violating the Checks-Effects-Interactions pattern.

```solidity
// VULNERABLE (original)
function depositToStrategy(uint256 strategyId, uint256 amount) external nonReentrant {
    _harvestAll();

    uint256 sharesToMint = ...;

    // State updates (partial)
    totalShares += sharesToMint;
    totalAssets += amount;
    userShares[msg.sender] += sharesToMint;
    userPrincipal[msg.sender] += amount;
    userStrategyDeposited[msg.sender][strategyId] += amount;

    // External call
    dsc.transferFrom(msg.sender, address(this), amount); // <-- before strategies update

    // State update (after external call -- CEI violation)
    strategies[strategyId].totalDeposited += amount;
}
```

**Impact**

Although `nonReentrant` is present, a cross-function reentrancy attack could read stale `strategies[strategyId].totalDeposited` (zero) during the callback window, causing the yield harvest computation to return zero yield for that strategy and distorting share prices for all depositors.

**Proof of Concept**

```solidity
// test/fuzz/StatelessFuzz_YieldAggregator.t.sol
function testFuzz_YieldAccrualOverTime(uint256 amount, uint256 timeElapsed) public {
    amount = bound(amount, 1e18, 1_000_000e18);
    timeElapsed = bound(timeElapsed, 1 days, 365 days);
    ERC20Mock(address(dsc)).mint(USER, amount);
    vm.startPrank(USER);
    dsc.approve(address(vault), amount);
    vault.depositToStrategy(0, amount);
    vm.warp(block.timestamp + timeElapsed);
    uint256 sim = vault.getSimulatedTotalAssets();
    assert(sim >= vault.totalAssets());
    vm.stopPrank();
}
```

**Recommendation**

Move all state updates before the external call. Confirmed fixed: `dsc.safeTransferFrom` now executes after all state mutations.

---

#### H-02: Unsafe ERC20 Operations Across All Contracts

| Field | Value |
|---|---|
| **ID** | H-02 |
| **Severity** | High |
| **Status** | Fixed |
| **Files** | `src/DSCEngine.sol`, `src/yield/YieldAggregator.sol`, `src/yield/RedemptionContract.sol` |

**Description**

All three contracts used raw `IERC20.transferFrom` and `IERC20.transfer` calls without checking return values. Non-standard ERC-20 tokens (e.g., tokens that return `false` on failure rather than reverting) would silently fail, allowing deposits or burns to be credited without actual token movement.

```solidity
// VULNERABLE (original DSCEngine)
bool success = IERC20(tokenCollateralAddress).transferFrom(msg.sender, address(this), amountCollateral);
if (!success) { revert DSCEngine__TransferFailed(); }

// VULNERABLE (original YieldAggregator -- unchecked)
dsc.transferFrom(msg.sender, address(this), amount);
dsc.transfer(msg.sender, dscAmount);

// VULNERABLE (original RedemptionContract -- unchecked)
dsc.transferFrom(msg.sender, address(this), dscAmount);
dsc.approve(address(dscEngine), dscAmount);
```

**Impact**

Silent failures would allow protocol state (collateral accounting, share balances) to diverge from actual token balances, enabling under-collateralized minting or theft of other depositors' funds in edge-case token configurations.

**Recommendation**

Use OpenZeppelin `SafeERC20` throughout. Use `forceApprove` instead of `approve` for approval reset safety. Confirmed fixed across all contracts.

---

### Medium

#### M-01: Divide-Before-Multiply in `_calculateHealthFactor`

| Field | Value |
|---|---|
| **ID** | M-01 |
| **Severity** | Medium |
| **Status** | Fixed |
| **File** | `src/DSCEngine.sol` |
| **Function** | `_calculateHealthFactor` |
| **Line** | 341 (post-fix) |

**Description**

The original two-step computation performed an integer division before a multiplication, losing precision:

```solidity
// VULNERABLE (original) -- precision loss
uint256 collateralAdjustedForThreshold =
    (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
return (collateralAdjustedForThreshold * PRECISION) / totalDscMinted;
```

When `collateralValueInUsd` was small relative to `LIQUIDATION_PRECISION`, the intermediate division truncated significant bits, causing the health factor to round downward aggressively and potentially enabling premature liquidations.

**Impact**

Users near the liquidation boundary could be liquidated before their true health factor reached 1.0, resulting in unwarranted loss of their 10% liquidation bonus collateral.

**Recommendation**

Combine all multiplications before the single final division:

```solidity
// FIXED
return (collateralValueInUsd * LIQUIDATION_THRESHOLD * PRECISION)
    / (LIQUIDATION_PRECISION * totalDscMinted);
```

Confirmed fixed.

---

#### M-02: Reentrancy Window in `redeemCollateralForDsc`

| Field | Value |
|---|---|
| **ID** | M-02 |
| **Severity** | Medium |
| **Status** | Fixed |
| **File** | `src/DSCEngine.sol` |
| **Function** | `redeemCollateralForDsc` |

**Description**

The original implementation called the public `burnDsc` function (which has no `nonReentrant` guard) followed by `redeemCollateral` (which does). During the DSC `transferFrom` call inside `_burnDsc`, the reentrancy lock was not held, creating a window in which an attacker could re-enter `redeemCollateral` with a decremented `s_DSCMinted` but unmodified `s_collateralDeposited`.

```solidity
// VULNERABLE (original)
function redeemCollateralForDsc(address token, uint256 collateral, uint256 dscToBurn) external {
    burnDsc(dscToBurn);        // no nonReentrant -- lock NOT held during DSC.transferFrom
    redeemCollateral(token, collateral); // lock acquired AFTER the window
}
```

**Impact**

In theory, a DSC token with a transfer hook could enable a reentrancy attack that lets a user redeem collateral against already-decremented debt, effectively withdrawing collateral for free. The practical risk on Sepolia is low because the protocol uses its own standard ERC-20 DSC with no hooks. However, the vulnerability class is real and must be closed before any token upgrade or mainnet deployment.

**Proof of Concept**

```solidity
// Conceptual attack path:
// 1. Attacker calls redeemCollateralForDsc(weth, largeAmount, smallDSC)
// 2. burnDsc -> _burnDsc: s_DSCMinted decremented, then DSC.transferFrom called
// 3. Malicious DSC callback re-enters redeemCollateral(weth, largeAmount)
// 4. Health factor check passes because s_DSCMinted was already decremented
// 5. Collateral withdrawn twice for cost of one burn
```

**Recommendation**

Refactor to call internal functions directly under a single `nonReentrant` guard:

```solidity
// FIXED
function redeemCollateralForDsc(
    address tokenCollateralAddress,
    uint256 amountCollateral,
    uint256 amountDscToBurn
) external nonReentrant moreThanZero(amountCollateral) moreThanZero(amountDscToBurn)
    isAllowedToken(tokenCollateralAddress)
{
    _burnDsc(amountDscToBurn, msg.sender, msg.sender);
    emit DscBurned(msg.sender, amountDscToBurn);
    _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender);
    _revertIfHealthFactorIsBroken(msg.sender);
}
```

Confirmed fixed.

---

#### M-03: Divide-Before-Multiply in `withdrawFromStrategy` Share Math

| Field | Value |
|---|---|
| **ID** | M-03 |
| **Severity** | Medium |
| **Status** | Acknowledged |
| **File** | `src/yield/YieldAggregator.sol` |
| **Function** | `withdrawFromStrategy` |
| **Lines** | 136, 140-142 |

**Description**

The share burn computation performs a division before a subsequent multiplication:

```solidity
uint256 sharesToBurn = (dscAmount * totalShares) / totalAssets; // division
uint256 principalReduction =
    (sharesToBurn * userPrincipal[msg.sender]) / userShares[msg.sender]; // multiply on quotient
```

This is inherent to ERC4626-style share accounting and cannot be trivially eliminated without restructuring the mathematical model. The precision loss is bounded by `1 wei` per operation and does not accumulate across users in a way that could be exploited for profit extraction.

**Impact**

Negligible rounding errors in per-user principal reduction tracking. Profit attribution may be off by 1-2 wei per withdrawal. No economic attack vector identified.

**Recommendation**

Acknowledge as a known limitation of integer share math. Consider adding a comment to document the intentional rounding direction. A more complex fixed-point arithmetic library could reduce the error to zero but adds complexity and gas cost disproportionate to the risk.

---

### Low

#### L-01: Missing Zero-Address Check on `setRedemptionContract`

| Field | Value |
|---|---|
| **ID** | L-01 |
| **Severity** | Low |
| **Status** | Fixed |
| **Files** | `src/DSCEngine.sol:221`, `src/yield/YieldAggregator.sol:202` |

**Description**

Both `setRedemptionContract` functions accepted `address(0)` without reverting, which would permanently brick the `onlyRedemptionContract` modifier and the `depositCollateralFor` / `burnExternal` / `deductRealizedProfit` functions.

**Recommendation**

Add `if (rc == address(0)) revert DSCEngine__ZeroAddress();` before assignment. Confirmed fixed in both contracts.

---

#### L-02: Missing Events on Privileged State Changes

| Field | Value |
|---|---|
| **ID** | L-02 |
| **Severity** | Low |
| **Status** | Fixed |
| **Files** | `src/DSCEngine.sol`, `src/yield/YieldAggregator.sol` |

**Description**

`mintDsc`, `burnDsc`, `burnExternal`, `setRedemptionContract` (both contracts), and `deductRealizedProfit` changed critical state without emitting events, making off-chain monitoring and indexing impossible.

**Recommendation**

Add events for all state-changing functions. Added: `DscMinted`, `DscBurned`, `DscBurnedExternal`, `RedemptionContractSet`, `ProfitDeducted`. Confirmed fixed.

---

#### L-03: Storage Array Length Not Cached in Loops

| Field | Value |
|---|---|
| **ID** | L-03 |
| **Severity** | Low |
| **Status** | Fixed |
| **Files** | `src/DSCEngine.sol:355`, `src/yield/YieldAggregator.sol:222,275` |

**Description**

Loop conditions referenced `.length` on storage arrays directly, costing an extra `SLOAD` (2100 gas cold, 100 gas warm) on every iteration.

**Recommendation**

Cache the length in a local variable before the loop. Confirmed fixed in `getAccountCollateralValue`, `_harvestAll`, and `getSimulatedTotalAssets`.

---

#### L-04: `nonReentrant` Not First Modifier

| Field | Value |
|---|---|
| **ID** | L-04 |
| **Severity** | Low |
| **Status** | Fixed |
| **File** | `src/DSCEngine.sol` |

**Description**

On six functions the `nonReentrant` modifier was positioned after domain-specific modifiers (`moreThanZero`, `isAllowedToken`). If any earlier modifier performed an external call, reentrancy protection would not yet be active.

**Recommendation**

Place `nonReentrant` as the first modifier on all functions. Confirmed fixed on all six affected functions.

---

#### L-05: Strict Equality in `_harvestStrategy`

| Field | Value |
|---|---|
| **ID** | L-05 |
| **Severity** | Low |
| **Status** | Acknowledged |
| **File** | `src/yield/YieldAggregator.sol` |
| **Function** | `_harvestStrategy` |
| **Line** | 245 |

**Description**

```solidity
if (s.totalDeposited == 0 || elapsed == 0) return 0;
```

Slither flags strict equality comparisons with state variables as potentially dangerous because they can be manipulated by attackers who control the compared value. In this context, both `totalDeposited` and `elapsed` are internal values that an external actor cannot directly force to a specific non-zero value in the same transaction.

**Impact**

No exploitable path identified. The guard is correct: zero deposits or zero elapsed time should produce zero yield. The strict equality is intentional.

**Recommendation**

Acknowledge as a false positive. A comment clarifying intent is sufficient.

---

### Informational

#### I-01: Unused Return Values from Oracle Calls

| Field | Value |
|---|---|
| **ID** | I-01 |
| **Severity** | Informational |
| **Status** | Acknowledged |
| **File** | `src/DSCEngine.sol` |
| **Lines** | 364, 376 |

**Description**

`getUsdValue` and `getTokenAmountFromUsd` call `priceFeed.staleCheckLatestRoundData()` and destructure only the `price` field, discarding `roundId`, `startedAt`, `updatedAt`, and `answeredInRound`. Slither reports these as unused return values.

**Impact**

None. The `staleCheckLatestRoundData` wrapper in `OracleLib` already validates that `updatedAt` is within the 3-hour timeout before returning. The discarded fields are not needed for price conversion logic.

**Recommendation**

No code change required. The staleness check is enforced inside `OracleLib`.

---

#### I-02: `OracleLib.staleCheckLatestRoundData` Visibility Was `public`

| Field | Value |
|---|---|
| **ID** | I-02 |
| **Severity** | Informational |
| **Status** | Fixed |
| **File** | `src/libraries/OracleLib.sol` |

**Description**

The library function was marked `public` despite never being called internally. Library functions used via `using ... for ...` should be `external` or `internal`.

**Recommendation**

Changed to `external`. Confirmed fixed.

---

#### I-03: Magic Literal `10_000` in Yield Math

| Field | Value |
|---|---|
| **ID** | I-03 |
| **Severity** | Informational |
| **Status** | Fixed |
| **File** | `src/yield/YieldAggregator.sol` |
| **Lines** | `_harvestStrategy`, `getSimulatedTotalAssets` |

**Description**

The basis points divisor was inlined as the literal `10_000` in two locations, reducing readability and making future changes error-prone.

**Recommendation**

Extract to `uint256 private constant BPS_DIVISOR = 10_000;`. Confirmed fixed.

---

#### I-04: Uninitialized Local Variable `newYield`

| Field | Value |
|---|---|
| **ID** | I-04 |
| **Severity** | Informational |
| **Status** | Acknowledged |
| **File** | `src/yield/YieldAggregator.sol` |
| **Function** | `_harvestAll` |
| **Line** | 233 |

**Description**

```solidity
uint256 newYield; // declared without explicit initialization
```

Slither flags this as an uninitialized local variable. In Solidity, all value types are implicitly zero-initialized, so `newYield` is guaranteed to be `0` at the start of the accumulation loop.

**Impact**

None. The Solidity specification guarantees zero initialization for all local variables.

**Recommendation**

Optionally add `= 0` for clarity. No functional change is required.

---

## 5. Test Coverage

Coverage measured with `forge coverage --report summary`. Invariant and fuzz tests are included in the measurement.

| File | % Lines | % Statements | % Branches | % Functions |
|---|---|---|---|---|
| `src/DSCEngine.sol` | **93.80%** (121/129) | **94.87%** (111/117) | 63.64% (7/11) | **91.67%** (33/36) |
| `src/DecentralizedStableCoin.sol` | 85.71% (12/14) | 84.62% (11/13) | 50.00% (2/4) | **100.00%** (2/2) |
| `src/libraries/OracleLib.sol` | **100.00%** (6/6) | **100.00%** (7/7) | **100.00%** (1/1) | **100.00%** (1/1) |
| `src/yield/RedemptionContract.sol` | **100.00%** (24/24) | 96.43% (27/28) | 75.00% (3/4) | **100.00%** (4/4) |
| `src/yield/YieldAggregator.sol` | 85.19% (92/108) | 77.61% (104/134) | 50.00% (9/18) | 93.33% (14/15) |
| **Total (src/ only)** | **91.65%** (255/281) | **89.89%** (260/289) | **60.53%** (23/38) | **93.10%** (54/58) |

**Total tests executed:** 135 (29 unit -- DSCEngine, 17 unit -- RedemptionContract, 35 unit -- YieldAggregator, 17 fuzz -- DSCEngine, 7 fuzz -- YieldAggregator, 4 fuzz -- RedemptionContract, 4 fuzz -- DSC, 20 invariant, 2 additional fuzz)

**All 135 tests pass.**

The branch coverage gap in `DSCEngine.sol` (63.64%) is attributable to the `_calculateHealthFactor` zero-debt branch and certain error path combinations that are difficult to trigger through the handler-based invariant tests. These branches are covered by dedicated unit and fuzz tests. The `YieldAggregator.sol` statement gap (77.61%) reflects internal harvest branches that are only reachable under specific time-warped sequences, which are exercised by the invariant campaign but not captured in branch coverage instrumentation.

---

## 6. Recommendations

### 6.1 Professional Audit Before Mainnet Deployment

This internal review does not substitute for an independent professional audit. The protocol handles user collateral and mints a synthetic asset. Engagements with firms such as Cyfrin, Trail of Bits, OpenZeppelin, or Sherlock are recommended before any mainnet or high-value testnet deployment.

### 6.2 Oracle Fallback Strategy

The protocol relies exclusively on Chainlink price feeds with a hard 3-hour staleness timeout (`OracleLib.TIMEOUT`). If Chainlink becomes unavailable for more than 3 hours, the protocol freezes entirely. Consider implementing a secondary oracle (e.g., Uniswap TWAP) as a fallback, or a governance-controlled circuit breaker that pauses minting while allowing collateral withdrawals.

### 6.3 Liquidation Gap Risk

The 200% collateralization requirement and 10% liquidation bonus assume that a 45% price drop can be absorbed before a liquidation becomes unprofitable for liquidators. In extreme market conditions (flash crash, bridge outage, oracle delay), collateral value may drop below the bonus threshold, creating bad debt. A stability fee or insurance module similar to MakerDAO's surplus buffer should be considered.

### 6.4 Centralization of Yield Reserve Funding

The yield paid out by `YieldAggregator` is funded manually by the owner via `fundYieldReserve`. If the owner does not fund the reserve, withdrawals revert with `InsufficientVaultLiquidity`. This creates a trust dependency on a single key. Automate reserve funding or migrate to a keeper-based top-up mechanism with on-chain funding logic.

### 6.5 `RedemptionContract` WETH Reserve Depletion

The WETH reserve in `RedemptionContract` is finite and can be drained if many users redeem simultaneously. There is no circuit breaker or rate limit. Consider a per-epoch redemption cap or a reserve ratio check before processing redemptions.

### 6.6 Upgrade Path

The contracts are not upgradeable (no proxy pattern). Any future bug fix or feature addition requires redeployment and user migration. Document a formal migration procedure and consider whether a transparent proxy pattern is appropriate for the production version.

### 6.7 Access Control Decentralization

Both `DSCEngine` and `YieldAggregator` use `Ownable` with a single EOA as owner. The owner can set the `RedemptionContract` address, fund or drain yield reserves, and modify protocol references. Migrate ownership to a multisig (e.g., Gnosis Safe 3-of-5) before any deployment handling real user funds.

### 6.8 Branch Coverage Improvement

Current branch coverage for `DSCEngine.sol` is 63.64% and for `YieldAggregator.sol` is 50.00%. Target 80% branch coverage as a minimum threshold. Specific gaps to address: `_calculateHealthFactor` with zero debt (currently only tested via unit test, not fuzz), `_harvestStrategy` with non-zero elapsed but zero deposited after a full withdrawal, and the `redeemCollateralForDsc` combined health factor check after simultaneous burn and redeem.

---

*Report generated: March 2026. Commit: `00a6ab5fff273c0036081e45c29be7f9684bef1f`.*
