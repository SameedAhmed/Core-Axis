"use server";

import { prisma } from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DealStage } from "@/generated/prisma/client/client";
import { createAuditLog } from "./audit";
import { getVerifiedRecord, getEffectiveRole } from "@/lib/permissions";
import { touchWorkspace } from "./workspaces";
import { z } from "zod";

import { sendDealStageNotification } from "@/lib/notifications";

const dealSchema = z.object({
    title: z.string().min(1, "Title is required"),
    value: z.number().min(0, "Value must be positive"),
    stage: z.string().optional(),
    organizationId: z.string().optional().nullable(),
    notes: z.string().optional()
});

export async function createDeal(rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        const data = dealSchema.parse(rawData);

        // --- ENFORCE SUBSCRIPTION LIMITS (Phase 4 Capacity Check) ---
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (workspaceId) {
            const { checkWorkspaceCapacity } = await import("@/lib/billing");
            const capacity = await checkWorkspaceCapacity(workspaceId);
            if (capacity.isOverCapacity) {
                throw new Error(`SUBSCRIPTION_LIMIT: Your workspace is currently over capacity (${capacity.reason}). Please upgrade your plan to add more records.`);
            }
        }
        // ---------------------------------------------

        const isEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(data.stage || "");

        const newDeal = await prisma.deal.create({
            data: {
                title: data.title,
                value: data.value,
                stage: isEnum ? data.stage as DealStage : "QUALIFICATION",
                customStage: isEnum ? null : (data.stage || "QUALIFICATION"),
                organizationId: data.organizationId || null,
                ownerId: user.id,
                createdById: user.id,
                workspaceId: (user as any).activeWorkspaceId || null
            } as any
        });

        if (data.notes && data.notes.trim() !== "") {
            await prisma.activity.create({
                data: {
                    type: "NOTE",
                    notes: data.notes,
                    dealId: newDeal.id,
                    userId: user.id,
                    workspaceId: (user as any).activeWorkspaceId || null
                }
            });
        }

        await createAuditLog({
            action: "CREATE",
            entityType: "DEAL",
            entityId: newDeal.id,
            details: `Created deal: ${newDeal.title}`
        });

        // Notify Admins and Managers of new deal creation (Async)
        import("@/lib/notifications").then(m => {
            m.sendDealStageNotification(newDeal, newDeal.stage as string, workspaceId || undefined).catch(console.error);
        });

        // Trigger Workflows Asynchronously
        import("@/lib/workflow-engine").then(m => {
            m.executeWorkflows("DEAL_CREATED", (user as any).activeWorkspaceId || null, newDeal).catch(console.error);
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true, data: newDeal };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create deal" };
    }
}

export async function updateDealStage(id: string, newStage: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        // SECURITY: Verify user has permission to update THIS specific deal
        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentDeal = await getVerifiedRecord(prisma.deal, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentDeal.ownerId !== user.id) {
            throw new Error("Reps can only edit deals assigned to them.");
        }

        const isEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(newStage);
        const updatedDeal = await prisma.deal.update({
            where: { id },
            data: {
                ...(isEnum 
                    ? { stage: newStage as DealStage, customStage: null }
                    : { stage: "QUALIFICATION", customStage: newStage })
            } as any
        });

        await createAuditLog({
            action: "UPDATE_STAGE",
            entityType: "DEAL",
            entityId: id,
            details: `Updated deal stage to ${newStage}`
        });

        // Notification (Async)
        import("@/lib/notifications").then(m => {
            m.sendDealStageNotification(updatedDeal, newStage, updatedDeal.workspaceId || undefined).catch(console.error);
        });

        if (newStage === "WON" || newStage === "LOST") {
            import("@/lib/workflow-engine").then(m => {
                m.executeWorkflows(newStage === "WON" ? "DEAL_WON" : "LEAD_STATUS_CHANGED", updatedDeal.workspaceId, updatedDeal).catch(console.error);
            });
        }

        await touchWorkspace(updatedDeal.workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true, data: updatedDeal };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update deal" };
    }
}

export async function updateDealValue(id: string, newValue: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentDeal = await getVerifiedRecord(prisma.deal, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentDeal.ownerId !== user.id) {
            throw new Error("Reps can only update the value of deals assigned to them.");
        }

        if (newValue < 0) throw new Error("Value must be positive");

        const updatedDeal = await prisma.deal.update({
            where: { id },
            data: { value: newValue }
        });

        await createAuditLog({
            action: "UPDATE",
            entityType: "DEAL",
            entityId: id,
            details: `Updated deal value to $${newValue}`
        });

        await touchWorkspace(updatedDeal.workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true, data: updatedDeal };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update deal value" };
    }
}

export async function updateDeal(id: string, rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentDeal = await getVerifiedRecord(prisma.deal, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentDeal.ownerId !== user.id) {
            throw new Error("Reps can only edit deals assigned to them.");
        }

        const data = dealSchema.parse(rawData);

        const isEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(data.stage || "");

        const updatedDeal = await prisma.deal.update({
            where: { id },
            data: {
                title: data.title,
                value: data.value,
                stage: isEnum ? data.stage as DealStage : "QUALIFICATION",
                customStage: isEnum ? null : (data.stage || null),
                organizationId: data.organizationId || null,
            } as any
        });

        await createAuditLog({
            action: "UPDATE",
            entityType: "DEAL",
            entityId: id,
            details: `Updated deal: ${updatedDeal.title}`
        });

        await touchWorkspace(updatedDeal.workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true, data: updatedDeal };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to edit deal" };
    }
}

export async function deleteDeal(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole !== "ADMIN") {
            throw new Error("Only Admins can delete deals.");
        }

        // Delete associated activities first
        await prisma.activity.deleteMany({
            where: { dealId: id }
        });

        const deletedDeal = await prisma.deal.delete({
            where: { id }
        });

        await createAuditLog({
            action: "DELETE",
            entityType: "DEAL",
            entityId: id,
            details: `Deleted deal: ${deletedDeal.title}`
        });

        const workspaceId = (user as any).activeWorkspaceId || null;
        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete deal" };
    }
}

export async function updateWorkspaceDealStages(stages: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole !== "ADMIN") throw new Error("Only admins can modify workspace stages.");
        
        const workspaceId = (user as any).activeWorkspaceId;
        if (!workspaceId) throw new Error("No active workspace");
        
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { dealStages: stages } as any
        });
        
        await touchWorkspace(workspaceId);
        revalidatePath("/dashboard/deals");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update workspace stages" };
    }
}

export async function renameDealStage(oldStage: string, newStage: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole !== "ADMIN") throw new Error("Only admins can rename workspace stages.");
        
        const workspaceId = (user as any).activeWorkspaceId;
        if (!workspaceId) throw new Error("No active workspace");

        const isOldEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(oldStage);
        const isNewEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(newStage);

        await prisma.deal.updateMany({
            where: { 
                workspaceId,
                OR: [
                    { customStage: oldStage },
                    ...(isOldEnum ? [{ stage: oldStage as DealStage, customStage: null }] : [])
                ]
            } as any,
            data: (isNewEnum 
               ? { stage: newStage as DealStage, customStage: null }
               : { stage: "QUALIFICATION", customStage: newStage }) as any
        });
        
        await touchWorkspace(workspaceId);
        revalidatePath("/dashboard/deals");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to rename deal stage" };
    }
}

export async function deleteDealStage(stageToDelete: string, fallbackStage: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole !== "ADMIN") throw new Error("Only admins can delete workspace stages.");
        
        const workspaceId = (user as any).activeWorkspaceId;
        if (!workspaceId) throw new Error("No active workspace");

        const isOldEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(stageToDelete);
        const isFallbackEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(fallbackStage);

        await prisma.deal.updateMany({
            where: { 
                workspaceId,
                OR: [
                    { customStage: stageToDelete },
                    ...(isOldEnum ? [{ stage: stageToDelete as DealStage, customStage: null }] : [])
                ]
            } as any,
            data: (isFallbackEnum 
               ? { stage: fallbackStage as DealStage, customStage: null }
               : { stage: "QUALIFICATION", customStage: fallbackStage }) as any
        });

        await touchWorkspace(workspaceId);
        revalidatePath("/dashboard/deals");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete deal stage" };
    }
}

export async function importBulkDeals(deals: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const workspaceId = (user as any).activeWorkspaceId || null;

        const formattedDeals = deals.map(deal => {
            const val = parseFloat(String(deal.value || deal.Value || 0).replace(/[^0-9.]/g, '')) || 0;
            
            const rawStage = (deal.stage || deal.Stage || "QUALIFICATION").toUpperCase().trim();
            const isEnum = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].includes(rawStage);

            return {
                title: deal.title || deal.Title || "Untitled Deal",
                value: val,
                stage: isEnum ? (rawStage as DealStage) : "QUALIFICATION",
                customStage: isEnum ? null : (deal.stage || deal.Stage || null),
                ownerId: user.id,
                createdById: user.id,
                workspaceId,
                createdAt: deal.createdAt || deal.CreatedAt ? new Date(deal.createdAt || deal.CreatedAt) : new Date(),
                updatedAt: new Date()
            };
        });

        const result = await (prisma.deal as any).createManyAndReturn({
            data: formattedDeals,
            skipDuplicates: true
        });

        const createdCount = result.length;

        // Trigger Workflows/Notifications for each imported deal
        if (createdCount > 0) {
            const { executeWorkflows } = await import("@/lib/workflow-engine");
            const { sendDealStageNotification } = await import("@/lib/notifications");

            for (const deal of result) {
                 executeWorkflows("DEAL_CREATED", workspaceId, deal).catch(console.error);
                 sendDealStageNotification(deal, deal.stage as string, workspaceId || undefined).catch(console.error);
            }
        }

        await createAuditLog({
            action: "BULK_IMPORT",
            entityType: "DEAL",
            details: `Imported ${createdCount} deals via CSV`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/deals");
        return { success: true, count: createdCount };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to import deals" };
    }
}
