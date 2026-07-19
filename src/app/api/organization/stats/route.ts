import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PLAN_ENTITLEMENTS } from "@/lib/entitlements";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Identify if user is an Account Owner and get their Account
        const user = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: {
                account: {
                    include: {
                        workspaces: {
                            include: {
                                _count: {
                                    select: { members: true, leads: true, deals: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const isSaaSAdmin = session.user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");

        if (!user || (!user.isAccountOwner && !isSaaSAdmin)) {
             return NextResponse.json({ error: "Access Restricted: Account Owner or Super Admin Only." }, { status: 403 });
        }

        const account = user.account;
        if (!account) {
            return NextResponse.json({ error: "Account structure missing." }, { status: 404 });
        }

        // 2. Aggregate data
        const totalUsers = await prisma.user.count({
            where: { accountId: account.id }
        } as any);

        const entitlements = (PLAN_ENTITLEMENTS as any)[account.planTier] || PLAN_ENTITLEMENTS.FREE;

        return NextResponse.json({
            id: account.id,
            name: account.name,
            planTier: account.planTier,
            workspaces: account.workspaces,
            totalUsers,
            activeSeats: account.activeSeats || 0,
            maxSeats: entitlements.maxUsers
        });

    } catch (error) {
        console.error("Org Stats Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

