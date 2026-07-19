"use client";

import { AlertTriangle, Clock, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

interface TrialBannerProps {
    daysRemaining: number;
    planTier: string;
    role?: string;
}

export function TrialBanner({ daysRemaining, planTier, role }: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    // Color logic based on urgency
    const isUrgent = daysRemaining <= 3;
    const bannerClasses = isUrgent 
        ? "bg-gradient-to-r from-red-600 to-orange-600 border-red-500 shadow-red-500/20" 
        : "bg-[#0d1b4b] border-white/10 shadow-primary/20"; // Navy background

    const accentColor = isUrgent ? "text-orange-200" : "text-blue-200";
    const statusLabel = isUrgent ? "CRITICAL: TRIAL EXPIRING" : "TRIAL ACTIVE";

    return (
        <div className={`sticky top-0 z-[100] px-4 py-1.5 sm:py-2 text-white border-b overflow-hidden shadow-lg backdrop-blur-md transition-all duration-150 ${bannerClasses}`}>
            {/* Background Grain/Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-multiply"></div>
            
            <div className="max-w-[1600px] mx-auto flex flex-row items-center justify-between gap-2 sm:gap-3 relative z-10">
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <div className={`p-1 rounded-md shrink-0 ${isUrgent ? 'bg-white/20' : 'bg-primary/20'}`}>
                        {isUrgent ? <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" /> : <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200 fill-blue-200" />}
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`hidden xs:inline-block text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0 ${isUrgent ? 'border-white/30 text-white' : 'border-primary/30 text-blue-200'}`}>
                            {isUrgent ? 'URGENT' : 'TRIAL'}
                        </span>
                        <p className="text-[11px] sm:text-sm font-medium truncate">
                            <span className="hidden sm:inline">Your <span className="font-bold uppercase tracking-tight">{planTier}</span> trial has </span>
                            <span className="sm:hidden font-bold uppercase mr-1">{planTier}:</span>
                            <span className={`font-black ${accentColor}`}>
                                {daysRemaining}<span className="sm:hidden">d</span>
                                <span className="hidden sm:inline"> {daysRemaining === 1 ? 'day' : 'days'}</span>
                            </span> 
                            <span className="sm:hidden ml-1">left</span>
                            <span className="hidden sm:inline"> remaining.</span>
                            <span className="hidden lg:inline ml-1 opacity-80">Lock in your revenue infrastructure today.</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center shrink-0">
                    {role !== "REP" && role !== "MANAGER" && (
                        <Link href="/dashboard/settings?tab=billing">
                            <Button 
                                size="sm" 
                                className={`h-7 sm:h-8 px-3 sm:px-4 text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full transition-all duration-150 active:scale-95 ${isUrgent ? 'bg-white text-red-600 hover:bg-zinc-100' : 'bg-[#1a3a8f] text-white hover:bg-[#254cb6] shadow-md shadow-[#1a3a8f]/20'}`}
                            >
                                <span className="hidden xs:inline">Complete Upgrade </span>
                                <span className="xs:hidden">Upgrade </span>
                                <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 sm:ml-2" />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
