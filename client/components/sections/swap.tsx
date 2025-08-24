"use client"

import { useState, useEffect } from "react"
import { ArrowUpDown, Settings, RefreshCw, Clock, CheckCircle, AlertCircle, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAICTContract } from "@/hooks/use-aict-contract"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { formatEther, parseEther } from "viem"

interface Token {
  symbol: string
  name: string
  balance: number
  price: number
  icon: string
}

interface SwapTransaction {
  id: string
  fromToken: string
  toToken: string
  fromAmount: number
  toAmount: number
  rate: number
  timestamp: string
  status: "pending" | "completed" | "failed"
  txHash: string
}

const mockTransactions: SwapTransaction[] = [
  {
    id: "1",
    fromToken: "ETH",
    toToken: "AICT",
    fromAmount: 0.1,
    toAmount: 100,
    rate: 1000,
    timestamp: "2024-04-08T14:30:00Z",
    status: "completed",
    txHash: "0x1234...5678",
  },
  {
    id: "2",
    fromToken: "ETH",
    toToken: "AICT",
    fromAmount: 0.05,
    toAmount: 50,
    rate: 1000,
    timestamp: "2024-04-07T09:15:00Z",
    status: "completed",
    txHash: "0x9876...4321",
  },
]

export function Swap() {
  const { address, isConnected } = useAccount()
  const {
    getTokenBalance,
    getSaleStatus,
    getTokenPrice,
    calculateTokensForETH,
    buyTokens,
    getContractInfo,
    isLoading,
    error
  } = useAICTContract()

  const [ethAmount, setEthAmount] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [userTokenBalance, setUserTokenBalance] = useState("0")
  const [saleActive, setSaleActive] = useState(false)
  const [contractInfo, setContractInfo] = useState<any>(null)

  // Load contract data on mount
  useEffect(() => {
    if (isConnected) {
      loadContractData()
    }
  }, [isConnected])

  const loadContractData = async () => {
    try {
      const [balance, saleStatus, info] = await Promise.all([
        getTokenBalance(),
        getSaleStatus(),
        getContractInfo()
      ])
      
      setUserTokenBalance(balance)
      setSaleActive(saleStatus)
      setContractInfo(info)
    } catch (err) {
      console.error('Error loading contract data:', err)
    }
  }

  // Calculate token amount when ETH amount changes
  useEffect(() => {
    if (ethAmount && !isNaN(Number(ethAmount)) && Number(ethAmount) > 0) {
      calculateTokensForETH(ethAmount).then(tokens => {
        setTokenAmount(tokens)
      })
    } else {
      setTokenAmount("")
    }
  }, [ethAmount, calculateTokensForETH])

  const handleETHAmountChange = (value: string) => {
    setEthAmount(value)
  }

  const handleMaxETH = () => {
    // For demo purposes, set to 0.1 ETH
    setEthAmount("0.1")
  }

  const handleBuyTokens = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!ethAmount || Number(ethAmount) <= 0) {
      alert("Please enter a valid ETH amount")
      return
    }

    try {
      console.log('Starting token purchase:', { ethAmount, isConnected, address });
      
      const result = await buyTokens(ethAmount)
      if (result?.success) {
        alert(`Successfully purchased tokens! Transaction hash: ${result.hash}`)
        setEthAmount("")
        setTokenAmount("")
        // Reload contract data
        loadContractData()
      }
    } catch (err) {
      console.error('Error buying tokens:', err)
      const errorMsg = error || (err instanceof Error ? err.message : 'Unknown error occurred')
      alert(`Failed to buy tokens: ${errorMsg}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400"
      case "pending":
        return "text-yellow-400"
      case "failed":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      case "failed":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const canBuyTokens = ethAmount && Number(ethAmount) > 0 && saleActive && isConnected

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">AI Context Token Sale</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to purchase AICT tokens</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Context Token Sale</h1>
          <p className="text-gray-400 mt-1">Purchase AICT tokens with ETH to unlock AI context windows</p>
        </div>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          className="bg-white/5 border-white/10 text-gray-300 hover:text-white"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Purchase Interface */}
        <div className="lg:col-span-2">
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(16px)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="space-y-4">
              {/* ETH Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">From (ETH)</label>
                  <span className="text-sm text-gray-400">
                    Balance: {address ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-lg">
                        Ξ
                      </div>
                      <div>
                        <p className="font-medium">ETH</p>
                        <p className="text-sm text-gray-400">Ethereum</p>
                      </div>
                    </div>
                    <div className="text-right flex-1 ml-4">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={ethAmount}
                        onChange={(e) => handleETHAmountChange(e.target.value)}
                        className="bg-transparent border-none text-right text-xl font-bold p-0 h-auto focus:ring-0"
                        step="0.01"
                        min="0.001"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        ≈ ${ethAmount ? (Number(ethAmount) * 2000).toFixed(2) : "0.00"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={handleMaxETH}
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* AICT Output */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">To (AICT)</label>
                  <span className="text-sm text-gray-400">
                    Balance: {userTokenBalance} AICT
                  </span>
                </div>
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-lg">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">AICT</p>
                        <p className="text-sm text-gray-400">AI Context Token</p>
                      </div>
                    </div>
                    <div className="text-right flex-1 ml-4">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={tokenAmount}
                        readOnly
                        className="bg-transparent border-none text-right text-xl font-bold p-0 h-auto focus:ring-0"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        AI Context Windows
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exchange Rate */}
              {ethAmount && tokenAmount && (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Exchange Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">
                        1 ETH = 1000 AICT
                      </span>
                      <RefreshCw className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">Sale Status</span>
                    <span className={`text-white ${saleActive ? 'text-green-400' : 'text-red-400'}`}>
                      {saleActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <Button
                onClick={handleBuyTokens}
                disabled={!canBuyTokens || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Purchasing...
                  </div>
                ) : !isConnected ? (
                  "Connect Wallet"
                ) : !saleActive ? (
                  "Sale Not Active"
                ) : !ethAmount ? (
                  "Enter ETH Amount"
                ) : (
                  `Buy ${tokenAmount} AICT for ${ethAmount} ETH`
                )}
              </Button>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div
              className="mt-4 p-4 rounded-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(16px)",
                borderColor: "rgba(255, 255, 255, 0.1)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              <h3 className="font-medium mb-3">Purchase Settings</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Slippage Tolerance</label>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1.0, 3.0].map((value) => (
                    <Button
                      key={value}
                      onClick={() => setSlippage(value)}
                      variant={slippage === value ? "default" : "outline"}
                      size="sm"
                      className={
                        slippage === value
                          ? "bg-purple-600 text-white"
                          : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                      }
                    >
                      {value}%
                    </Button>
                  ))}
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={slippage}
                    onChange={(e) => setSlippage(Number(e.target.value))}
                    className="w-20 bg-white/5 border-white/10 text-white text-center"
                    step="0.1"
                    min="0.1"
                    max="50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History and Contract Info */}
        <div>
          {/* Contract Info */}
          <div
            className="p-6 rounded-xl border mb-4"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(16px)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3 className="font-bold mb-4">Contract Info</h3>
            <div className="space-y-3">
              {contractInfo ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="font-medium">{contractInfo.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Symbol</span>
                    <span className="font-medium">{contractInfo.symbol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Supply</span>
                    <span className="font-medium">{Number(contractInfo.totalSupply).toLocaleString()} AICT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Sale Status</span>
                    <span className={`font-medium ${contractInfo.saleActive ? 'text-green-400' : 'text-red-400'}`}>
                      {contractInfo.saleActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">Loading contract info...</div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(16px)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3 className="font-bold mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {mockTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-lg border"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {tx.fromToken} → {tx.toToken}
                      </span>
                      <div className={`flex items-center gap-1 ${getStatusColor(tx.status)}`}>
                        {getStatusIcon(tx.status)}
                        <span className="text-xs capitalize">{tx.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p>
                      {tx.fromAmount} {tx.fromToken} → {tx.toAmount.toFixed(2)} {tx.toToken}
                    </p>
                    <p className="text-xs mt-1">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
