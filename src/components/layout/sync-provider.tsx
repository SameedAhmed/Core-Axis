"use client";

import { useSync } from "@/hooks/use-sync";

/**
 * SyncProvider Component
 * Client-side wrapper to enable the internal real-time synchronization hook
 * across the entire dashboard.
 */
export function SyncProvider() {
    // Poll every 10 seconds for workspace-wide updates
    useSync(10000);
    
    // This component doesn't render anything, it just runs the hook
    return null;
}
