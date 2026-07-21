"use client";

import { useState } from "react";
import { DealStage } from "@/generated/prisma/client/client";
import { updateDealStage } from "@/lib/actions/deals";
import { Badge } from "@/components/ui/badge";
import { DealSheet } from "./deal-sheet";
import { toast } from "sonner";

import { AlertCircle, Building2, CheckCircle2, UserCircle, Search, FilterX, DollarSign, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Make sure to extend Deal type to include Organization name if fetched
type EnhancedDeal = {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    organization?: { name: string } | null;
    updatedAt: Date; // Adding this to check for "rotting" deals
    createdAt: Date;
};

interface DealBoardProps {
    data: EnhancedDeal[];
    effectiveRole: string;
    organizations: { id: string; name: string }[];
    dealStages: any;
}

export function DealBoard({ data, effectiveRole, organizations, dealStages }: DealBoardProps) {
    const [deals, setDeals] = useState<EnhancedDeal[]>(data);
    const [selectedDeal, setSelectedDeal] = useState<EnhancedDeal | null>(null);
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const onDragStart = (e: React.DragEvent, dealId: string) => {
        e.dataTransfer.setData("dealId", dealId);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        const dealId = e.dataTransfer.getData("dealId");
        if (!dealId) return;

        const isEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(targetStage);

        const prevDeals = [...deals];

        setDeals(current =>
            current.map(deal =>
                deal.id === dealId ? { 
                    ...deal, 
                    stage: isEnum ? (targetStage as DealStage) : "QUALIFICATION",
                    customStage: isEnum ? null : targetStage 
                } as any : deal
            )
        );

        const res = await updateDealStage(dealId, targetStage);
        if (!res.success) {
            toast.error(res.error || "Failed to move opportunity");
            setDeals(prevDeals); // Revert optimistic update
        } else {
            toast.success(`Opportunity moved to ${stagesConfig.find((s: any) => s.value === targetStage)?.label}`);
            router.refresh();
        }
    };

    const handleOnboard = async (e: React.MouseEvent, dealId: string) => {
        e.stopPropagation();
        const prevDeals = [...deals];
        setDeals(current =>
            current.map(deal =>
                deal.id === dealId ? { 
                    ...deal, 
                    stage: "QUALIFICATION",
                    customStage: "ONBOARDED" 
                } as any : deal
            )
        );

        const res = await updateDealStage(dealId, "ONBOARDED");
        if (!res.success) {
            toast.error(res.error || "Failed to create order");
            setDeals(prevDeals);
        } else {
            toast.success("Order Successfully Confirmed! Check the Orders control center.");
            router.refresh();
        }
    };

    const handleArchive = async (e: React.MouseEvent, dealId: string) => {
        e.stopPropagation();
        const prevDeals = [...deals];
        setDeals(current =>
            current.map(deal =>
                deal.id === dealId ? { 
                    ...deal, 
                    stage: "LOST",
                    customStage: "ARCHIVED" 
                } as any : deal
            )
        );

        const res = await updateDealStage(dealId, "ARCHIVED");
        if (!res.success) {
            toast.error(res.error || "Failed to archive opportunity");
            setDeals(prevDeals);
        } else {
            toast.success("Opportunity successfully archived to Closed-Lost!");
            router.refresh();
        }
    };

    const stagesConfig = dealStages || [
        { id: "s1", value: "QUALIFICATION", label: "New Lead", color: "slate" },
        { id: "s2", value: "PROPOSAL", label: "Contacted", color: "blue" },
        { id: "s3", value: "NEGOTIATION", label: "Negotiation", color: "amber" },
        { id: "s4", value: "WON", label: "Sales Confirmed", color: "indigo" },
        { id: "s5", value: "LOST", label: "Closed-Lost", color: "red" }
    ];

    const getColorVars = (color: string) => {
        switch (color) {
            case "blue": return { header: "bg-navy/10 text-navy dark:text-blue-300", border: "border-navy/20", columnColor: "bg-navy/[0.02]" };
            case "amber": return { header: "bg-amber-500/10 text-amber-700", border: "border-amber-500/20", columnColor: "bg-amber-500/[0.02]" };
            case "indigo": return { header: "bg-indigo-500/10 text-indigo-700", border: "border-indigo-500/20", columnColor: "bg-indigo-500/[0.02]" };
            case "red": return { header: "bg-red-500/10 text-red-700", border: "border-red-500/20", columnColor: "bg-red-500/[0.02]" };
            case "purple": return { header: "bg-purple-500/10 text-purple-700", border: "border-purple-500/20", columnColor: "bg-purple-500/[0.02]" };
            case "pink": return { header: "bg-pink-500/10 text-pink-700", border: "border-pink-500/20", columnColor: "bg-pink-500/[0.02]" };
            default: return { header: "bg-slate-500/10 text-slate-700", border: "border-slate-500/20", columnColor: "bg-slate-500/[0.02]" };
        }
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search opportunities by title or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted border-border focus:bg-background transition-all h-10 rounded-lg text-sm"
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Pipeline</span>
                        <span className="text-lg font-black text-navy dark:text-blue-300 leading-none">
                            ${deals.filter(d => 
                                d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                d.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                            ).reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                        </span>
                    </div>
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchQuery("")}
                            className="bg-muted hover:bg-muted/80 h-10 w-10 border border-border shrink-0"
                        >
                            <FilterX className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-280px)]">
            {stagesConfig.map((stage: any, i: number) => {
                const columnDeals = deals.filter(d => {
                    const matchesStage = (d as any).customStage ? (d as any).customStage === stage.value : d.stage === stage.value;
                    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         d.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesStage && matchesSearch;
                });
                const totalValue = columnDeals.reduce((sum, d) => sum + d.value, 0);
                const design = getColorVars(stage.color);

                return (
                    <div
                        key={stage.id || stage.value || `stage-${i}`}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, stage.value)}
                        className={`min-w-[320px] w-[320px] rounded-2xl flex flex-col border ${design.border} ${design.columnColor} overflow-hidden shadow-sm`}
                    >
                        <div className={`px-4 py-3 mx-2 mt-2 rounded-xl ${design.header} flex items-center justify-between`}>
                            <h3 className="font-semibold text-sm tracking-tight">{stage.label}</h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-background/60 shadow-sm border border-black/5">
                                {columnDeals.length}
                            </span>
                        </div>

                        <div className="flex-1 p-2 flex flex-col gap-3 overflow-y-auto px-2 min-h-[150px] transition-colors pt-4">
                            {columnDeals.map((deal) => {
                                // Pipedrive "Rotting" Logic: If deal is not Won/Lost and hasn't been updated in 30 days
                                const isRotten =
                                    (deal.stage !== "WON" && deal.stage !== "LOST") &&
                                    (new Date().getTime() - new Date(deal.updatedAt).getTime() > 30 * 24 * 60 * 60 * 1000);
                                const daysInStage = Math.max(1, Math.floor((new Date().getTime() - new Date(deal.updatedAt).getTime()) / (1000 * 3600 * 24)));

                                return (
                                    <div
                                        key={deal.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, deal.id)}
                                        onClick={() => setSelectedDeal(deal)}
                                        className={`bg-card p-4 rounded-lg shadow-[0_2px_10px_rgb(0,0,0,0.02)] border ${isRotten ? 'border-red-500' : 'border-border/60'} cursor-grab active:cursor-grabbing hover:border-border transition-colors relative group`}
                                    >
                                        <div className="font-semibold text-[15px] text-foreground leading-tight mb-1">
                                            {deal.title}
                                        </div>
                                        <div className="text-sm font-medium tracking-tight text-muted-foreground mb-4">
                                            ${deal.value.toLocaleString()}
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex -space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-background ring-1 ring-border overflow-hidden">
                                                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <div>
                                                {isRotten ? (
                                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                                        <AlertCircle className="w-3 h-3 text-red-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-muted-foreground">
                                            <span className="text-[11px] font-medium">{daysInStage} days in stage</span>
                                        </div>

                                        {stage.value === "WON" && (
                                            <div className="mt-3 animate-in fade-in zoom-in duration-300">
                                                <button 
                                                    onClick={(e) => handleOnboard(e, deal.id)}
                                                    className="w-full py-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm border border-indigo-800"
                                                >
                                                    Process Order →
                                                </button>
                                            </div>
                                        )}
                                        {stage.value === "LOST" && (
                                            <div className="mt-3 animate-in fade-in zoom-in duration-300">
                                                <button 
                                                    onClick={(e) => handleArchive(e, deal.id)}
                                                    className="w-full py-1.5 text-xs font-bold rounded-md bg-stone-700 hover:bg-stone-800 text-white transition-colors shadow-sm border border-stone-900"
                                                >
                                                    Archive Deal →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <DealSheet
                deal={selectedDeal}
                isOpen={!!selectedDeal}
                onClose={() => setSelectedDeal(null)}
                effectiveRole={effectiveRole}
                dealStages={dealStages}
            />
        </div>
    </div>
    );
}
