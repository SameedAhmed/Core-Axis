"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign, ArrowUpRight, ArrowDownRight, Wallet, ReceiptText, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getFinanceOverview } from "@/lib/actions/finance";

interface FinanceOverview {
  chartData: { name: string; revenue: number; expenses: number }[];
  totalRevenue: number;
  totalExpenses: number;
  forecastNextMonth: number;
  trend: "up" | "down" | "flat";
  anomalies: { id: string; title: string; category: string; amount: number; date: string }[];
  recentExpenses: { id: string; title: string; amount: number; category: string; date: string }[];
  recentInvoices: { id: string; invoiceNumber: string; amount: number; status: string; dueDate: string }[];
  hasData: boolean;
}

export default function FinanceDashboard() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFinanceOverview().then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
        <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
        <p>Crunching real Expense/Invoice data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center text-muted-foreground">
        Failed to load finance data.
      </div>
    );
  }

  const netMargin = data.totalRevenue - data.totalExpenses;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent">
            Finance Hub
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor your cash flow and AI financial insights, computed from real ledger data.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1.5 px-3">
          <CircleDollarSign className="w-4 h-4 mr-2" /> {data.hasData ? "Live Data" : "No Data Yet"}
        </Badge>
      </div>

      {!data.hasData && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-400">
            No expenses or paid invoices logged in the last 6 months yet &mdash; the numbers below will populate as real
            transactions are added on the Expenses and Invoices pages.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-500/10 shadow-lg shadow-emerald-500/5 hover:-translate-y-1 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue (6mo)</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CircleDollarSign className="text-emerald-500 w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              ${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">From paid invoices</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/10 shadow-lg shadow-red-500/5 hover:-translate-y-1 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses (6mo)</CardTitle>
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <Wallet className="text-red-500 w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              ${data.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-xs flex items-center mt-1 ${netMargin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {netMargin >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              Net {netMargin >= 0 ? "surplus" : "deficit"}: ${Math.abs(netMargin).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-500/10 shadow-lg shadow-violet-500/5 relative overflow-hidden group hover:-translate-y-1 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-24 h-24 text-violet-500 rotate-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-violet-600 dark:text-violet-400">AI Budget Forecast</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-semibold text-foreground">
              Next month&apos;s predicted expenses:{" "}
              <span className="text-violet-600 font-extrabold">
                ${data.forecastNextMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Trend: spending is {data.trend === "up" ? "rising" : data.trend === "down" ? "falling" : "stable"} &mdash; linear
              regression fit over your last 6 months of real expense data.
            </p>
          </CardContent>
        </Card>
      </div>

      {data.anomalies.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" /> Anomaly Detection &mdash; {data.anomalies.length} unusual expense(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.anomalies.map((a) => (
              <div key={a.id} className="flex justify-between items-center text-sm bg-background/60 p-2.5 rounded-lg border border-red-500/10">
                <span className="font-medium">
                  {a.title} <span className="text-muted-foreground">({a.category})</span>
                </span>
                <span className="font-bold text-red-600">${a.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-1">
              Flagged automatically: amount is more than 2 standard deviations above the mean for its category.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-lg">Cash Flow Overview (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-md flex flex-row items-center gap-2">
              <ReceiptText className="w-4 h-4" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentInvoices.length === 0 && <p className="text-sm text-muted-foreground">No paid invoices yet.</p>}
              {data.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">Invoice #{inv.invoiceNumber}</span>
                    <span className="text-xs text-muted-foreground">Due {new Date(inv.dueDate).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold text-sm bg-background px-2 py-1 rounded-md border border-border shadow-sm">
                    ${inv.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-md flex flex-row items-center gap-2">
              <Wallet className="w-4 h-4" /> Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentExpenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses logged yet.</p>}
              {data.recentExpenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{exp.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold text-sm bg-background px-2 py-1 rounded-md border border-border shadow-sm text-red-500">
                    -${exp.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
