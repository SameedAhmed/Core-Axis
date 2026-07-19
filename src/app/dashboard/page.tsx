import Link from "next/link";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Activity, Target, CheckCircle2, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getScopeWhere, getEffectiveRole } from "@/lib/permissions";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { AiReportDialog } from "@/components/dashboard/ai-report-dialog";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
    const session = await getServerSession(authOptions);
    const user = await prisma.user.findUnique({ where: { email: session?.user?.email || "" } });
    const effectiveRole = await getEffectiveRole(user);
    const scopeWhere = getScopeWhere(effectiveRole, user?.id as string, (user as any)?.activeWorkspaceId);

    // Resolve the selected period into a start date
    const resolvedParams = await searchParams;
    const periodParam = resolvedParams?.period || "6m";
    const now = new Date();
    const periodMonths = periodParam === "3m" ? 3 : periodParam === "12m" ? 12 : 6;
    const periodStart = startOfMonth(subMonths(now, periodMonths - 1));
    const periodFilter = { gte: periodStart };

    // Fetch Workspace for dynamic stages
    const workspace = await prisma.workspace.findUnique({
        where: { id: (user as any)?.activeWorkspaceId || "" }
    });
    const stagesConfig: any[] = (workspace?.dealStages as any) || [
        { id: "s1", value: "QUALIFICATION", label: "New Lead" },
        { id: "s2", value: "PROPOSAL", label: "Contacted" },
        { id: "s3", value: "NEGOTIATION", label: "Negotiation" },
        { id: "s4", value: "WON", label: "Sales Confirmed" },
        { id: "s5", value: "LOST", label: "Closed-Lost" }
    ];

    // 1. Core Metrics — all run concurrently
    const [
        totalLeads,
        convertedLeads,
        wonDealsReq,
        activeDeals,
        totalActivities,
        dealsByStage,
        allDeals
    ] = await Promise.all([
        prisma.lead.count({ where: { ...scopeWhere, createdAt: periodFilter } }),
        prisma.lead.count({ where: { status: "CONVERTED", ...scopeWhere, createdAt: periodFilter } }),
        prisma.deal.aggregate({
            _sum: { value: true },
            where: {
                OR: [
                    { stage: "WON", ...scopeWhere },
                    { customStage: "ONBOARDED", ...scopeWhere }
                ]
            }
        }),
        prisma.deal.count({
            where: { stage: { notIn: ["WON", "LOST"] }, ...scopeWhere, createdAt: periodFilter }
        }),
        prisma.activity.count({
            where: { 
                ...getScopeWhere(effectiveRole, user?.id as string, (user as any)?.activeWorkspaceId, "userId"),
                createdAt: periodFilter
            }
        }),
        // GROUP BY both stage and customStage to handle dynamic pipelines
        prisma.deal.findMany({
            where: { ...scopeWhere, createdAt: periodFilter },
            select: { value: true, stage: true, customStage: true }
        }),
        // Fetch all deals for real monthly aggregation
        prisma.deal.findMany({
            where: { ...scopeWhere, updatedAt: periodFilter },
            select: { value: true, stage: true, customStage: true, createdAt: true, updatedAt: true }
        })
    ]);

    // Aggregate deals by stage for the funnel (handling custom stages)
    const aggregatedStages = stagesConfig.map(s => {
        const matchingDeals = dealsByStage.filter(d => 
            d.customStage ? d.customStage === s.value : d.stage === s.value
        );
        return {
            name: s.label,
            value: matchingDeals.length,
            amount: matchingDeals.reduce((sum, d) => sum + (d.value || 0), 0)
        };
    });

    // 2. Real Monthly Revenue Trend
    const monthlyTrend = Array.from({ length: periodMonths }, (_, i) => {
        const monthDate = subMonths(now, (periodMonths - 1) - i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const label = format(monthDate, "MMM");

        const monthDeals = allDeals.filter(d => {
            const date = new Date(d.updatedAt);
            return date >= start && date <= end;
        });

        const won = monthDeals
            .filter(d => d.stage === "WON" || (d as any).customStage === "ONBOARDED")
            .reduce((sum, d) => sum + (d.value || 0), 0);

        const pipeline = monthDeals
            .filter(d => !["WON", "LOST"].includes(d.stage))
            .reduce((sum, d) => sum + (d.value || 0), 0);

        return { name: label, won, pipeline };
    });

    // 3. Funnel Data (now limited to first 4 stages for UI balance, or all)
    const funnelData = aggregatedStages.filter(s => s.name !== "Closed-Lost");

    // 4. Computed Stats
    const totalWon = wonDealsReq._sum.value || 0;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const totalPipelineValue = allDeals.filter(d => !["WON", "LOST"].includes(d.stage)).reduce((s, d) => s + (d.value || 0), 0);
    const negotiationDeals = aggregatedStages.find(s => s.name === "Negotiation")?.value || 0;
    const stalledDeals = dealsByStage.filter(d => (d as any).stage === "NEGOTIATION").length;

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
    return (
        <div className="flex-1 space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4 border-b border-border/50">
                <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3 flex-wrap leading-tight">
                        Executive Dashboard
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] sm:text-[11px] uppercase tracking-widest font-black py-1 px-3 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2" />
                            Live
                        </span>
                    </h2>
                    <p className="text-sm sm:text-[15px] font-medium text-muted-foreground max-w-2xl leading-relaxed">System overview, pipeline value, and AI projections.</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end">
                    <DashboardControls />
                    <AiReportDialog
                        metrics={{
                            totalWon,
                            activeDeals,
                            conversionRate: parseFloat(conversionRate),
                            totalActivities,
                            totalLeads,
                            convertedLeads,
                            totalPipelineValue,
                            negotiationDeals,
                            funnelData,
                        }}
                    />
                </div>
            </div>

            {/* Stat Cards — each one is a clickable Link */}
            <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Revenue */}
                <Link href="/dashboard/deals?view=forecast" className="block group">
                    <Card className="relative overflow-hidden shadow-sm hover:shadow-2xl border-border/60 bg-card transition-all duration-500 rounded-3xl transform hover:-translate-y-1.5 cursor-pointer h-full">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5 sm:p-6 sm:pb-2 relative z-10">
                            <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Revenue</CardTitle>
                            <div className="bg-primary/10 text-primary p-2.5 rounded-2xl group-hover:rotate-12 transition-all duration-500 border border-primary/20 shadow-sm">
                                <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 px-5 sm:px-6 pb-6 sm:pb-6">
                            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(totalWon)}</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                                <TrendingUp className="h-3 w-3" />
                                Won Items
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Card 2: Active Deals */}
                <Link href="/dashboard/deals" className="block group">
                    <Card className="relative overflow-hidden shadow-sm hover:shadow-2xl border-border/60 bg-card transition-all duration-500 rounded-3xl transform hover:-translate-y-1.5 cursor-pointer h-full">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5 sm:p-6 sm:pb-2 relative z-10">
                            <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Pipeline</CardTitle>
                            <div className="bg-primary/10 text-primary p-2.5 rounded-2xl group-hover:rotate-12 transition-all duration-500 border border-primary/20 shadow-sm">
                                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 px-5 sm:px-6 pb-6 sm:pb-6">
                            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">{activeDeals}</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {formatCurrency(totalPipelineValue)}
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Card 3: Conversion Rate */}
                <Link href="/dashboard/leads" className="block group">
                    <Card className="relative overflow-hidden shadow-sm hover:shadow-2xl border-border/60 bg-card transition-all duration-500 rounded-3xl transform hover:-translate-y-1.5 cursor-pointer h-full">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5 sm:p-6 sm:pb-2 relative z-10">
                            <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Conversion</CardTitle>
                            <div className="bg-primary/10 text-primary p-2.5 rounded-2xl group-hover:rotate-12 transition-all duration-500 border border-primary/20 shadow-sm">
                                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 px-5 sm:px-6 pb-6 sm:pb-6">
                            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">{conversionRate}%</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                                <TrendingUp className="h-3 w-3" />
                                {convertedLeads} Won
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Card 4: Activities */}
                <Link href="/dashboard/activities" className="block group">
                    <Card className="relative overflow-hidden shadow-sm hover:shadow-2xl border-border/60 bg-card transition-all duration-500 rounded-3xl transform hover:-translate-y-1.5 cursor-pointer h-full">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5 sm:p-6 sm:pb-2 relative z-10">
                            <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Activities</CardTitle>
                            <div className="bg-primary/10 text-primary p-2.5 rounded-2xl group-hover:rotate-12 transition-all duration-500 border border-primary/20 shadow-sm">
                                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 px-5 sm:px-6 pb-6 sm:pb-6">
                            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">{totalActivities}</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                                Interactions
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Charts */}
            <div className="w-full overflow-hidden">
                <OverviewCharts trendData={monthlyTrend} funnelData={funnelData} />
            </div>
        </div>
    );
}
