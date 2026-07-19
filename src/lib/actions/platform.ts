"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Fetches high-level KPIs for the entire platform.
 */
export async function getPlatformStats() {
    if (!await isSuperAdmin()) throw new Error("Unauthorized");

    try {
        const [totalAccounts, totalUsers, totalLeads, totalWorkspaces] = await Promise.all([
            (prisma as any).subscriptionAccount.count(),
            prisma.user.count(),
            prisma.lead.count(),
            prisma.workspace.count()
        ]);

        // Fetch Tier Distribution
        const tierCounts = await (prisma as any).subscriptionAccount.groupBy({
            by: ['planTier'],
            _count: { id: true }
        });

        // Fetch Recent Subscriptions
        const recentAccounts = await (prisma as any).subscriptionAccount.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { users: { where: { isAccountOwner: true }, select: { name: true, email: true }, take: 1 } }
        });

        // Calculate Real MRR based on Tiers
        const pricing = { FREE: 0, STARTER: 49, PRO: 99, ENTERPRISE: 249 };
        const totalMRR = tierCounts.reduce((sum: number, t: any) => sum + (pricing[t.planTier as keyof typeof pricing] || 0) * t._count.id, 0);

        return {
            success: true,
            stats: {
                totalAccounts,
                totalUsers,
                totalLeads,
                totalWorkspaces,
                totalMRR,
                tiers: tierCounts,
                recentAccounts
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches all subscription accounts for management.
 */
export async function getAllAccounts() {
    if (!await isSuperAdmin()) throw new Error("Unauthorized");

    try {
        const accounts = await (prisma as any).subscriptionAccount.findMany({
            include: {
                users: { where: { isAccountOwner: true }, select: { name: true, email: true }, take: 1 },
                _count: { select: { users: true, workspaces: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, accounts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Global audit logs for the platform.
 */
export async function getPlatformAuditLogs(skip = 0, take = 50) {
    if (!await isSuperAdmin()) throw new Error("Unauthorized");

    try {
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    workspace: { select: { name: true } }
                }
            }),
            prisma.auditLog.count()
        ]);

        return { success: true, logs, total };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Manual Admin Override: Change a plan tier without going through Stripe.
 */
export async function manualPlanOverride(accountId: string, newTier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE') {
    if (!await isSuperAdmin()) throw new Error("Unauthorized");

    try {
        await (prisma as any).subscriptionAccount.update({
            where: { id: accountId },
            data: { planTier: newTier, hasPaymentSetup: true }
        });

        revalidatePath("/dashboard/saas");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
