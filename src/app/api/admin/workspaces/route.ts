import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";
        if (session.user.email !== superAdminEmail) {
            return NextResponse.json({ error: "Forbidden: Super Admin Only" }, { status: 403 });
        }

        // Fetch Accounts (formerly we fetched raw workspaces)
        const accounts = await prisma.subscriptionAccount.findMany({
            include: {
                users: { 
                    where: { isAccountOwner: true },
                    select: { name: true, email: true }
                },
                workspaces: {
                    include: {
                        _count: { select: { members: true, deals: true, leads: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Rollup Metrics across all accounts
        const totalWorkspaces = await prisma.workspace.count();
        const totalUsersResult = await prisma.user.count();
        
        const planPrices = { FREE: 0, STARTER: 49, PRO: 99, ENTERPRISE: 249 };
        const totalMRR = accounts.reduce((sum, acc) => sum + (planPrices[acc.planTier as keyof typeof planPrices] || 0), 0);

        return NextResponse.json({ 
            success: true, 
            accounts: accounts.map(acc => ({
                ...acc,
                owner: acc.users[0] || { name: "System", email: "N/A" }
            })),
            metrics: { 
                totalAccounts: accounts.length,
                totalWorkspaces, 
                totalUsers: totalUsersResult, 
                totalMRR 
            }
        });
    } catch (error) {
        console.error("Super Admin Accounts Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";
        if (session?.user?.email !== superAdminEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { accountId, action, payload } = await req.json();

        if (action === "CHANGE_PLAN") {
            const updated = await prisma.subscriptionAccount.update({
                where: { id: accountId },
                data: { planTier: payload.newPlan }
            });
            return NextResponse.json({ success: true, account: updated });
        }

        if (action === "DELETE") {
            // This will delete the account and cascade to workspaces & users
            await prisma.subscriptionAccount.delete({ where: { id: accountId } });
            return NextResponse.json({ success: true });
        }

        if (action === "TOGGLE_STATUS") {
            const current = await (prisma as any).subscriptionAccount.findUnique({ where: { id: accountId } });
            const updated = await (prisma as any).subscriptionAccount.update({
                where: { id: accountId },
                data: { isActive: !current?.isActive }
            });
            return NextResponse.json({ success: true, account: updated });
        }

        if (action === "TOGGLE_PAYMENT_SETUP") {
            const current = await (prisma as any).subscriptionAccount.findUnique({ where: { id: accountId } });
            const updated = await (prisma as any).subscriptionAccount.update({
                where: { id: accountId },
                data: { hasPaymentSetup: !current?.hasPaymentSetup }
            });
            return NextResponse.json({ success: true, account: updated });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Super Admin Patch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
