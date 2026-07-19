import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role, Lead } from "@/generated/prisma/client/client";
import { prisma } from "@/lib/prisma";

export async function getUserSession() {
    return await getServerSession(authOptions);
}

export async function requireAuth() {
    const session = await getUserSession();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }
    return session.user;
}

export async function requireRole(allowedRoles: Role[]) {
    const user = await requireAuth() as any;
    if (!allowedRoles.includes(user.role as Role)) {
        throw new Error("Forbidden: Insufficient permissions");
    }
    return user;
}

/**
 * Checks if the current user is the Global Super Admin (Platform Creator).
 */
export async function isSuperAdmin(user?: any) {
    if (!user) {
        const session = await getUserSession();
        if (!session?.user?.email) return false;
        
        // Final Truth: Check email against ENV and ensuring they are a system ADMIN
        return session.user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
    }
    
    return user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com");
}

export function hasPermission(userRole: string | undefined | null, allowedRoles: string[]) {
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
}

/**
 * Checks if a user has permission to access/modify a specific record.
 * Admins and Managers can access everything.
 * Reps can only access their own records.
 */
export async function canAccessRecord(user: { id: string, role: string }, record: { ownerId: string }) {
    if (!user || !record) return false;
    if (user.role === "ADMIN" || user.role === "MANAGER") return true;
    return record.ownerId === user.id;
}

/**
 * Helper to fetch any record and verify access in one go
 */
export async function getVerifiedRecord(model: any, recordId: string, userId: string, userRole: string, activeWorkspaceId?: string | null) {
    const where: any = { id: recordId };
    if (activeWorkspaceId) {
        where.workspaceId = activeWorkspaceId;
    }

    const record = await model.findUnique({ where });
    if (!record) throw new Error("Record not found or access denied in this workspace");

    // Authorization logic: Admins/Managers see all in workspace. Reps see ONLY what they own.
    if (userRole !== "ADMIN" && userRole !== "MANAGER" && record.ownerId !== userId) {
        throw new Error("Forbidden: You do not have permission to modify this record");
    }

    return record;
}


// Scoping helpers for database queries
export function getScopeWhere(userRole: string | undefined, userId: string, activeWorkspaceId?: string | null, userIdField: string = "ownerId") {
    const scope: any = {};
    if (activeWorkspaceId) {
        scope.workspaceId = activeWorkspaceId;
    }

    if (userRole === "ADMIN" || userRole === "MANAGER") {
        return scope;
    }

    // Reps strictly see leads assigned to them (Current Owner model)
    scope[userIdField] = userId;
    return scope;
}

/**
 * Fetches the user's role for their active workspace.
 * Falls back to the user's global role if no workspace-specific role is found.
 */
export async function getEffectiveRole(user: any) {
    if (!user?.id) return "REP";

    // Super Admin is always ADMIN regardless of specific workspace membership context
    if (user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) return "ADMIN";

    const activeWorkspaceId = user.activeWorkspaceId;
    if (!activeWorkspaceId) return user.role;

    const membership = await (prisma as any).workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: activeWorkspaceId,
                userId: user.id
            }
        }
    });

    return membership?.role || user.role;
}

/**
 * Enterprise PBAC Capability Engine (Phase 3)
 * Seamlessly merges Custom Roles with the legacy RBAC system.
 */
export async function hasCapability(user: any, action: string, resource?: { ownerId?: string, createdById?: string }) {
    if (!user?.id) return false;

    const activeWorkspaceId = user.activeWorkspaceId;
    if (!activeWorkspaceId) {
        return user.role === "ADMIN" || user.role === "MANAGER"; // Global fail-safe
    }

    // Explicit any cast to bypass Next.js Dev Server Prisma Client caching delays
    const membership = await (prisma as any).workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: activeWorkspaceId, userId: user.id } },
        include: { customRole: true }
    });

    if (!membership) return false;

    // 1. Core RBAC Overrides (Admins can do everything)
    if (membership.role === "ADMIN") return true; 

    // 2. Advanced PBAC (Enterprise Custom Roles)
    if (membership.customRole) {
        const perms: string[] = membership.customRole.permissions || [];
        
        // Literal capability match
        if (perms.includes(action)) return true;
        
        // Elevated context matches
        if (perms.includes(`${action}:all`)) return true;
        
        if (perms.includes(`${action}:own`) && resource) {
            if (resource.ownerId === user.id || resource.createdById === user.id) return true;
        }

        return false; // Strict custom roles deny by default if not granted
    }

    // 3. Fallback Legacy REP Logic (For Workspaces without Custom Roles)
    // Ensures existing Reps don't break, mapping naturally to our new system!
    if (membership.role === "REP" && resource) {
         if (resource.ownerId === user.id || resource.createdById === user.id) return true;
    }
    
    if (membership.role === "MANAGER") {
        // Managers historically have global read/write except system deletes
        if (action.includes("delete") && !action.includes("lead")) return false; 
        return true;
    }

    return false;
}


export async function getDefaultLeadOwner(source?: string, workspaceId?: string | null) {
    // 1. Check dynamic automation rules first (Workflow Builder priority)
    if (source && workspaceId) {
        const rules = await (prisma as any).automationRule.findMany({
            where: {
                isActive: true,
                trigger: "LEAD_CREATED",
                workspaceId
            }
        });

        for (const rule of rules) {
            const conditionSource = rule.conditions?.source;
            if (conditionSource && source.toUpperCase().includes((conditionSource as string).toUpperCase())) {
                const assignedUser = await prisma.user.findUnique({
                    where: { id: rule.actionValue }
                });
                if (assignedUser) return assignedUser;
            }
        }
    }

    // 2. Global Super Admin fallback (for all other sources)
    let fallback = await prisma.user.findFirst({
        where: { 
            role: "ADMIN",
            ...(workspaceId ? {
                workspaceMemberships: {
                    some: { workspaceId }
                }
            } : {})
        }
    });

    // 3. Last resort: Any user in the workspace
    if (!fallback && workspaceId) {
        fallback = await prisma.user.findFirst({
            where: {
                workspaceMemberships: {
                    some: { workspaceId }
                }
            }
        });
    }

    if (!fallback) throw new Error("No CRM user found in this workspace for lead assignment.");
    return fallback;
}
