"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * useSync Hook
 * Lightweight polling mechanism for internal real-time updates.
 * Checks for workspace-wide activity and triggers router.refresh() if new changes are found.
 *
 * Uses a ref for lastSync to keep the useEffect deps array empty, preventing
 * interval-stacking (a new interval would otherwise be created on every tick).
 */
export function useSync(intervalMs: number = 10000) {
    const router = useRouter();
    const lastSyncRef = useRef<string | null>(null);

    useEffect(() => {
        async function checkSync() {
            try {
                const res = await fetch("/api/workspace/sync");
                if (!res.ok) return;

                const data = await res.json();
                const newTimestamp = data.lastActivityAt;

                if (newTimestamp && lastSyncRef.current && newTimestamp !== lastSyncRef.current) {
                    console.log(`📡 Real-time Sync: Change detected [${newTimestamp}]. Refreshing components...`);
                    router.refresh();
                }

                if (newTimestamp) {
                    lastSyncRef.current = newTimestamp;
                }
            } catch (err) {
                console.error("Sync error:", err);
            }
        }

        // Initial sync to set baseline
        checkSync();

        // Single persistent interval — never re-created, no stacking
        const interval = setInterval(checkSync, intervalMs);
        return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps: runs once. router and intervalMs are stable refs.
}
