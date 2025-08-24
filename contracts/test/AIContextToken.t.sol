// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {AIContextToken} from "../contracts/AIContextToken.sol";

contract AIContextTokenTest is Test {
    AIContextToken public token;
    address public owner;
    address public buyer;
    address public addr1;

    function setUp() public {
        owner = makeAddr("owner");
        buyer = makeAddr("buyer");
        addr1 = makeAddr("addr1");
        
        // Give buyer some ETH
        vm.deal(buyer, 10 ether);
        
        vm.prank(owner);
        token = new AIContextToken();
    }

    function test_Deployment() public view {
        assertEq(token.owner(), owner);
        assertEq(token.balanceOf(owner), token.totalSupply());
        assertEq(token.name(), "AI Context Token");
        assertEq(token.symbol(), "AICT");
        assertEq(token.totalSupply(), 1000000 * 10**18);
    }

    function test_TokenSale() public {
        vm.startPrank(owner);
        token.toggleSale();
        // Add tokens to sale - owner has all tokens initially
        token.addTokensToSale(100000 * 10**18);
        vm.stopPrank();

        assertTrue(token.saleActive());
        
        uint256 ethAmount = 0.1 ether;
        uint256 expectedTokens = 100 * 10**18; // 100 tokens (1000 per ETH)
        
        uint256 initialBalance = token.balanceOf(buyer);
        
        vm.prank(buyer);
        token.buyTokens{value: ethAmount}();
        
        uint256 finalBalance = token.balanceOf(buyer);
        assertEq(finalBalance - initialBalance, expectedTokens);
    }

    function test_SaleNotActive() public {
        // Sale starts as inactive, so we don't need to toggle it
        
        uint256 ethAmount = 0.1 ether;
        
        vm.prank(buyer);
        vm.expectRevert("Token sale is not active");
        token.buyTokens{value: ethAmount}();
    }

    function test_ZeroETH() public {
        vm.prank(owner);
        token.toggleSale();
        
        vm.prank(buyer);
        vm.expectRevert("Must send ETH to buy tokens");
        token.buyTokens{value: 0}();
    }

    function test_CalculateTokensForETH() public view {
        uint256 ethAmount = 1 ether;
        uint256 expectedTokens = 1000 * 10**18; // 1000 tokens
        
        uint256 calculatedTokens = token.getTokensForETH(ethAmount);
        assertEq(calculatedTokens, expectedTokens);
    }

    function test_CalculateETHForTokens() public view {
        uint256 tokenAmount = 1000 * 10**18; // 1000 tokens
        uint256 expectedETH = 1 ether; // 1 ETH
        
        uint256 calculatedETH = token.getETHPaymentForTokens(tokenAmount);
        assertEq(calculatedETH, expectedETH);
    }

    function test_OwnerFunctions() public {
        vm.startPrank(owner);
        
        // Toggle sale
        assertFalse(token.saleActive());
        token.toggleSale();
        assertTrue(token.saleActive());
        
        // Set sale price
        uint256 newPrice = 0.002 ether;
        token.setSalePrice(newPrice);
        assertEq(token.salePrice(), newPrice);
        
        // Add tokens to sale
        uint256 amount = 50000 * 10**18;
        token.addTokensToSale(amount);
        assertEq(token.balanceOf(address(token)), amount);
        
        vm.stopPrank();
    }

    function test_NonOwnerFunctions() public {
        vm.startPrank(buyer);
        
        vm.expectRevert();
        token.toggleSale();
        
        vm.expectRevert();
        token.setSalePrice(0.002 ether);
        
        vm.expectRevert();
        token.addTokensToSale(1000 * 10**18);
        
        vm.stopPrank();
    }

    function test_Events() public {
        vm.startPrank(owner);
        token.toggleSale();
        token.addTokensToSale(1000 * 10**18);
        vm.stopPrank();

        uint256 ethAmount = 0.1 ether;
        uint256 expectedTokens = 100 * 10**18;
        
        vm.prank(buyer);
        vm.expectEmit(true, true, false, true);
        emit AIContextToken.TokensPurchased(buyer, expectedTokens, ethAmount);
        token.buyTokens{value: ethAmount}();
    }

    function test_WithdrawETH() public {
        vm.startPrank(owner);
        token.toggleSale();
        token.addTokensToSale(1000 * 10**18);
        vm.stopPrank();

        // Buy some tokens to add ETH to contract
        vm.prank(buyer);
        token.buyTokens{value: 0.1 ether}();

        uint256 contractBalance = address(token).balance;
        assertGt(contractBalance, 0);

        vm.prank(owner);
        token.withdrawETH();
        
        assertEq(address(token).balance, 0);
    }
}
