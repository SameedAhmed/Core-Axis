"use client";

import { useState } from "react";
import { manualPlanOverride } from "@/lib/actions/platform";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

export function PlanOverrideButton({ accountId, currentTier }: { accountId: string, currentTier: string }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleTierChange = async (newTier: string) => {
        if (newTier === currentTier) return;
        
        setIsUpdating(true);
        try {
            const res = await manualPlanOverride(accountId, newTier as any);
            if (res.success) {
                toast.success(`Account successfully overridden to ${newTier} plan.`);
            } else {
                toast.error(res.error || "Failed to override plan.");
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-3 group/btn">
             {isUpdating && <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
             <Select disabled={isUpdating} defaultValue={currentTier} onValueChange={handleTierChange}>
                <SelectTrigger className="w-[120px] bg-muted/30 border-border h-8 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-md active:scale-95">
                    <SelectValue placeholder="Override Tier" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                    <p className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border mb-1">Select Tier Override</p>
                    <SelectItem value="FREE" className="text-xs font-bold uppercase py-2">Free</SelectItem>
                    <SelectItem value="STARTER" className="text-xs font-bold uppercase py-2 text-blue-500">Starter</SelectItem>
                    <SelectItem value="PRO" className="text-xs font-bold uppercase py-2 text-indigo-600">Professional</SelectItem>
                    <SelectItem value="ENTERPRISE" className="text-xs font-bold uppercase py-2 text-purple-600">Enterprise</SelectItem>
                </SelectContent>
            </Select>
            <div className={`p-1.5 rounded-lg border border-border bg-card group-hover/btn:bg-muted transition-colors transition-opacity opacity-0 group-hover/btn:opacity-100`}>
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
        </div>
    );
}
