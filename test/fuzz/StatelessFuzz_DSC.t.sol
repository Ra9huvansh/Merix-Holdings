// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {DecentralizedStableCoin} from "../../src/DecentralizedStableCoin.sol";

contract StatelessFuzz_DSC is Test {
    DecentralizedStableCoin dsc;

    // This test contract acts as owner (DSCEngine equivalent)
    function setUp() public {
        dsc = new DecentralizedStableCoin();
        // ownership stays with this test contract
    }

    /*//////////////////////////////////////////////////////////////
                        16. testFuzz_Mint
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Mint(address to, uint256 amount) public {
        vm.assume(to != address(0));
        amount = bound(amount, 1, type(uint128).max);

        bool result = dsc.mint(to, amount);

        assertTrue(result);
        assertEq(dsc.balanceOf(to), amount);
        assertEq(dsc.totalSupply(), amount);
    }

    /*//////////////////////////////////////////////////////////////
                17. testFuzz_Mint_RevertsIfZeroAddress
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Mint_RevertsIfZeroAddress(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);
        vm.expectRevert(DecentralizedStableCoin.DecentralizedStableCoin__NotZeroAddress.selector);
        dsc.mint(address(0), amount);
    }

    /*//////////////////////////////////////////////////////////////
                        18. testFuzz_Burn
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Burn(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 1, type(uint128).max);
        burnAmount = bound(burnAmount, 1, mintAmount);

        dsc.mint(address(this), mintAmount);
        uint256 supplyBefore = dsc.totalSupply();

        dsc.burn(burnAmount);

        assertEq(dsc.totalSupply(), supplyBefore - burnAmount);
        assertEq(dsc.balanceOf(address(this)), mintAmount - burnAmount);
    }

    /*//////////////////////////////////////////////////////////////
            19. testFuzz_Burn_RevertsIfExceedsBalance
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Burn_RevertsIfExceedsBalance(uint256 mintAmount, uint256 burnAmount) public {
        mintAmount = bound(mintAmount, 1, type(uint128).max - 1);
        // burnAmount must be strictly greater than mintAmount
        burnAmount = bound(burnAmount, mintAmount + 1, type(uint128).max);

        dsc.mint(address(this), mintAmount);

        vm.expectRevert(DecentralizedStableCoin.DecentralizedStableCoin__BurnAmountExceedsBalance.selector);
        dsc.burn(burnAmount);
    }
}
