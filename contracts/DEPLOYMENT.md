# AIContextToken Deployment Guide

## Prerequisites

1. **Environment Setup**
   - Make sure you have Foundry installed
   - Ensure you have a wallet with some Sepolia ETH for deployment

2. **Environment Variables**
   Create a `.env` file in the contracts directory:
   ```bash
   SEPOLIA_RPC_URL=your_sepolia_rpc_url
   PRIVATE_KEY=your_deployer_private_key
   ```

## Deployment Steps

### 1. Compile the Contract
```bash
forge build
```

### 2. Run Tests (Optional but Recommended)
```bash
forge test
```

### 3. Deploy to Sepolia
```bash
forge script script/DeployAICT.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### 4. Update Contract Address
After successful deployment, update the contract address in:
```
client/lib/contracts.ts
```

Replace the placeholder address in `CONTRACT_ADDRESSES.sepolia.AIContextToken` with the deployed contract address.

## Contract Features

- **ERC20 Token**: Standard ERC20 implementation with 18 decimals
- **Initial Supply**: 1,000,000 AICT tokens
- **Exchange Rate**: 1 ETH = 1,000 AICT tokens
- **Sale Control**: Owner can toggle sale on/off
- **Token Sale**: Users can buy tokens by sending ETH to the contract
- **Owner Functions**: 
  - Toggle sale status
  - Set sale price
  - Add tokens to sale
  - Withdraw ETH from contract

## Post-Deployment Setup

1. **Activate Sale**: The deployment script automatically activates the sale
2. **Add Tokens to Sale**: 100,000 tokens are automatically added to the sale contract
3. **Verify Contract**: Ensure the contract is verified on Sepolia Etherscan

## Testing the Contract

1. **Connect Wallet**: Use the client app to connect a wallet
2. **Purchase Tokens**: Send ETH to buy AICT tokens
3. **Check Balance**: Verify token balance in the connected wallet

## Security Notes

- The contract uses OpenZeppelin's battle-tested implementations
- Owner functions are restricted to the deployer address
- Sale can be paused by the owner if needed
- ETH sent to the contract can only be withdrawn by the owner

## Troubleshooting

- **Compilation Errors**: Ensure all dependencies are installed with `forge install`
- **Deployment Failures**: Check RPC URL and private key in `.env`
- **Contract Interaction Issues**: Verify the contract address is correctly set in the client
