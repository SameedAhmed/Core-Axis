import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PLAN_ENTITLEMENTS } from "@/lib/entitlements";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceName } = await req.json();
        if (!workspaceName) {
            return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
        }

        // 1. Fetch user and check if they are an Account Owner
        const user: any = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: { account: { include: { workspaces: true } } }
        });

        if (!user || !user.isAccountOwner || !user.account) {
            return NextResponse.json({ error: "Forbidden: Account Owner Only" }, { status: 403 });
        }

        // 2. Check Plan Threshold
        const account = user.account;
        const currentWorkspaceCount = account.workspaces.length;
        const planTier = account.planTier as keyof typeof PLAN_ENTITLEMENTS;
        const maxWorkspaces = PLAN_ENTITLEMENTS[planTier]?.maxWorkspaces || 1;

        if (currentWorkspaceCount >= maxWorkspaces) {
            return NextResponse.json({ 
                error: `Limit Reached. Your current '${account.planTier}' plan allows up to ${maxWorkspaces} workspaces.` 
            }, { status: 403 });
        }

        // 3. Create the Workspace
        const newWorkspace = await (prisma as any).workspace.create({
            data: {
                name: workspaceName,
                ownerId: user.id,
                accountId: account.id,
                members: {
                    create: {
                        userId: user.id,
                        role: "ADMIN"
                    }
                },
                // Add default stages for a new CRM workspace
                dealStages: [
                    { id: "lead", label: "New Lead", color: "#64748b" },
                    { id: "contacted", label: "Contacted", color: "#3b82f6" },
                    { id: "negotiation", label: "Negotiation", color: "#f59e0b" },
                    { id: "closed_won", label: "Sales Confirmed", color: "#1e3a8a" },
                    { id: "closed_lost", label: "Closed Lost", color: "#ef4444" }
                ] as any
            }
        });


        return NextResponse.json({ 
            success: true, 
            workspace: newWorkspace 
        });

    } catch (error) {
        console.error("Provisioning Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
