import { expect } from "chai";
import { ethers } from "hardhat";
import { AIContextToken } from "../typechain-types";

describe("AIContextToken", function () {
  let token: AIContextToken;
  let owner: any;
  let buyer: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, buyer, addr1] = await ethers.getSigners();
    
    const AIContextToken = await ethers.getContractFactory("AIContextToken");
    token = await AIContextToken.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(await owner.getAddress());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(await owner.getAddress());
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("AI Context Token");
      expect(await token.symbol()).to.equal("AICT");
    });

    it("Should have correct initial supply", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000")); // 1 million tokens
    });
  });

  describe("Token Sale", function () {
    beforeEach(async function () {
      // Activate sale and add tokens to contract
      await token.toggleSale();
      await token.addTokensToSale(ethers.parseEther("100000"));
    });

    it("Should allow buying tokens with ETH", async function () {
      const ethAmount = ethers.parseEther("0.1"); // 0.1 ETH
      const expectedTokens = ethers.parseEther("100"); // 100 tokens (1000 per ETH)
      
      const initialBalance = await token.balanceOf(await buyer.getAddress());
      
      await token.connect(buyer).buyTokens({ value: ethAmount });
      
      const finalBalance = await token.balanceOf(await buyer.getAddress());
      expect(finalBalance - initialBalance).to.equal(expectedTokens);
    });

    it("Should fail when sale is not active", async function () {
      await token.toggleSale(); // Deactivate sale
      
      const ethAmount = ethers.parseEther("0.1");
      await expect(
        token.connect(buyer).buyTokens({ value: ethAmount })
      ).to.be.revertedWith("Token sale is not active");
    });

    it("Should fail when sending 0 ETH", async function () {
      await expect(
        token.connect(buyer).buyTokens({ value: 0 })
      ).to.be.revertedWith("Must send ETH to buy tokens");
    });

    it("Should calculate correct token amount for ETH", async function () {
      const ethAmount = ethers.parseEther("1"); // 1 ETH
      const expectedTokens = ethers.parseEther("1000"); // 1000 tokens
      
      const calculatedTokens = await token.getTokensForETH(ethAmount);
      expect(calculatedTokens).to.equal(expectedTokens);
    });

    it("Should calculate correct ETH amount for tokens", async function () {
      const tokenAmount = ethers.parseEther("1000"); // 1000 tokens
      const expectedETH = ethers.parseEther("1"); // 1 ETH
      
      const calculatedETH = await token.getETHPaymentForTokens(tokenAmount);
      expect(calculatedETH).to.equal(expectedETH);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to toggle sale", async function () {
      expect(await token.saleActive()).to.be.false;
      
      await token.toggleSale();
      expect(await token.saleActive()).to.be.true;
      
      await token.toggleSale();
      expect(await token.saleActive()).to.be.false;
    });

    it("Should allow owner to set sale price", async function () {
      const newPrice = ethers.parseEther("0.002");
      await token.setSalePrice(newPrice);
      expect(await token.salePrice()).to.equal(newPrice);
    });

    it("Should allow owner to add tokens to sale", async function () {
      const amount = ethers.parseEther("50000");
      await token.addTokensToSale(amount);
      
      const contractBalance = await token.balanceOf(await token.getAddress());
      expect(contractBalance).to.equal(amount);
    });

    it("Should fail when non-owner tries to call owner functions", async function () {
      await expect(
        token.connect(buyer).toggleSale()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
      
      await expect(
        token.connect(buyer).setSalePrice(ethers.parseEther("0.002"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
      
      await expect(
        token.connect(buyer).addTokensToSale(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Events", function () {
    it("Should emit TokensPurchased event", async function () {
      await token.toggleSale();
      await token.addTokensToSale(ethers.parseEther("1000"));
      
      const ethAmount = ethers.parseEther("0.1");
      const expectedTokens = ethers.parseEther("100");
      
      await expect(token.connect(buyer).buyTokens({ value: ethAmount }))
        .to.emit(token, "TokensPurchased")
        .withArgs(await buyer.getAddress(), expectedTokens, ethAmount);
    });

    it("Should emit SaleToggled event", async function () {
      await expect(token.toggleSale())
        .to.emit(token, "SaleToggled")
        .withArgs(true);
    });

    it("Should emit SalePriceUpdated event", async function () {
      const newPrice = ethers.parseEther("0.002");
      await expect(token.setSalePrice(newPrice))
        .to.emit(token, "SalePriceUpdated")
        .withArgs(newPrice);
    });
  });
});
