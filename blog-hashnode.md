# I Audited My Own DeFi Protocol — Here's Every Bug I Found (And How I Fixed Them)

> *"The scariest thing about writing smart contracts isn't that the code is complex. It's that the code looks fine — right until the moment it isn't."*

---

Let me set the scene.

It's late. You've been writing Solidity for weeks. Your stablecoin protocol is deployed on testnet. The frontend works. Transactions go through. Users can deposit collateral, mint tokens, earn yield. Everything looks beautiful.

And then a quiet voice in the back of your head whispers: *"But have you actually checked?"*

That voice is your best friend. I listened to it. And what it led me to find, buried inside code I had written myself, code I had stared at for hours, genuinely surprised me.

This is the story of how I audited **Merix Holdings**, my own decentralized stablecoin protocol, using two of the most powerful static analysis tools in the Solidity ecosystem: **Slither** and **Aderyn**. I found bugs ranging from a high-severity reentrancy hole to a math mistake that could have liquidated innocent users too early. I'll show you every single one, in plain language, with real code.

Buckle up.

---

## Wait, What Even Is Merix?

Before we get into the bugs, let me give you thirty seconds of context.

Merix is a **decentralized, overcollateralized stablecoin protocol** built on Ethereum (currently deployed on the Sepolia testnet). Here's the whole thing in three bullet points:

- You deposit **WETH or WBTC** as collateral into the protocol.
- The protocol lets you mint **DSC** (a USD-pegged ERC-20 stablecoin) against that collateral.
- The system enforces a **200% collateralization ratio** at all times. If your position drops below that, anyone can liquidate you and earn a 10% bonus.

On top of that core engine, I built two extra pieces:

- A **YieldAggregator**: an ERC4626-style vault where users deposit DSC and earn simulated yield (think: strategy-based APY).
- A **RedemptionContract**: a clever mechanism that converts your realized yield profits directly into WETH collateral, improving your health factor without you having to do a separate deposit.

Five smart contracts. 513 lines of production code. One internal security review.

Here's everything that went wrong.

---

## The Audit Setup: What Tools Did I Use?

I ran **three layers** of analysis:

### 1. Manual Line-by-Line Review
I went through every contract function by function, asking myself: *"How would I steal from this?"* I checked for reentrancy, bad math, access control gaps, oracle manipulation, and logic errors against the protocol spec.

### 2. Slither (Trail of Bits)
Slither is a static analysis framework with over 100 detectors. It reads your Solidity AST and finds patterns that match known vulnerability classes: unchecked return values, reentrancy, divide-before-multiply, and more.

```bash
slither . --filter-paths "test|lib|script"
```

### 3. Aderyn (Cyfrin)
Aderyn is a newer Rust-based static analyzer from the team at Cyfrin, the same people behind Codehawks and security research in the DeFi space. It has a cleaner output format and catches a slightly different set of patterns than Slither.

```bash
aderyn --output aderyn-report.md .
```

### 4. Fuzz + Invariant Testing (Foundry)
This wasn't just static analysis. I wrote **135 tests** including:
- 32 stateless fuzz test functions (1,000 runs each locally)
- A full invariant campaign with 256 sequences × 100 calls deep
- 20 invariant properties that had to hold across all of them

Now let's get to the good part.

---

## Finding #1: The Reentrancy Bug I Almost Missed

**Severity: HIGH | Status: Fixed**

Here's a fun psychological trick: when you write a function and add `nonReentrant` to it, your brain says *"okay, that's safe"* and moves on. That's exactly what happened to me.

The function `depositToStrategy` in `YieldAggregator.sol` had `nonReentrant` on it. But the lock only works if it's active *before* the external call happens. My original code did this:

```solidity
// THE VULNERABLE VERSION
function depositToStrategy(uint256 strategyId, uint256 amount) external nonReentrant {
    _harvestAll();

    uint256 sharesToMint = ...;

    // First, update some state...
    totalShares += sharesToMint;
    totalAssets += amount;
    userShares[msg.sender] += sharesToMint;
    userPrincipal[msg.sender] += amount;
    userStrategyDeposited[msg.sender][strategyId] += amount;

    // Then make the external call...
    dsc.transferFrom(msg.sender, address(this), amount);

    // Then update the REST of the state -- AFTER the external call
    strategies[strategyId].totalDeposited += amount;  // <-- THIS IS THE PROBLEM
}
```

Did you catch it?

`strategies[strategyId].totalDeposited` was being updated **after** the external `transferFrom` call. This is a violation of the **Checks-Effects-Interactions (CEI)** pattern, one of the oldest rules in Solidity security.

Here's why this matters. During the `transferFrom` callback window, if an attacker could somehow re-enter the contract (say, via a malicious token or a cross-function call), they would read `strategies[strategyId].totalDeposited` as **zero**, because it hasn't been updated yet. The yield harvest math would then return zero yield for that strategy, distorting share prices for **every depositor in the vault**.

Both **Aderyn** (H-1) and **Slither** (`reentrancy-no-eth`) independently flagged this. The fix was simple: move all state updates above the external call.

```solidity
// THE FIXED VERSION
// All state changes happen BEFORE the external call
strategies[strategyId].totalDeposited += amount;

// Now the external call is last -- nothing can read stale state
dsc.safeTransferFrom(msg.sender, address(this), amount);
```

Lesson learned: `nonReentrant` is not a magic wand. CEI is still the law.

---

## Finding #2: The Silent Money Thief — Unsafe ERC20

**Severity: HIGH | Status: Fixed**

This one is sneaky because the code looks completely reasonable.

Across three contracts (`DSCEngine`, `YieldAggregator`, and `RedemptionContract`), I was using raw ERC-20 calls like this:

```solidity
// Looks fine, right?
bool success = IERC20(tokenCollateralAddress).transferFrom(msg.sender, address(this), amountCollateral);
if (!success) { revert DSCEngine__TransferFailed(); }

// Or even worse -- no check at all:
dsc.transferFrom(msg.sender, address(this), amount);
dsc.transfer(msg.sender, dscAmount);
```

Here's the dirty secret of the ERC-20 standard: **not all tokens follow it correctly.**

Some tokens (USDT being the most famous example) don't return a boolean from `transfer`. Some return `false` on failure instead of reverting. If you call `.transferFrom()` on one of these tokens without using SafeERC20, the call **silently does nothing**, but your contract happily records the deposit as if it succeeded.

Imagine a user deposits 1,000 WETH as collateral. The transfer silently fails. But the contract says they have 1,000 WETH deposited. They mint DSC against it. They've essentially printed money from nothing.

**All three contracts** had this across 11 different call sites. Slither's `unchecked-transfer` detector and Aderyn's L-12 both lit up like a Christmas tree.

The fix: replace every raw transfer with OpenZeppelin's `SafeERC20`. And for approvals, use `forceApprove` instead of `approve` to handle the USDT-style approval reset pattern.

```solidity
// The right way
using SafeERC20 for IERC20;

IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
IERC20(token).safeTransfer(to, amount);
IERC20(token).forceApprove(spender, amount);
```

---

## Finding #3: The Math Bug That Could Liquidate You Early

**Severity: MEDIUM | Status: Fixed**

This one is my personal favourite because it's so subtle that you can stare at the formula and think it's correct. And mathematically, it is. But **in Solidity**, integer division truncates, and the order of operations matters enormously.

The health factor formula in `_calculateHealthFactor` originally looked like this:

```solidity
// THE BUGGY VERSION
uint256 collateralAdjustedForThreshold =
    (collateralValueInUsd * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;

return (collateralAdjustedForThreshold * PRECISION) / totalDscMinted;
```

See the issue? It divides **first**, then multiplies. In real math, this is fine. In Solidity, the first division truncates the result to an integer, destroying precision before the second multiplication can recover it.

Here's a concrete example:

- `collateralValueInUsd` = $1,500 (in wei scale: 1500e18)
- `LIQUIDATION_THRESHOLD` = 50
- `LIQUIDATION_PRECISION` = 100

Step 1: `(1500e18 * 50) / 100` = `750e18` ✓ (this happens to be exact here)

But with smaller numbers near the boundary, the truncation rounds down aggressively. A user with a true health factor of **1.01** might get computed as **0.99**, and suddenly they're liquidatable when they shouldn't be.

A user losing their 10% liquidation bonus collateral for no reason is not a rounding error. It's a financial loss caused by a math ordering mistake.

The fix is one line: combine all the multiplications first, then do a single division at the end.

```solidity
// THE FIXED VERSION
return (collateralValueInUsd * LIQUIDATION_THRESHOLD * PRECISION)
    / (LIQUIDATION_PRECISION * totalDscMinted);
```

Maximum multiplication first, single division last. Precision preserved.

---

## Finding #4: The "Invisible Window" Reentrancy

**Severity: MEDIUM | Status: Fixed**

Remember how I said `nonReentrant` isn't magic? Here's another proof.

The function `redeemCollateralForDsc` lets users burn their DSC and get their collateral back in one transaction. The original code did this:

```solidity
// THE VULNERABLE VERSION
function redeemCollateralForDsc(address token, uint256 collateral, uint256 dscToBurn) external {
    burnDsc(dscToBurn);        // <-- no nonReentrant, lock NOT held
    redeemCollateral(token, collateral); // <-- lock acquired HERE
}
```

The problem: `burnDsc` is a `public` function with no `nonReentrant` modifier. Inside `burnDsc`, there's a call to `DSC.transferFrom`, an external call. During that external call, the reentrancy lock is **not held**.

An attacker with a DSC token that has transfer hooks (or a future upgraded DSC token) could:

1. Call `redeemCollateralForDsc(weth, largeAmount, smallDSC)`
2. During the `DSC.transferFrom` inside `burnDsc`, re-enter `redeemCollateral` directly
3. At this point, `s_DSCMinted` is already decremented (debt looks paid off), but `s_collateralDeposited` is not yet decremented
4. Health factor check passes; attacker withdraws collateral for free
5. They've essentially redeemed collateral twice for the cost of one burn

The fix: stop calling public functions from within each other. Use internal functions under a single `nonReentrant` guard:

```solidity
// THE FIXED VERSION
function redeemCollateralForDsc(
    address tokenCollateralAddress,
    uint256 amountCollateral,
    uint256 amountDscToBurn
) external nonReentrant moreThanZero(amountCollateral) moreThanZero(amountDscToBurn) {
    _burnDsc(amountDscToBurn, msg.sender, msg.sender);    // internal
    _redeemCollateral(tokenCollateralAddress, amountCollateral, msg.sender, msg.sender); // internal
    _revertIfHealthFactorIsBroken(msg.sender);
}
```

One lock. One atomic operation. No windows.

---

## The "Small" Things That Add Up

Not every finding is a catastrophic money-printer exploit. Here's a rapid-fire tour of the lower-severity stuff, because in security, the small things are how you tell if a codebase is mature.

### `nonReentrant` Was in the Wrong Position

Six functions had `nonReentrant` listed *after* other modifiers like `moreThanZero` and `isAllowedToken`. The rule: **`nonReentrant` must be first.** If any modifier before it makes an external call, reentrancy protection doesn't kick in in time.

```solidity
// WRONG ORDER
function depositCollateral(...) public moreThanZero(amount) isAllowedToken(token) nonReentrant { }

// CORRECT ORDER
function depositCollateral(...) public nonReentrant moreThanZero(amount) isAllowedToken(token) { }
```

### Setting Address to Zero Could Brick the Protocol

`setRedemptionContract` in both `DSCEngine` and `YieldAggregator` accepted `address(0)` without reverting. If the owner accidentally called it with a zero address, the `onlyRedemptionContract` modifier would permanently block all redemption flows. The protocol would be bricked with no upgrade path.

Fix: one line.

```solidity
if (rc == address(0)) revert DSCEngine__ZeroAddress();
```

### Missing Events Everywhere

Six critical state-changing functions, including `mintDsc`, `burnDsc`, `setRedemptionContract`, and `deductRealizedProfit`, emitted no events. This means off-chain monitoring, indexers like The Graph, and analytics dashboards are completely blind to what's happening. You can't build a frontend alert system on silence.

Fixed by adding dedicated events: `DscMinted`, `DscBurned`, `DscBurnedExternal`, `RedemptionContractSet`, `ProfitDeducted`.

### The Gas Waste Inside Loops

Three loops were reading `.length` from a storage array on every single iteration:

```solidity
for (uint256 i = 0; i < s_collateralTokens.length; i++) { ... }
```

Every `.length` call on a storage array costs an `SLOAD` (2,100 gas cold, 100 gas warm). If you have 10 collateral tokens, that's 10 extra storage reads per function call. Cache it:

```solidity
uint256 len = s_collateralTokens.length;
for (uint256 i = 0; i < len; i++) { ... }
```

### Magic Numbers in the Math

The yield formula had `10_000` (basis points divisor) scattered across multiple places as a raw literal:

```solidity
yieldAmount = (s.totalDeposited * s.apyBps * elapsed) / (365 days * 10_000);
```

If you need to change it later, you have to find every instance. Replace with a constant:

```solidity
uint256 private constant BPS_DIVISOR = 10_000;
```

---

## What the Tools Found That I Had to Ignore (False Positives Are Real)

Security tools are not perfect. They flag patterns, and some of those patterns are fine by design.

**Strict equality in `_harvestStrategy`:**

```solidity
if (s.totalDeposited == 0 || elapsed == 0) return 0;
```

Slither flagged this as "dangerous strict equality." But here, both values are internal; no attacker can force `totalDeposited` to be exactly zero during an attack in a way that changes the outcome. The check is intentional and correct. Acknowledged and documented.

**Divide-before-multiply in share math (M-03):**

```solidity
uint256 sharesToBurn = (dscAmount * totalShares) / totalAssets;
uint256 principalReduction = (sharesToBurn * userPrincipal[msg.sender]) / userShares[msg.sender];
```

This is inherent to ERC4626-style accounting. The precision loss is bounded at 1 wei per operation and doesn't accumulate across users in an exploitable way. Acknowledged.

Knowing *when not to fix something* is just as important as knowing what to fix.

---

## The Test Suite: Because Static Analysis Is Only Half the Story

After fixing all the high and medium issues, I ran a full test campaign:

| Metric | Result |
|---|---|
| Total tests | **135** |
| Fuzz test functions | **32** (1,000 runs each) |
| Invariant sequences | **256** (100 calls deep) |
| Invariants verified | **20** |
| Tests passing | **135/135** |

**Selected invariants that had to hold no matter what:**

- The protocol must always be overcollateralized: total collateral value at or above total DSC minted × 2
- No user's health factor can drop below 1.0 unless they are being liquidated in the same transaction
- Total DSC supply must match ghost accounting across all mint/burn operations
- The YieldAggregator's `totalAssets` can never decrease during a deposit-only sequence
- The RedemptionContract's WETH reserve is always bounded by cumulative redemptions

**Final coverage:**

| Contract | Line Coverage | Function Coverage |
|---|---|---|
| DSCEngine.sol | 93.80% | 91.67% |
| OracleLib.sol | 100.00% | 100.00% |
| RedemptionContract.sol | 100.00% | 100.00% |
| DecentralizedStableCoin.sol | 85.71% | 100.00% |
| YieldAggregator.sol | 85.19% | 93.33% |

---

## What I'm Still Watching (Known Risks)

Being honest in a security review means talking about what you *didn't* fully solve.

**Oracle single point of failure.** The protocol uses Chainlink with a 3-hour staleness timeout. If Chainlink goes dark for 3+ hours, the protocol freezes. A secondary oracle (Uniswap TWAP) or a graceful circuit-breaker would add resilience.

**Single-owner centralization.** Both `DSCEngine` and `YieldAggregator` are controlled by a single EOA. That's fine for testnet. On mainnet, that needs to be a Gnosis Safe multisig.

**WETH reserve depletion in RedemptionContract.** If everyone redeems at once, the WETH reserve drains with no rate limit. A per-epoch cap would protect against this.

**No upgrade path.** The contracts are not upgradeable. Any future fix means a full redeployment and user migration. That's a deliberate design choice, but it needs a documented migration procedure.

---

## What Slither and Aderyn Feel Like to Actually Use

One honest observation for anyone picking up these tools for the first time:

**Slither** is the veteran. It's been around since 2018, has 100+ detectors, and integrates deeply with the Solidity AST. It's noisy, and you will get false positives. But the signal it gives you on real bugs (H-01, H-02, M-01, M-02) is worth the noise filtering.

**Aderyn** is the newcomer with better UX. Its report is cleaner, the Markdown output is beautiful for sharing with your team, and it caught the same H-1 reentrancy independently which gave me double confidence. It's also faster to run.

Run both. They don't perfectly overlap. The union of their findings is more complete than either alone.

And neither of them replaces manual review. The reentrancy window in `redeemCollateralForDsc` (M-02)? The tools caught the surface-level pattern. But understanding *why* it was dangerous, the specific attack sequence, the economic impact, required thinking like an attacker.

---

## The Final Scorecard

| ID | Issue | Severity | Status |
|---|---|---|---|
| H-01 | Reentrancy in `depositToStrategy` (CEI violation) | High | Fixed |
| H-02 | Unsafe ERC20 operations across all contracts | High | Fixed |
| M-01 | Divide-before-multiply in health factor formula | Medium | Fixed |
| M-02 | Reentrancy window in `redeemCollateralForDsc` | Medium | Fixed |
| M-03 | Divide-before-multiply in share math | Medium | Acknowledged |
| L-01 | Missing zero-address check on `setRedemptionContract` | Low | Fixed |
| L-02 | Missing events on critical state changes | Low | Fixed |
| L-03 | Storage array length not cached in loops | Low | Fixed |
| L-04 | `nonReentrant` not first modifier | Low | Fixed |
| L-05 | Strict equality in `_harvestStrategy` | Low | Acknowledged |
| I-01 | Unused oracle return values | Info | Acknowledged |
| I-02 | `OracleLib` function visibility | Info | Fixed |
| I-03 | Magic literal `10_000` in yield math | Info | Fixed |
| I-04 | Uninitialized local variable `newYield` | Info | Acknowledged |

**No critical findings. Two high findings, both fixed. The protocol lives.**

---

## The Real Lesson

Here's what this whole exercise taught me, and I want you to sit with this.

I wrote every line of this codebase. I knew every function. I had stared at `depositToStrategy` probably fifty times. And I still had a high-severity CEI violation sitting right there, hidden by the false confidence of a `nonReentrant` modifier.

Security isn't about being smart. It's about being *systematic*. About running the tools even when you think you don't need to. About treating your own code with the same suspicion you'd treat a stranger's.

The tools (Slither, Aderyn, fuzz tests, invariants) aren't there to replace your brain. They're there to give your brain a second pair of eyes that never gets tired, never gets overconfident, and never skips a line because it "probably looks fine."

Run the tools. Read the output. Fix what you can. Document what you acknowledge.

And before you ship anything real on mainnet, get a professional audit. I'm building toward that. This internal review is step one, not step last.

---

## Try It Yourself

The full Merix Holdings codebase is open source:

**GitHub:** [Ra9huvansh/merix-holdings](https://github.com/Ra9huvansh/merix-holdings)

The security review, Slither report, and Aderyn report are all in the repository. Clone it, run the tools yourself, see if you find something I missed. That's the whole point of open source security.

```bash
# Clone and set up
git clone https://github.com/Ra9huvansh/merix-holdings
cd merix-holdings
forge install

# Run the test suite
forge test

# Run Slither
slither . --filter-paths "test|lib|script"

# Run Aderyn
aderyn --output aderyn-report.md .
```

If you find something, open an issue. Seriously.

---

*Built with Foundry. Audited with Slither + Aderyn. Tested with 135 tests, 20 invariants, and a healthy dose of paranoia.*

*Raghuvansh Rastogi, Merix Holdings*
