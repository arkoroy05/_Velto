// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AIContextToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1 million tokens
    uint256 public constant TOKENS_PER_ETH = 1000; // 1000 tokens per 1 ETH
    
    bool public saleActive = false;
    uint256 public salePrice = 0.001 ether; // 0.001 ETH per 1000 tokens
    
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event SaleToggled(bool active);
    event SalePriceUpdated(uint256 newPrice);
    
    constructor() ERC20("AI Context Token", "AICT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function buyTokens() external payable {
        require(saleActive, "Token sale is not active");
        require(msg.value > 0, "Must send ETH to buy tokens");
        
        uint256 tokenAmount = (msg.value * TOKENS_PER_ETH * 10**18) / 1 ether;
        require(tokenAmount > 0, "Invalid amount");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient tokens in contract");
        
        _transfer(address(this), msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }
    
    function toggleSale() external onlyOwner {
        saleActive = !saleActive;
        emit SaleToggled(saleActive);
    }
    
    function setSalePrice(uint256 _newPrice) external onlyOwner {
        salePrice = _newPrice;
        emit SalePriceUpdated(_newPrice);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }
    
    function addTokensToSale(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        _transfer(msg.sender, address(this), amount);
    }
    
    function getTokenPrice() external view returns (uint256) {
        return salePrice;
    }
    
    function getTokensForETH(uint256 ethAmount) external pure returns (uint256) {
        return (ethAmount * TOKENS_PER_ETH * 10**18) / 1 ether;
    }
    
    function getETHPaymentForTokens(uint256 tokenAmount) external pure returns (uint256) {
        return (tokenAmount * 1 ether) / (TOKENS_PER_ETH * 10**18);
    }
}
