"use client";

import { useMemo, useState, useEffect } from "react";
import { User } from "@/generated/prisma/client/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Target, TrendingUp, Users, Activity, Pencil, Check, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { startOfDay, endOfDay, isWithinInterval, subDays, format } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserTarget } from "@/lib/actions/targets";
import { toast } from "sonner";

interface PerformanceHubProps {
    currentUser: User;
    effectiveRole: string;
    leads: any[];
    deals: any[];
    targets?: Record<string, number>;
    workspaceUsers?: any[];
}

export function PerformanceHub({ currentUser, effectiveRole, leads, deals, targets = {}, workspaceUsers = [] }: PerformanceHubProps) {
    const defaultFrom = subDays(new Date(), 30);
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>({
        from: defaultFrom,
        to: new Date()
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const { filteredLeads, filteredDeals } = useMemo(() => {
        if (!dateRange?.from) return { filteredLeads: leads, filteredDeals: deals };
        const end = dateRange.to || dateRange.from;
        const interval = { start: startOfDay(dateRange.from), end: endOfDay(end) };

        return {
            filteredLeads: leads.filter(l => isWithinInterval(new Date(l.createdAt), interval)),
            filteredDeals: deals.filter(d => isWithinInterval(new Date(d.createdAt), interval))
        };
    }, [leads, deals, dateRange]);

    const isManagerOrAdmin = effectiveRole === "ADMIN" || effectiveRole === "MANAGER";

    // Current user's stats or Collective stats
    const myLeads = isManagerOrAdmin ? filteredLeads : filteredLeads.filter(l => l.ownerId === currentUser.id);
    const myDeals = isManagerOrAdmin ? filteredDeals : filteredDeals.filter(d => d.ownerId === currentUser.id);

    const myWonDeals = myDeals.filter(d => d.stage === "WON" || d.customStage === "ONBOARDED");
    const myRevenue = myWonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const myConvertedLeads = myLeads.filter(l => l.status === "CONVERTED");

    // Dynamic Targets
    const [localTargets, setLocalTargets] = useState(targets);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editTargetValue, setEditTargetValue] = useState("");
    const [isSavingTarget, setIsSavingTarget] = useState(false);

    const baseMonthlyTarget = isManagerOrAdmin 
        ? workspaceUsers.reduce((sum, u) => sum + (localTargets[u.id] || 0), 0)
        : (localTargets[currentUser.id] || 0); 
        
    const monthlyTarget = baseMonthlyTarget > 0 ? baseMonthlyTarget : 0;

    const targetProgress = monthlyTarget > 0 ? Math.min((myRevenue / monthlyTarget) * 100, 100) : 0;

    const handleSaveUserTarget = async (userId: string) => {
        const numVal = parseFloat(editTargetValue);
        if (isNaN(numVal) || numVal <= 0) {
            toast.error("Please enter a valid positive number");
            return;
        }

        setIsSavingTarget(true);
        const res = await updateUserTarget(userId, numVal);
        if (res.success) {
            toast.success("Rep Target updated!");
            setLocalTargets(prev => ({ ...prev, [userId]: numVal }));
            setEditingUserId(null);
        } else {
            toast.error(res.error || "Failed to update target");
        }
        setIsSavingTarget(false);
    };

    const conversionRate = myLeads.length > 0
        ? Math.round((myConvertedLeads.length / myLeads.length) * 100)
        : 0;

    const revenueChartData = useMemo(() => {
        const sortedDeals = [...myWonDeals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const sortedMap: Record<string, number> = {};
        
        sortedDeals.forEach(deal => {
            const dayKey = format(new Date(deal.createdAt), "MMM dd");
            if (!sortedMap[dayKey]) sortedMap[dayKey] = 0;
            sortedMap[dayKey] += Number(deal.value) || 0;
        });

        // If no data in the range, return a placeholder so the chart isn't empty
        if (Object.keys(sortedMap).length === 0) {
            return [
                { date: format(subDays(new Date(), 7), "MMM dd"), revenue: 0 },
                { date: format(new Date(), "MMM dd"), revenue: 0 }
            ];
        }

        return Object.entries(sortedMap).map(([date, revenue]) => ({ date, revenue }));
    }, [myWonDeals]);

    // Leaderboard Data (Admins/Managers)
    const leaderboard = useMemo(() => {
        const repMap: Record<string, { id: string; name: string; totalRevenue: number; wonDeals: number; totalLeads: number; convertedLeads: number }> = {};

        filteredLeads.forEach(lead => {
            if (!lead.ownerId) return;
            const repId = lead.ownerId;
            const repName = lead.owner?.name || "Unknown Rep";
            if (!repMap[repId]) repMap[repId] = { id: repId, name: repName, totalRevenue: 0, wonDeals: 0, totalLeads: 0, convertedLeads: 0 };
            repMap[repId].totalLeads += 1;
            if (lead.status === "CONVERTED") repMap[repId].convertedLeads += 1;
        });

        filteredDeals.forEach(deal => {
            if (!deal.ownerId) return;
            const repId = deal.ownerId;
            const repName = deal.owner?.name || "Unknown Rep";
            if (!repMap[repId]) repMap[repId] = { id: repId, name: repName, totalRevenue: 0, wonDeals: 0, totalLeads: 0, convertedLeads: 0 };
            if (deal.stage === "WON" || deal.customStage === "ONBOARDED") {
                repMap[repId].wonDeals += 1;
                repMap[repId].totalRevenue += Number(deal.value) || 0;
            }
        });

        return Object.values(repMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredLeads, filteredDeals, effectiveRole]);


    return (
        <div className="space-y-6">
            {/* My Performance Section */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Activity className="w-5 h-5 text-navy dark:text-blue-300" /> {isManagerOrAdmin ? "Overall Team Data" : "My Performance"}
                    </h2>
                    <div className="bg-card border border-border rounded-lg shadow-sm">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Revenue Generated</CardTitle>
                            <DollarSign className="h-4 w-4 text-navy dark:text-blue-300" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground overflow-hidden text-ellipsis">${myRevenue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1 text-navy dark:text-blue-300 font-medium">In selected period</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Monthly Target</CardTitle>
                            <Target className="h-4 w-4 text-navy dark:text-blue-300" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground overflow-hidden text-ellipsis">${monthlyTarget.toLocaleString()}</div>
                            <div className="mt-2 h-2 flex items-center bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-navy rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${targetProgress}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium">{targetProgress.toFixed(0)}% reached</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Conversion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground overflow-hidden text-ellipsis">{conversionRate}%</div>
                            <p className="text-xs text-muted-foreground mt-1 text-purple-500 font-medium">{myConvertedLeads.length} won deals</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Total Leads</CardTitle>
                            <Users className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground overflow-hidden text-ellipsis">{myLeads.length}</div>
                            <p className="text-xs text-muted-foreground mt-1 text-orange-500 font-medium">{isManagerOrAdmin ? "Total active leads" : "Assigned to me"}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Growth Chart */}
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-2 border-b border-border/50">
                        <CardTitle className="text-base font-bold text-foreground">Revenue Growth</CardTitle>
                        <CardDescription>Visualizing {isManagerOrAdmin ? "cumulative team" : "your closed"} deals over the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] min-h-[250px] w-full">
                            {!isMounted ? <div className="w-full h-full bg-muted/20 animate-pulse rounded-md" /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1a3a8f" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#1a3a8f" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: '#6b7280' }} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            tickFormatter={(value) => `$${value}`}
                                            width={60}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--background)' }}
                                            formatter={(value: any) => [`$${(value || 0).toLocaleString()}`, "Revenue"]}
                                            labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#1a3a8f" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorRevenue)" 
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#1a3a8f' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Team Leaderboard (Managers/Admins Only) */}
            {effectiveRole !== "REP" && (
                <div className="pt-8 border-t border-border mt-8 pb-8">
                    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-navy dark:text-blue-300" /> Team Leaderboard
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Revenue Leaderboard */}
                        <Card className="shadow-sm border-border">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Top by Revenue
                                </CardTitle>
                                <CardDescription>Total won deals revenue per rep</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                {leaderboard.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {leaderboard.map((rep, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{rep.name}</p>
                                                        <p className="text-xs text-muted-foreground">{rep.wonDeals} deals won</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                                        ${rep.totalRevenue.toLocaleString()}
                                                    </div>
                                                    {editingUserId === rep.id ? (
                                                        <div className="flex items-center gap-1 mt-1 justify-end">
                                                            <Input 
                                                                type="number" 
                                                                className="h-6 w-20 px-2 text-[10px] font-bold focus-visible:ring-1 focus-visible:ring-navy/50 bg-background" 
                                                                value={editTargetValue} 
                                                                onChange={(e) => setEditTargetValue(e.target.value)} 
                                                                autoFocus 
                                                                onKeyDown={(e) => e.key === "Enter" && handleSaveUserTarget(rep.id as string)}
                                                            />
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-500/10 shrink-0" onClick={() => handleSaveUserTarget(rep.id as string)} disabled={isSavingTarget}>
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:bg-muted shrink-0" onClick={() => setEditingUserId(null)} disabled={isSavingTarget}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-1 group cursor-pointer hover:text-foreground" onClick={() => {
                                                            setEditTargetValue((localTargets[rep.id as string] || 10000).toString());
                                                            setEditingUserId(rep.id as string);
                                                        }}>
                                                            Target: ${(localTargets[rep.id as string] || 10000).toLocaleString()}
                                                            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground">No data available</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Conversion Leaderboard */}
                        <Card className="shadow-sm border-border">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-500" /> Top by Conversion
                                </CardTitle>
                                <CardDescription>Lead conversion rate per rep</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                {leaderboard.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {leaderboard.sort((a, b) => {
                                            const rateA = a.totalLeads > 0 ? a.convertedLeads / a.totalLeads : 0;
                                            const rateB = b.totalLeads > 0 ? b.convertedLeads / b.totalLeads : 0;
                                            return rateB - rateA;
                                        }).map((rep, idx) => {
                                            const rate = rep.totalLeads > 0 ? Math.round((rep.convertedLeads / rep.totalLeads) * 100) : 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{rep.name}</p>
                                                            <p className="text-xs text-muted-foreground">{rep.convertedLeads} of {rep.totalLeads} leads</p>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-purple-600 dark:text-purple-400">
                                                        {rate}%
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground">No data available</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
