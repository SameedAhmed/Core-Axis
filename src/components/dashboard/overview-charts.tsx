"use client";

import { useState, useEffect } from "react";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Area,
    AreaChart,
    Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface OverviewChartsProps {
    trendData: any[];
    funnelData: any[];
}

export function OverviewCharts({ trendData, funnelData }: OverviewChartsProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card/95 backdrop-blur-md p-4 border border-border shadow-xl rounded-xl">
                    <p className="text-sm font-semibold text-foreground mb-2 border-b border-border/60 pb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mt-1">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-muted-foreground font-medium">{entry.name}:</span>
                            <span className="text-sm font-bold text-foreground">
                                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const FunnelTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 shadow-2xl rounded-lg">
                    <p className="text-sm font-bold text-popover-foreground mb-1.5">{label} Stage</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Deals:</span>
                        <span className="text-sm font-bold text-popover-foreground">{payload[0].payload.value}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium">Value:</span>
                        <span className="text-sm font-bold text-navy dark:text-blue-300">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(payload[0].payload.amount)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="col-span-full lg:col-span-4"
            >
                <Card className="shadow-lg shadow-black/5 dark:shadow-none border-border/60 bg-card overflow-hidden group h-full">
                    <CardHeader className="border-b border-border/40 bg-muted/30 pb-4">
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                            Revenue Trajectory
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-muted-foreground">
                            Pipeline volume vs Sales Confirmed revenue over time
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 pb-2 pr-6">
                        {!isMounted ? <div className="w-full h-[220px] sm:h-[300px] bg-muted/20 animate-pulse rounded-md" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1a3a8f" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#1a3a8f" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d1b4b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0d1b4b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
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
                                        tickFormatter={(value) => `$${value / 1000}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="pipeline"
                                        name="Pipeline Value"
                                        stroke="#0d1b4b"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPipe)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="won"
                                        name="Revenue Won"
                                        stroke="#1a3a8f"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorWon)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="col-span-full lg:col-span-3"
            >
                <Card className="shadow-lg shadow-black/5 dark:shadow-none border-border/60 bg-card overflow-hidden group h-full">
                    <CardHeader className="border-b border-border/40 bg-muted/30 pb-4">
                        <CardTitle className="text-base font-semibold text-foreground">
                            Sales Funnel Diagnostics
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-muted-foreground">
                            Current active deal distribution by stage
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 pb-2 pr-6">
                        {!isMounted ? <div className="w-full h-[220px] sm:h-[300px] bg-muted/20 animate-pulse rounded-md" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                                    <XAxis
                                        type="number"
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value / 1000}k`}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        fontWeight={500}
                                    />
                                    <Tooltip cursor={{ fill: 'var(--color-muted)' }} content={<FunnelTooltip />} />
                                    <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={36}>
                                        {funnelData.map((entry, index) => {
                                            // Progressive navy/blue palette
                                            const colors = ["#b9d5ff", "#63a3ff", "#1a3a8f", "#0d1b4b"];
                                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
