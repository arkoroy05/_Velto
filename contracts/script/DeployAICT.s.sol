// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AIContextToken} from "../contracts/AIContextToken.sol";

contract DeployAICT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console2.log("Deploying AIContextToken...");

        AIContextToken token = new AIContextToken();
        
        console2.log("AIContextToken deployed to:", address(token));
        console2.log("Deployer address:", msg.sender);

        // Check initial balance
        uint256 balance = token.balanceOf(msg.sender);
        console2.log("Initial balance:", balance / 10**18, "AICT");

        // Activate the sale
        token.toggleSale();
        console2.log("Token sale activated");

        // Add some tokens to the sale contract
        uint256 saleAmount = 100000 * 10**18; // 100k tokens
        token.addTokensToSale(saleAmount);
        console2.log("Added", saleAmount / 10**18, "tokens to sale");

        vm.stopBroadcast();

        console2.log("Deployment completed successfully!");
    }
}
