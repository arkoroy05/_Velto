"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState, useEffect } from "react";
import { type State, WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

import { getConfig } from "./config";

type Props = {
  children: ReactNode;
  initialState: State | undefined;
};

export function Providers({ children, initialState }: Props) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Ensure QueryClient is properly initialized
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Client-side only operations
      console.log('QueryClient initialized:', queryClient);
      
      // Add error boundary for React Query
      queryClient.setDefaultOptions({
        queries: {
          onError: (error) => {
            console.error('React Query error:', error);
          },
        },
        mutations: {
          onError: (error) => {
            console.error('React Query mutation error:', error);
          },
        },
      });
    }
  }, [queryClient]);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#50C878",
            accentColorForeground: "white",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
          initialChain={11155111}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
