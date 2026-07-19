"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function upgradeToTrialSafe(workspaceId: string, targetPlan: "STARTER" | "PRO") {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return { success: false, error: "Unauthorized access." };
        }

        const userId = (session.user as any).id;
        
        // Ensure user is Account Owner
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { account: true }
        });

        if (!user || !user.isAccountOwner || !user.accountId) {
            return { success: false, error: "Only the primary Account Owner can initiate trials." };
        }

        const account = user.account;
        
        if (!account) {
            return { success: false, error: "Subscription account not found." };
        }

        // Only allow trials if currently on FREE. 
        if (account.planTier !== "FREE") {
            return { success: false, error: "Trials are only available when upgrading from the Free plan. Please contact sales to upgrade your current active subscription." };
        }

        // Set trial End Date based on the requested plan
        const trialDays = targetPlan === "STARTER" ? 14 : 30;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        // Perform the upgrade
        await prisma.subscriptionAccount.update({
            where: { id: account.id },
            data: {
                planTier: targetPlan,
                trialEndsAt: trialEndsAt,
                paymentProvider: "MANUAL", // Force manual payment default since stripe is blocked
            }
        });

        // Add an audit log
        await prisma.auditLog.create({
            data: {
                action: "ACTIVATE_TRIAL",
                entityType: "SUBSCRIPTION",
                entityId: account.id,
                details: `${targetPlan} Trial Activated (${trialDays} Days)`,
                workspaceId: workspaceId,
                userId: userId,
            }
        });

        return { success: true, message: `Successfully activated ${trialDays}-Day ${targetPlan} Trial!` };

    } catch (error: any) {
        console.error("Trial activation error:", error);
        return { success: false, error: "An unexpected error occurred processing your trial request." };
    }
}
