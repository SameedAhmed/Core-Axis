"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "./audit";
import { linearForecast } from "@/lib/ai/forecast";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    return user;
}

function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
    return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * Loads real Expense/Invoice data for the current workspace, aggregates it by
 * month, fits a simple regression model on the trailing months to forecast
 * next month's spend, and flags statistical outliers (z-score > 2 within
 * their category) as anomalies.
 */
export async function getFinanceOverview() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [expenses, invoices] = await Promise.all([
            (prisma as any).expense.findMany({
                where: { workspaceId, date: { gte: sixMonthsAgo } },
                orderBy: { date: "asc" },
            }),
            (prisma as any).invoice.findMany({
                where: { workspaceId, createdAt: { gte: sixMonthsAgo }, status: "PAID" },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        // --- Build the last 6 months' buckets in order, even if empty ---
        const months: { key: string; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({ key: monthKey(d), label: monthLabel(d) });
        }

        const expenseByMonth = new Map<string, number>();
        const revenueByMonth = new Map<string, number>();

        for (const e of expenses) {
            const k = monthKey(new Date(e.date));
            expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + e.amount);
        }
        for (const inv of invoices) {
            const k = monthKey(new Date(inv.createdAt));
            revenueByMonth.set(k, (revenueByMonth.get(k) || 0) + inv.amount);
        }

        const chartData = months.map((m) => ({
            name: m.label,
            revenue: Math.round((revenueByMonth.get(m.key) || 0) * 100) / 100,
            expenses: Math.round((expenseByMonth.get(m.key) || 0) * 100) / 100,
        }));

        // --- Forecast next month's expenses via linear regression over the trailing months ---
        const expenseSeries = chartData.map((c) => c.expenses);
        const { nextValue: forecastNextMonth, slope } = linearForecast(expenseSeries);

        const totalRevenue = chartData.reduce((sum, c) => sum + c.revenue, 0);
        const totalExpenses = chartData.reduce((sum, c) => sum + c.expenses, 0);

        // --- Anomaly detection: flag expenses whose amount is a statistical
        // outlier (> 2 standard deviations from the mean) within their category ---
        const byCategory = new Map<string, number[]>();
        for (const e of expenses) {
            const arr = byCategory.get(e.category) || [];
            arr.push(e.amount);
            byCategory.set(e.category, arr);
        }

        const categoryStats = new Map<string, { mean: number; stdDev: number }>();
        for (const [category, amounts] of byCategory) {
            const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / amounts.length;
            categoryStats.set(category, { mean, stdDev: Math.sqrt(variance) });
        }

        const anomalies = expenses
            .filter((e: any) => {
                const stats = categoryStats.get(e.category);
                if (!stats || stats.stdDev === 0) return false;
                return (e.amount - stats.mean) / stats.stdDev > 2;
            })
            .map((e: any) => ({
                id: e.id,
                title: e.title,
                category: e.category,
                amount: e.amount,
                date: e.date,
            }));

        const recentExpenses = expenses.slice(-6).reverse().map((e: any) => ({
            id: e.id,
            title: e.title,
            amount: e.amount,
            category: e.category,
            date: e.date,
        }));

        const recentInvoices = invoices.slice(-6).reverse().map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount,
            status: inv.status,
            dueDate: inv.dueDate,
        }));

        return {
            success: true,
            data: {
                chartData,
                totalRevenue,
                totalExpenses,
                forecastNextMonth: Math.round(forecastNextMonth * 100) / 100,
                trend: slope > 0.5 ? "up" : slope < -0.5 ? "down" : "flat",
                anomalies,
                recentExpenses,
                recentInvoices,
                hasData: expenses.length > 0 || invoices.length > 0,
            },
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to load finance overview" };
    }
}

const expenseSchema = z.object({
    title: z.string().min(1),
    amount: z.coerce.number().positive(),
    category: z.string().min(1),
    date: z.string().optional(),
});

export async function getExpenses() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const expenses = await (prisma as any).expense.findMany({
            where: { workspaceId },
            orderBy: { date: "desc" },
        });

        return { success: true, data: expenses };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch expenses", data: [] };
    }
}

export async function createExpense(rawData: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (!workspaceId) throw new Error("No active workspace");

        const data = expenseSchema.parse(rawData);

        const expense = await (prisma as any).expense.create({
            data: {
                title: data.title,
                amount: data.amount,
                category: data.category,
                date: data.date ? new Date(data.date) : new Date(),
                workspaceId,
                createdById: user.id,
            },
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "EXPENSE",
            entityId: expense.id,
            details: `Logged expense: ${expense.title} ($${expense.amount})`,
        });

        revalidatePath("/dashboard/finance");
        revalidatePath("/dashboard/finance/expenses");
        return { success: true, data: expense };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create expense" };
    }
}

export async function getInvoices() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const invoices = await (prisma as any).invoice.findMany({
            where: { workspaceId },
            include: { organization: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: invoices };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch invoices", data: [] };
    }
}

export async function getOrganizationOptions() {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const organizations = await prisma.organization.findMany({
            where: { workspaceId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
            take: 100,
        });

        return { success: true, data: organizations };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch organizations", data: [] };
    }
}

const invoiceSchema = z.object({
    invoiceNumber: z.string().min(1),
    amount: z.coerce.number().positive(),
    status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).default("PENDING"),
    dueDate: z.string().min(1),
    organizationId: z.string().optional().nullable(),
    notes: z.string().optional(),
});

export async function createInvoice(rawData: any) {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (!workspaceId) throw new Error("No active workspace");

        const data = invoiceSchema.parse(rawData);

        const invoice = await (prisma as any).invoice.create({
            data: {
                invoiceNumber: data.invoiceNumber,
                amount: data.amount,
                status: data.status,
                dueDate: new Date(data.dueDate),
                organizationId: data.organizationId || null,
                notes: data.notes || null,
                workspaceId,
                createdById: user.id,
            },
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "INVOICE",
            entityId: invoice.id,
            details: `Created invoice #${invoice.invoiceNumber} ($${invoice.amount})`,
        });

        revalidatePath("/dashboard/finance");
        revalidatePath("/dashboard/finance/invoices");
        return { success: true, data: invoice };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create invoice" };
    }
}

export async function updateInvoiceStatus(id: string, status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED") {
    try {
        const user = await requireUser();
        const workspaceId = (user as any).activeWorkspaceId || null;

        const updated = await (prisma as any).invoice.updateMany({
            where: { id, workspaceId },
            data: { status },
        });
        if (updated.count === 0) throw new Error("Invoice not found");

        revalidatePath("/dashboard/finance");
        revalidatePath("/dashboard/finance/invoices");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update invoice" };
    }
}
