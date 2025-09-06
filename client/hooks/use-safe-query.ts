"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Custom hook to safely use React Query hooks
 * This helps identify if QueryClient is properly set up
 */
export function useSafeQuery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!queryClient) {
      console.error("QueryClient is not available. Make sure QueryClientProvider is wrapping your component.");
      throw new Error("No QueryClient set, use QueryClientProvider to set one");
    }
  }, [queryClient]);

  return queryClient;
}
