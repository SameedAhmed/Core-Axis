"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, BarChart3, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { useState } from "react";

interface DashboardMetrics {
    totalWon: number;
    activeDeals: number;
    conversionRate: number;
    totalActivities: number;
    totalLeads: number;
    convertedLeads: number;
    totalPipelineValue: number;
    negotiationDeals: number;
    funnelData: { name: string; value: number; amount: number }[];
}

interface AiReportDialogProps {
    metrics: DashboardMetrics;
}

export function AiReportDialog({ metrics }: AiReportDialogProps) {
    const [open, setOpen] = useState(false);

    const {
        totalWon, activeDeals, conversionRate, totalActivities,
        totalLeads, convertedLeads, totalPipelineValue, negotiationDeals, funnelData
    } = metrics;

    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    
    // Derive intelligent insights from real data
    const topStage = [...funnelData].sort((a, b) => b.amount - a.amount)[0];
    const unclosedLeads = totalLeads - convertedLeads;
    const pipelineCapture = totalPipelineValue > 0 && totalWon > 0
        ? ((totalWon / (totalWon + totalPipelineValue)) * 100).toFixed(1)
        : "0";
    
    const bottlenecks = [];
    if (negotiationDeals > 0) bottlenecks.push({ title: `${negotiationDeals} Deal${negotiationDeals > 1 ? "s" : ""} Stalled in Negotiation`, desc: `${negotiationDeals} deal${negotiationDeals > 1 ? "s are" : " is"} in the Negotiation phase. Follow up within 48 hours to increase close probability by up to 14%.` });
    if (unclosedLeads > 0) bottlenecks.push({ title: `${unclosedLeads} Unconverted Lead${unclosedLeads > 1 ? "s" : ""}`, desc: `${unclosedLeads} lead${unclosedLeads > 1 ? "s have" : " has"} not been converted yet. Run targeted engagement sequences to improve the overall ${conversionRate}% conversion rate.` });
    if (bottlenecks.length === 0) bottlenecks.push({ title: "No Critical Bottlenecks Detected", desc: "Your pipeline is clean and healthy. Continue monitoring deal velocity." });

    const actions = [];
    if (negotiationDeals > 0) actions.push(`Schedule alignment calls for ${negotiationDeals} stalled negotiation deal${negotiationDeals > 1 ? "s" : ""}.`);
    if (unclosedLeads > 5) actions.push(`Launch re-engagement sequence for ${unclosedLeads} unconverted leads.`);
    if (topStage) actions.push(`Focus upsell effort on "${topStage.name}" stage — ${fmt(topStage.amount)} pipeline value sitting there.`);
    if (actions.length === 0) actions.push("Pipeline is healthy. Review lead sourcing to fuel new growth.");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-teal-600 to-indigo-700 hover:from-indigo-500 hover:to-teal-500 text-white shadow-lg shadow-teal-900/20 font-medium h-9 px-5 border-0 rounded-xl group transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
                    <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse text-indigo-100" />
                    <span className="relative font-semibold tracking-wide drop-shadow-sm">AI Analysis</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[1000px] border-border/50 bg-white dark:bg-zinc-950 shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] rounded-[24px] overflow-hidden p-0 max-h-[90vh] flex flex-col [&>button]:text-zinc-400 [&>button:hover]:text-white transition-all [&>button]:z-[100]">
                <div className="bg-[#0A0A0B] p-6 sm:p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
                    <DialogHeader className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight text-white">
                                <div className="p-2 sm:p-2.5 bg-white/5 rounded-[14px] backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
                                </div>
                                Intelligence Report
                            </DialogTitle>
                            <DialogDescription className="text-zinc-400 text-sm sm:text-base mt-3 sm:ml-2 max-w-lg font-medium">
                                AI-driven analysis of your live pipeline — {totalLeads} leads, {activeDeals} active deals, {fmt(totalPipelineValue)} pipeline value.
                            </DialogDescription>
                        </div>
                        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">Live Analysis</span>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-4 sm:p-8 grid gap-6 lg:grid-cols-3 overflow-y-auto flex-1 bg-muted/30">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                                <Activity className="h-5 w-5 text-blue-500 dark:text-blue-400" /> Executive Summary
                            </h3>
                            <div className="p-5 sm:p-6 rounded-[20px] bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-muted-foreground leading-relaxed text-[15px]">
                                    Your pipeline currently holds <strong className="text-foreground font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded">{fmt(totalPipelineValue)}</strong> in active deals across <strong className="text-foreground font-semibold">{activeDeals} open opportunities</strong>.{" "}
                                    {totalWon > 0 ? (
                                        <>You have closed <strong className="text-foreground font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">{fmt(totalWon)}</strong> in revenue, representing a <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{pipelineCapture}%</span> capture rate of total pipeline.</>
                                    ) : (
                                        <>No deals have been closed yet. Focus on advancing the {activeDeals} active deals in your pipeline toward closure.</>
                                    )}{" "}
                                    Overall lead conversion stands at <span className="text-purple-600 dark:text-purple-400 font-semibold">{conversionRate}%</span> ({convertedLeads} of {totalLeads} leads converted).
                                </p>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 sm:p-6 rounded-[20px] bg-card border border-border shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Pipeline</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-2 tracking-tight">{fmt(totalPipelineValue)}</p>
                                    </div>
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 w-fit px-3 py-1 rounded-full">
                                    <CheckCircle2 className="h-4 w-4" /> {activeDeals} active opportunities
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 rounded-[20px] bg-card border border-border shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Activities</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-2 tracking-tight">{totalActivities}</p>
                                    </div>
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/10 w-fit px-3 py-1 rounded-full">
                                    <ChevronRight className="h-4 w-4" /> Logged interactions
                                </div>
                            </div>
                        </div>

                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                                <AlertCircle className="h-5 w-5 text-amber-500" /> Identified Bottlenecks
                            </h3>
                            <ul className="space-y-3">
                                {bottlenecks.map((item, i) => (
                                    <li key={i} className="flex gap-4 p-5 rounded-[20px] border border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                                        <div>
                                            <h4 className="font-bold text-foreground text-[15px]">{item.title}</h4>
                                            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <section className="p-6 rounded-[24px] bg-[#0A0A0B] text-white shadow-xl relative overflow-hidden h-full flex flex-col border border-zinc-800">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none" />
                            <h3 className="text-lg font-bold flex items-center gap-2 relative z-10 mb-6 tracking-tight">
                                <Sparkles className="h-5 w-5 text-indigo-400" /> Recommended Actions
                            </h3>
                            <div className="space-y-4 relative z-10 flex-1">
                                {actions.map((action, i) => (
                                    <div key={i} className="flex items-start gap-3.5 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all cursor-pointer group">
                                        <div className="mt-0.5 rounded-full p-1 bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-colors">
                                            <ChevronRight className="h-3.5 w-3.5 text-indigo-300" />
                                        </div>
                                        <p className="text-sm font-medium text-zinc-300 leading-relaxed group-hover:text-white transition-colors">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
