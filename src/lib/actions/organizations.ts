"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "./audit";
import { getVerifiedRecord, getEffectiveRole } from "@/lib/permissions";
import { touchWorkspace } from "./workspaces";

export async function createOrganization(data: {
    name: string;
    website?: string | null;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            throw new Error("Unauthorized");
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const newOrg = await prisma.organization.create({
            data: {
                name: data.name,
                website: data.website || null,
                ownerId: user.id,
                createdById: user.id,
                workspaceId: (user as any).activeWorkspaceId || null
            }
        });

        await createAuditLog({
            action: "CREATE",
            entityType: "ORGANIZATION",
            entityId: newOrg.id,
            details: `Created organization: ${newOrg.name}`
        });

        await touchWorkspace(newOrg.workspaceId);

        revalidatePath("/dashboard/organizations");
        return { success: true, data: newOrg };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

export async function updateOrganization(id: string, data: {
    name?: string;
    website?: string | null;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentOrg = await getVerifiedRecord(prisma.organization, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentOrg.ownerId !== user.id) {
            throw new Error("Reps can only edit organizations assigned to them.");
        }

        const updated = await prisma.organization.update({
            where: { id },
            data
        });

        await createAuditLog({
            action: "UPDATE",
            entityType: "ORGANIZATION",
            entityId: updated.id,
            details: `Updated organization: ${updated.name}`
        });

        await touchWorkspace(updated.workspaceId);

        revalidatePath("/dashboard/organizations");
        return { success: true, data: updated };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update organization" };
    }
}

export async function deleteOrganization(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentOrg = await getVerifiedRecord(prisma.organization, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentOrg.ownerId !== user.id) {
            throw new Error("Reps can only delete organizations assigned to them.");
        }

        const deleted = await prisma.organization.delete({
            where: { id }
        });

        await createAuditLog({
            action: "DELETE",
            entityType: "ORGANIZATION",
            entityId: id,
            details: `Deleted organization: ${deleted.name}`
        });

        await touchWorkspace(deleted.workspaceId);

        revalidatePath("/dashboard/organizations");
        return { success: true, data: deleted };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete organization" };
    }
}

export async function deleteOrganizations(ids: string[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        
        let validIds = ids;
        if (effectiveRole === "REP") {
            const orgsToDelete = await prisma.organization.findMany({
                where: { id: { in: ids }, createdById: user.id }
            });
            validIds = orgsToDelete.map(o => o.id);
            if (validIds.length === 0) throw new Error("No authorized organizations to delete.");
        }

        const deleted = await prisma.organization.deleteMany({
            where: { id: { in: validIds } }
        });

        await createAuditLog({
            action: "BULK_DELETE",
            entityType: "ORGANIZATION",
            details: `Deleted ${deleted.count} organizations`
        });

        const workspaceId = (user as any).activeWorkspaceId || null;
        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/organizations");
        return { success: true, count: deleted.count };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete organizations" };
    }
}

export async function importBulkOrganizations(orgs: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) throw new Error("User not found");

        const formatted = orgs.map(org => ({
            name: org.name || "Unknown Company",
            website: org.website || null,
            ownerId: user.id,
            createdById: user.id,
            workspaceId: (user as any).activeWorkspaceId || null
        }));

        const result = await prisma.organization.createMany({
            data: formatted,
            skipDuplicates: true
        });

        await createAuditLog({
            action: "BULK_IMPORT",
            entityType: "ORGANIZATION",
            details: `Imported ${result.count} organizations via CSV`
        });

        const workspaceId = (user as any).activeWorkspaceId || null;
        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/organizations");
        return { success: true, count: result.count };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to import organizations" };
    }
}
