"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Crown, ArrowUpCircle, Lock } from "lucide-react";
import Link from "next/link";

interface CapacityAlertProps {
    isOverCapacity: boolean;
    reason: string | null;
    userCount: number;
    maxUsers: number;
    planTier: string;
}

export function CapacityAlert({ isOverCapacity, reason, userCount, maxUsers, planTier }: CapacityAlertProps) {
    if (!isOverCapacity) return null;

    return (
        <Alert className="mb-6 border-2 border-red-500/50 bg-red-500/5 dark:bg-red-500/10 shadow-lg shadow-red-500/10 animate-in slide-in-from-top duration-700">
            <div className="flex flex-col md:flex-row items-center gap-6 p-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    <AlertTitle className="text-lg font-black tracking-tight text-red-600 dark:text-red-400 mb-1 flex items-center justify-center md:justify-start gap-2">
                        System Over-Capacity: Access Restricted
                    </AlertTitle>
                    <AlertDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Your <span className="text-foreground font-black uppercase text-[11px] px-1.5 py-0.5 bg-muted rounded border">{planTier}</span> plan is currently at its limit. 
                        You have <span className="text-red-600 dark:text-red-400 font-bold">{userCount} users</span> but the {planTier} license only covers {maxUsers}. 
                        <strong> New records and settings are currently locked.</strong>
                    </AlertDescription>
                </div>

                <div className="flex items-center gap-3">
                     <div className="hidden lg:flex flex-col items-end px-3 border-r border-border/50">
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Status</span>
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1 uppercase">
                             <Lock className="w-3 h-3" /> RO Mode
                        </span>
                     </div>
                    <Link href="/dashboard/settings?tab=billing">
                        <Button className="bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-600/20 gap-2 hover:scale-[1.05] transition-all">
                            <ArrowUpCircle className="w-4 h-4" />
                            Upgrade Subscription
                        </Button>
                    </Link>
                </div>
            </div>
        </Alert>
    );
}
