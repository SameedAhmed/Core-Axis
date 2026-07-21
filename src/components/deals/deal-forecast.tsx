"use client";

import { useMemo, useState, useEffect } from "react";
import { Deal } from "@/generated/prisma/client/client";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Target, DollarSign, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

interface DealForecastProps {
    data: any[];
    effectiveRole?: string;
    organizations?: any;
    dealStages?: any;
}

const STAGE_WEIGHTS: Record<string, number> = {
    QUALIFICATION: 0.1,
    PROPOSAL: 0.5,
    NEGOTIATION: 0.8,
    WON: 1.0,
    LOST: 0.0,
};

const STAGE_COLORS: Record<string, string> = {
    QUALIFICATION: "#94a3b8", // slate-400
    PROPOSAL: "#1a3a8f", // brand navy
    NEGOTIATION: "#a78bfa", // violet-400
    WON: "#34d399", // indigo-400
};

export function DealForecast({ data, effectiveRole, organizations, dealStages }: DealForecastProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const { chartData, summary } = useMemo(() => {
        let totalPipeline = 0;
        let totalWeighted = 0;
        let wonAmount = 0;

        const stagesConfig = dealStages || [
            { id: "s1", value: "QUALIFICATION", label: "New Lead", color: "slate" },
            { id: "s2", value: "PROPOSAL", label: "Contacted", color: "blue" },
            { id: "s3", value: "NEGOTIATION", label: "Negotiation", color: "amber" },
            { id: "s4", value: "WON", label: "Sales Confirmed", color: "indigo" }
        ];

        // Group by stage
        const stageMap: Record<string, { stage: string, totalCount: number, actualValue: number, weightedValue: number, color: string }> = {};
        
        stagesConfig.forEach((s: any) => {
            if (s.value === "LOST") return;
            stageMap[s.value] = { 
                stage: s.label, 
                totalCount: 0, 
                actualValue: 0, 
                weightedValue: 0,
                color: s.color
            };
        });

        const STAGE_WEIGHTS_LOCAL: Record<string, number> = {
            QUALIFICATION: 0.1,
            PROPOSAL: 0.5,
            NEGOTIATION: 0.8,
            WON: 1.0,
            LOST: 0.0,
        };

        data.forEach(deal => {
            let stageKey = deal.stage;

            // Map custom stages back to standard stages for forecasting purposes
            if (stageKey === "WON" || deal.customStage === "ONBOARDED") {
                stageKey = "WON";
            } else if (stageKey === "LOST" || deal.customStage === "ARCHIVED") {
                stageKey = "LOST";
            } else if (deal.customStage) {
                stageKey = deal.customStage;
            }

            if (stageKey === "LOST") return;

            const weight = STAGE_WEIGHTS_LOCAL[stageKey] || 0.5; // Default 50% for custom stages
            const value = deal.value || 0;
            const weightedValue = value * weight;

            if (stageMap[stageKey]) {
                stageMap[stageKey].totalCount += 1;
                stageMap[stageKey].actualValue += value;
                stageMap[stageKey].weightedValue += weightedValue;
            }

            if (stageKey !== "WON") {
                totalPipeline += value;
                totalWeighted += weightedValue;
            } else {
                wonAmount += value;
            }
        });

        return {
            chartData: Object.values(stageMap),
            summary: {
                totalActivePipeline: totalPipeline,
                expectedRevenue: totalWeighted,
                wonRevenue: wonAmount
            }
        };
    }, [data]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 shadow-2xl rounded-lg z-50">
                    <p className="text-sm font-bold text-popover-foreground mb-1.5">{label} Stage</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium">Potential Value:</span>
                        <span className="text-sm font-bold text-foreground">
                            {formatCurrency(payload[0]?.payload?.actualValue)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium">Weighted Forecast:</span>
                        <span className="text-sm font-bold text-navy dark:text-blue-300">
                            {formatCurrency(payload[0]?.payload?.weightedValue)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Deals in Stage:</span>
                        <span className="text-sm font-bold">{payload[0]?.payload?.totalCount}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label="Total Active Pipeline"
                    value={formatCurrency(summary.totalActivePipeline)}
                    icon={<DollarSign />}
                    theme="navy"
                    trend={{ icon: <Activity />, text: "Gross value of open deals" }}
                />
                <StatCard
                    label="Weighted Forecast"
                    value={formatCurrency(summary.expectedRevenue)}
                    icon={<Target />}
                    theme="navy"
                    trend={{ icon: <TrendingUp />, text: "Expected revenue based on close probability" }}
                />
                <StatCard
                    label="Sales Confirmed Revenue"
                    value={formatCurrency(summary.wonRevenue)}
                    icon={<TrendingUp />}
                    theme="navy"
                    trend={{ icon: <Target />, text: "Actual realized revenue" }}
                />
            </div>

            <Card className="shadow-sm border-border bg-card">
                <CardHeader className="border-b border-border/40 bg-muted/30 pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Pipeline Progression Forecast</CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground">
                        Comparing total potential value vs. weighted expected value across all stages.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 pb-2 pr-6">
                    <div className="h-[400px] w-full">
                        {!isMounted ? <div className="w-full h-full bg-muted/20 animate-pulse rounded-md" /> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                                    <XAxis
                                        dataKey="stage"
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                        tickFormatter={(val) => `$${val / 1000}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} />
                                    <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: 500 }} />
                                    <Bar dataKey="actualValue" name="Potential Value" fill="var(--color-muted-foreground)" opacity={0.2} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="weightedValue" name="Weighted Expected Forecast" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => {
                                            const getColor = (c: string) => {
                                                switch (c) {
                                                    case "blue": return "#1a3a8f";
                                                    case "amber": return "#f59e0b";
                                                    case "indigo": return "#1a3a8f";
                                                    case "red": return "#ef4444";
                                                    case "purple": return "#a855f7";
                                                    case "pink": return "#ec4899";
                                                    default: return "#94a3b8";
                                                }
                                            };
                                            return <Cell key={`cell-${index}`} fill={getColor(entry.color)} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
