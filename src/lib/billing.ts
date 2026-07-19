import { prisma } from "./prisma";

/**
 * Ensures a workspace respects its trial period or payment status.
 * Reverts to 'FREE' plan if trial is over, or blocks if Enterprise is unpaid.
 */
export async function enforceSubscriptionStatus(workspaceId: string) {
    if (!workspaceId) return null;

    try {
        const workspace = await (prisma as any).workspace.findUnique({
            where: { id: workspaceId },
            include: {
                account: true
            }
        });

        let account = workspace.account;

        // --- HEALING LOGIC: If a workspace from a previous version is missing its account ---
        if (!account) {
            console.log(`🔧 Healing Workspace [${workspaceId}]: Creating missing SubscriptionAccount...`);
            account = await (prisma as any).subscriptionAccount.create({
                data: {
                    name: workspace.name,
                    planTier: (workspace as any).planTier || "FREE",
                    ownerId: workspace.ownerId,
                    hasPaymentSetup: false
                }
            });

            // Link the workspace to the newly created account
            await (prisma as any).workspace.update({
                where: { id: workspaceId },
                data: { accountId: account.id }
            });
        }
        // -----------------------------------------------------------------------------------

        // 1. Check if they are on a trialable tier (STARTER or PRO)
        const isTrialingTier = account.planTier === "STARTER" || account.planTier === "PRO";
        
        if (isTrialingTier && !account.providerSubscriptionId) {
            // FIX: If they are on a trialable tier but NO trial date is set yet
            if (!account.trialEndsAt) {
                const trialDays = account.planTier === "STARTER" ? 14 : 7;
                const newTrialEnd = new Date();
                newTrialEnd.setDate(newTrialEnd.getDate() + trialDays);

                await (prisma as any).subscriptionAccount.update({
                    where: { id: account.id },
                    data: { trialEndsAt: newTrialEnd }
                });

                account.trialEndsAt = newTrialEnd;
            }

            // 2. Enforce Expiration Logic
            if (account.trialEndsAt) {
                const now = new Date();
                const trialEnd = new Date(account.trialEndsAt);

                if (now > trialEnd) {
                    // REVERT ACCOUNT TO FREE - This allows them to stay in the system but with restricted capacity
                    await (prisma as any).subscriptionAccount.update({
                        where: { id: account.id },
                        data: {
                            planTier: "FREE",
                            trialEndsAt: null // Clear the trial date
                        }
                    });
                    
                    // Return the workspace instead of null to prevent hard lockout
                    return workspace;
                }
            }
        }

        // 3. ENTERPRISE ENFORCEMENT: No payment = Warning state, not lockout
        if (account.planTier === "ENTERPRISE" && !account.hasPaymentSetup) {
            // We return the workspace so they can still reach the billing page
            return workspace;
        }

        return workspace;
    } catch (error) {
        console.error("[TrialLimits] Error checking limits:", error);
        return null;
    }
}

/**
 * Defines the Hard Limits for Each Tier
 */
export const TIER_LIMITS = {
    FREE: { users: 2, pipelines: 1, leads: 1000 },
    STARTER: { users: 5, pipelines: 1, leads: 10000 },
    PRO: { users: 20, pipelines: 5, leads: 1000000 },
    ENTERPRISE: { users: 10000, pipelines: 100, leads: 10000000 }
};

/**
 * Checks if an account has available seat capacity to add a new user.
 * Proactive check for user creation/invitation.
 */
export async function canAddUserToAccount(accountId: string) {
    if (!accountId) return { canAdd: false, reason: "Account ID missing" };

    const account = await (prisma as any).subscriptionAccount.findUnique({
        where: { id: accountId },
        include: { 
            users: true // This gets all users registered under this account context
        }
    });

    if (!account) return { canAdd: false, reason: "Account not found" };

    const limits = (TIER_LIMITS as any)[account.planTier] || TIER_LIMITS.FREE;
    const currentCount = account.users.length;

    if (currentCount >= limits.users) {
        return { 
            canAdd: false, 
            reason: `Seat Limit Reached. Your '${account.planTier}' plan allows up to ${limits.users} users across the organization.`,
            currentCount,
            maxCount: limits.users
        };
    }

    return { canAdd: true, currentCount, maxCount: limits.users };
}

/**
 * Checks if a workspace is currently over its capacity (Data Overflow).
 */
export async function checkWorkspaceCapacity(workspaceId: string) {
    const workspace = await (prisma as any).workspace.findUnique({
        where: { id: workspaceId },
        include: {
            account: {
                include: { users: true }
            }
        }
    });

    if (!workspace || !workspace.account) return { isOverCapacity: false };

    const account = workspace.account;
    const limits = (TIER_LIMITS as any)[account.planTier] || TIER_LIMITS.FREE;
    
    // Count real data: Users are now account-level!
    const userCount = account.users.length;
    const leadCount = await prisma.lead.count({ where: { workspaceId } });

    const isOverUsers = userCount > limits.users;
    const isOverLeads = leadCount > limits.leads;
    const isUnpaidEnterprise = account.planTier === "ENTERPRISE" && !account.hasPaymentSetup;

    return {
        isOverCapacity: isOverUsers || isOverLeads || isUnpaidEnterprise,
        reason: isUnpaidEnterprise ? "Payment Required" : isOverUsers ? "Seat limit exceeded" : isOverLeads ? "Lead storage full" : null,
        isUnpaidEnterprise,
        userCount,
        maxUsers: limits.users,
        leadCount,
        maxLeads: limits.leads,
        planTier: account.planTier,
        accountId: account.id
    };
}

/**
 * Returns trial-specific metadata for UI banners.
 */
export async function getTrialStatus(workspaceId: string) {
    if (!workspaceId) return null;

    const workspace = await (prisma as any).workspace.findUnique({
        where: { id: workspaceId },
        include: { account: true }
    });

    if (!workspace || !workspace.account) return null;

    const account = workspace.account;
    const isTrialing = (account.planTier === "STARTER" || account.planTier === "PRO") && account.trialEndsAt;

    if (!isTrialing) return null;

    const trialEnd = new Date(account.trialEndsAt as Date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        isActive: diffDays > 0,
        daysRemaining: Math.max(0, diffDays),
        planTier: account.planTier,
        expiresAt: account.trialEndsAt
    };
}

