"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getEntitlements, PlanTier } from "@/lib/entitlements";

/**
 * Updates the lastActivityAt timestamp for a workspace.
 * This triggers the internal real-time sync for all connected users.
 */
export async function touchWorkspace(workspaceId: string | null | undefined) {
    if (!workspaceId) return;
    try {
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { updatedAt: new Date() }
        });
    } catch (e) {
        console.error("Failed to touch workspace:", e);
    }
}

export async function createWorkspace(name: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await (prisma as any).user.findUnique({
            where: { email: session.user.email },
            include: { 
                workspaceMemberships: true,
                account: { include: { workspaces: true } }
            }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const isGlobalAdmin = user.role === "ADMIN";
        const isWorkspaceAdmin = user.workspaceMemberships?.some((m: any) => m.role === "ADMIN");

        if (!isGlobalAdmin && !isWorkspaceAdmin) {
            throw new Error("Only admins can create workspaces.");
        }

        // --- ENFORCE SUBSCRIPTION LIMITS (Phase 4) ---
        const account = (user as any).account;
        if (!account) {
            throw new Error("Organization Error: No associated billing account found. Please contact support.");
        }

        const entitlements = getEntitlements(account.planTier as PlanTier);
        const currentWorkspaceCount = account.workspaces.length;

        if (currentWorkspaceCount >= entitlements.maxWorkspaces) {
            throw new Error(`SUBSCRIPTION_LIMIT: Your ${account.planTier} plan allows a maximum of ${entitlements.maxWorkspaces} workspace(s). Please upgrade your plan in Settings to create more.`);
        }
        // ---------------------------------------------

        const workspace = await prisma.workspace.create({
            data: {
                name,
                ownerId: user.id,
                accountId: account.id // Critical Phase 4 Link!
            }
        });

        // Add the creator as an ADMIN member of the new workspace
        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: user.id,
                role: "ADMIN"
            }
        });

        // If the user doesn't have an active workspace, set it to this one
        if (!user.activeWorkspaceId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { activeWorkspaceId: workspace.id }
            });
        }

        revalidatePath("/dashboard/settings");
        return { success: true, data: workspace };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getWorkspaces() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return [];

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return [];

        let workspaces = await (prisma as any).workspace.findMany({
            where: user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com") ? {} : {
                members: {
                    some: {
                        userId: user.id
                    }
                }
            },
            include: {
                account: true,
                automationRules: true,
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });


        // Map userRole for each workspace to simplify UI filtering
        workspaces = workspaces.map((ws: any) => {
            const membership = ws.members.find((m: any) => m.userId === user.id);
            if (user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) {
                ws.userRole = "ADMIN";
            } else {
                ws.userRole = membership?.role || "REP";
            }
            return ws;
        });

        return workspaces;
    } catch {
        return [];
    }
}

export async function switchWorkspace(workspaceId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) throw new Error("User not found");

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: user.id
                }
            }
        });

        if (!membership && user.role !== "ADMIN") {
            throw new Error("You do not have access to this workspace.");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { activeWorkspaceId: workspaceId }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignUserToWorkspace(workspaceId: string, email: string, role: "ADMIN" | "MANAGER" | "REP", customRoleId?: string | null) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const adminUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!adminUser) throw new Error("Unauthorized");

        const adminMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: adminUser.id }
            }
        });

        if (!adminMembership || adminMembership.role !== "ADMIN") {
            throw new Error("Only workspace admins can assign users to this workspace.");
        }

        const targetUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!targetUser) {
            throw new Error("User with this email not found. Please invite them to the CRM first.");
        }

        const membership = await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: targetUser.id
                }
            },
            update: {
                role,
                customRoleId: customRoleId === "none" ? null : customRoleId
            } as any,
            create: {
                workspaceId,
                userId: targetUser.id,
                role,
                customRoleId: customRoleId === "none" ? null : customRoleId
            } as any
        });

        // Ensure user's active workspace is set if they don't have one
        if (!targetUser.activeWorkspaceId) {
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { activeWorkspaceId: workspaceId }
            });
        }

        revalidatePath("/dashboard/settings");
        return { success: true, data: membership };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removeUserFromWorkspace(workspaceId: string, userId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const adminUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!adminUser) throw new Error("Unauthorized");

        const adminMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: adminUser.id }
            }
        });

        if (!adminMembership || adminMembership.role !== "ADMIN") {
            throw new Error("Only workspace admins can manage workspace members.");
        }

        const w = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (w?.ownerId === userId) {
            throw new Error("Cannot remove the owner of the workspace.");
        }

        await prisma.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId
                }
            }
        });

        // If the user had this as active workspace, clear it
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (targetUser?.activeWorkspaceId === workspaceId) {
            // Find another workspace they are part of
            const otherMembership = await prisma.workspaceMember.findFirst({
                where: { userId }
            });
            await prisma.user.update({
                where: { id: userId },
                data: { activeWorkspaceId: otherMembership?.workspaceId || null }
            });
        }

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateWorkspace(workspaceId: string, newName: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const isGlobalAdmin = user.role === "ADMIN";
        
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: user.id }
            }
        });

        if (!isGlobalAdmin && (!membership || membership.role !== "ADMIN")) {
            throw new Error("Only admins can update workspace settings.");
        }

        if (!newName.trim()) throw new Error("Workspace name cannot be empty.");

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { name: newName }
        });

        revalidatePath("/dashboard/settings");
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteWorkspace(workspaceId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const isGlobalAdmin = user.role === "ADMIN";
        
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: user.id }
            }
        });

        if (!isGlobalAdmin && (!membership || membership.role !== "ADMIN")) {
            throw new Error("Only admins can delete a workspace.");
        }

        // Must manually drop relational data lacking Cascade before dropping workspace
        await prisma.$transaction(async (tx) => {
            // Delete activities, audits, integrations, notifications, contacts, deals, leads, organizations
            // Super Admin can delete anything
            if (user.email === (process.env.SUPER_ADMIN_EMAIL || "admin@crm.com")) {
                await tx.activity.deleteMany({ where: { workspaceId }});
                await tx.auditLog.deleteMany({ where: { workspaceId }});
                await tx.integration.deleteMany({ where: { workspaceId }});
                await tx.notification.deleteMany({ where: { workspaceId }});
                await tx.contact.deleteMany({ where: { workspaceId }});
                await tx.deal.deleteMany({ where: { workspaceId }});
                await tx.lead.deleteMany({ where: { workspaceId }});
                await tx.organization.deleteMany({ where: { workspaceId }});
            }
            
            // WorkspaceMember has Cascade, but we can do it explicitly anyway to be safe
            await tx.workspaceMember.deleteMany({ where: { workspaceId }});
            
            // Delete the workspace definition
            await tx.workspace.delete({ where: { id: workspaceId } });
        });

        // Reset user's active workspace if it was the one deleted
        const affectedUsers = await prisma.user.findMany({
            where: { activeWorkspaceId: workspaceId }
        });
        
        if (affectedUsers.length > 0) {
            for (const u of affectedUsers) {
                const altMembership = await prisma.workspaceMember.findFirst({
                    where: { userId: u.id, workspaceId: { not: workspaceId } }
                });
                await prisma.user.update({
                    where: { id: u.id },
                    data: { activeWorkspaceId: altMembership ? altMembership.workspaceId : null }
                });
            }
        }

        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
