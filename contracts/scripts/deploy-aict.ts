import { ethers } from "hardhat";

async function main() {
  console.log("Deploying AIContextToken...");

  const AIContextToken = await ethers.getContractFactory("AIContextToken");
  const token = await AIContextToken.deploy();

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("AIContextToken deployed to:", address);

  // Get the signer to check if it's the owner
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", await deployer.getAddress());

  // Check initial balance
  const balance = await token.balanceOf(await deployer.getAddress());
  console.log("Initial balance:", ethers.formatEther(balance), "AICT");

  // Activate the sale
  const tx = await token.toggleSale();
  await tx.wait();
  console.log("Token sale activated");

  // Add some tokens to the sale contract
  const saleAmount = ethers.parseEther("100000"); // 100k tokens
  const addTx = await token.addTokensToSale(saleAmount);
  await addTx.wait();
  console.log("Added", ethers.formatEther(saleAmount), "tokens to sale");

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
