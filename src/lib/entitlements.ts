export type PlanTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanEntitlements {
    maxLeads: number;
    maxPipelines: number;
    maxWorkspaces: number;
    maxUsers: number;
    canUseWorkflowAutomations: boolean;
    canUseEmailSequences: boolean;
    canUseCustomRoles: boolean;
    canUseDataExport: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanTier, PlanEntitlements> = {
    FREE: {
        maxLeads: 100,
        maxPipelines: 1,
        maxWorkspaces: 1,
        maxUsers: 2,
        canUseWorkflowAutomations: false,
        canUseEmailSequences: false,
        canUseCustomRoles: false,
        canUseDataExport: false,
    },
    STARTER: {
        maxLeads: 10000,
        maxPipelines: 1,
        maxWorkspaces: 3,
        maxUsers: 5,
        canUseWorkflowAutomations: false,
        canUseEmailSequences: false,
        canUseCustomRoles: false,
        canUseDataExport: true,
    },
    PRO: {
        maxLeads: 999999999, // Unlimited
        maxPipelines: 5,
        maxWorkspaces: 10,
        maxUsers: 20,
        canUseWorkflowAutomations: true,
        canUseEmailSequences: true,
        canUseCustomRoles: false,
        canUseDataExport: true,
    },
    ENTERPRISE: {
        maxLeads: 999999999, // Unlimited
        maxPipelines: 999,   // Unlimited
        maxWorkspaces: 999,  // Unlimited
        maxUsers: 10000,     // Effectively unlimited
        canUseWorkflowAutomations: true,
        canUseEmailSequences: true,
        canUseCustomRoles: true,
        canUseDataExport: true,
    }
};

/**
 * Helper strictly for client-side and pure rendering checks.
 * For true security, always verify against the database state on the server.
 */
export function getEntitlements(tier: PlanTier | null | undefined): PlanEntitlements {
    if (!tier) return PLAN_ENTITLEMENTS.FREE;
    return PLAN_ENTITLEMENTS[tier] || PLAN_ENTITLEMENTS.FREE;
}
