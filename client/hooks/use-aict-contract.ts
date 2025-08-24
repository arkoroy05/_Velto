import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { AIContextTokenABI, CONTRACT_ADDRESSES } from '@/lib/contracts';

export function useAICTContract() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = CONTRACT_ADDRESSES.sepolia.AIContextToken;

  const getTokenBalance = useCallback(async (userAddress?: string) => {
    if (!publicClient || !contractAddress) return '0';
    
    try {
      const balance = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: AIContextTokenABI,
        functionName: 'balanceOf',
        args: [userAddress || address || '0x0000000000000000000000000000000000000000'],
      });
      
      return formatEther(balance as bigint);
    } catch (err) {
      console.error('Error getting token balance:', err);
      return '0';
    }
  }, [publicClient, contractAddress, address]);

  const getSaleStatus = useCallback(async () => {
    if (!publicClient || !contractAddress) return false;
    
    try {
      const isActive = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: AIContextTokenABI,
        functionName: 'saleActive',
      });
      
      return isActive as boolean;
    } catch (err) {
      console.error('Error getting sale status:', err);
      return false;
    }
  }, [publicClient, contractAddress]);

  const getTokenPrice = useCallback(async () => {
    if (!publicClient || !contractAddress) return '0';
    
    try {
      const price = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: AIContextTokenABI,
        functionName: 'getTokenPrice',
      });
      
      return formatEther(price as bigint);
    } catch (err) {
      console.error('Error getting token price:', err);
      return '0';
    }
  }, [publicClient, contractAddress]);

  const calculateTokensForETH = useCallback(async (ethAmount: string) => {
    if (!publicClient || !contractAddress) return '0';
    
    try {
      const tokens = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: AIContextTokenABI,
        functionName: 'getTokensForETH',
        args: [parseEther(ethAmount)],
      });
      
      return formatEther(tokens as bigint);
    } catch (err) {
      console.error('Error calculating tokens for ETH:', err);
      return '0';
    }
  }, [publicClient, contractAddress]);

  const buyTokens = useCallback(async (ethAmount: string) => {
    if (!walletClient || !contractAddress || !address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Buying tokens:', { ethAmount, contractAddress, address });
      
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: AIContextTokenABI,
        functionName: 'buyTokens',
        value: parseEther(ethAmount),
      });

      console.log('Transaction hash:', hash);

      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Transaction receipt:', receipt);
        
        if (receipt.status === 'success') {
          return { success: true, hash: hash };
        } else {
          throw new Error('Transaction failed on chain');
        }
      } else {
        // If no public client, just return the hash
        return { success: true, hash: hash };
      }
    } catch (err) {
      console.error('Error buying tokens:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to buy tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, contractAddress, address, publicClient]);

  const getContractInfo = useCallback(async () => {
    if (!publicClient || !contractAddress) return null;
    
    try {
      const [name, symbol, decimals, totalSupply, saleActive, salePrice] = await Promise.all([
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'name',
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'saleActive',
        }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: AIContextTokenABI,
          functionName: 'salePrice',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: formatEther(totalSupply as bigint),
        saleActive: saleActive as boolean,
        salePrice: formatEther(salePrice as bigint),
      };
    } catch (err) {
      console.error('Error getting contract info:', err);
      return null;
    }
  }, [publicClient, contractAddress]);

  return {
    contractAddress,
    isLoading,
    error,
    getTokenBalance,
    getSaleStatus,
    getTokenPrice,
    calculateTokensForETH,
    buyTokens,
    getContractInfo,
  };
}
