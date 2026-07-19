"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

/**
 * A reactive wrapper for the Settings Tabs.
 * It listens to the ?tab= URL parameter and forces the UI to stay in sync.
 */
export function SettingsTabsEngine({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Derived state from URL or fallback
    const [activeTab, setActiveTab] = useState("profile");

    // Sync state with URL changes (for back/forward buttons and deep links)
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Persist the tab in the URL without scrolling or full reload
        router.push(`/dashboard/settings?tab=${value}`, { scroll: false });
    };

    return (
        <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="w-full"
        >
            {children}
        </Tabs>
    );
}
