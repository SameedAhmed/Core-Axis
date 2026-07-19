"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "./audit";

// Internal helper to verify session Workspace Admin
async function verifyWorkspaceAdmin(workspaceId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: user.id
            }
        }
    });

    if (!membership || membership.role !== "ADMIN") {
        throw new Error("Only Workspace Admins can manage custom fields.");
    }
    
    return user;
}

export async function getWorkspaceCustomFields(workspaceId: string) {
    try {
        await verifyWorkspaceAdmin(workspaceId);

        // 1. Fetch actual usage counts from Leads
        const servicesUsage = await prisma.lead.groupBy({
            by: ['service'],
            where: { OR: [{ workspaceId }, { workspaceId: null }] },
            _count: { service: true },
            orderBy: { service: 'asc' }
        });

        const sourcesUsage = await prisma.lead.groupBy({
            by: ['source'],
            where: { OR: [{ workspaceId }, { workspaceId: null }] },
            _count: { source: true },
            orderBy: { source: 'asc' }
        });

        // 2. Fetch "pre-added" inputs (the master list)
        const customInputs = await (prisma as any).customInput.findMany({
            where: { workspaceId }
        });

        // 3. Merge they together
        const allServices = new Map<string, number>();
        const allSources = new Map<string, number>();

        // Add from actual usage
        servicesUsage.forEach(s => { if(s.service) allServices.set(s.service, s._count.service); });
        sourcesUsage.forEach(s => { if(s.source) allSources.set(s.source, s._count.source); });

        // Add from master list (ensure they exist even if count is 0)
        customInputs.forEach((ci: any) => {
            if (ci.type === "SERVICE") {
                if (!allServices.has(ci.name)) allServices.set(ci.name, 0);
            } else {
                if (!allSources.has(ci.name)) allSources.set(ci.name, 0);
            }
        });

        return {
            success: true,
            data: {
                services: Array.from(allServices.entries()).map(([value, count]) => ({ value, count })).sort((a,b) => b.count - a.count || a.value.localeCompare(b.value)),
                sources: Array.from(allSources.entries()).map(([value, count]) => ({ value, count })).sort((a,b) => b.count - a.count || a.value.localeCompare(b.value))
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch custom fields." };
    }
}

export async function addCustomField(workspaceId: string, type: "service" | "source", value: string) {
    try {
        if (!value || value.trim() === "") throw new Error("Value cannot be empty.");
        const user = await verifyWorkspaceAdmin(workspaceId);

        // Save to master list
        await (prisma as any).customInput.upsert({
            where: {
                workspaceId_type_name: {
                    workspaceId,
                    type: type.toUpperCase(),
                    name: value.trim()
                }
            },
            update: {},
            create: {
                workspaceId,
                type: type.toUpperCase(),
                name: value.trim()
            }
        });

        await createAuditLog({
            action: "CREATE",
            entityType: type.toUpperCase(),
            details: `Admin ${user.email} pre-added custom ${type}: '${value}'`
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to add custom field." };
    }
}

export async function renameCustomField(workspaceId: string, type: "service" | "source", oldValue: string, newValue: string) {
    try {
        if (!newValue || newValue.trim() === "") throw new Error("New value cannot be empty.");
        const user = await verifyWorkspaceAdmin(workspaceId);

        let updatedCount = 0;
        
        // 1. Update master list first
        await (prisma as any).customInput.updateMany({
            where: { workspaceId, type: type.toUpperCase(), name: oldValue },
            data: { name: newValue.trim() }
        });

        // 2. Update historical records
        if (type === "service") {
            const result = await prisma.lead.updateMany({
                where: { OR: [{ workspaceId }, { workspaceId: null }], service: oldValue },
                data: { service: newValue }
            });
            updatedCount = result.count;
        } else if (type === "source") {
            const result = await prisma.lead.updateMany({
                where: { OR: [{ workspaceId }, { workspaceId: null }], source: oldValue },
                data: { source: newValue }
            });
            updatedCount = result.count;
        }

        await createAuditLog({
            action: "UPDATE",
            entityType: type.toUpperCase(),
            details: `Admin ${user.email} renamed '${oldValue}' to '${newValue}' affecting ${updatedCount} records.`
        });

        return { success: true, count: updatedCount };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to rename custom field." };
    }
}

export async function deleteCustomField(workspaceId: string, type: "service" | "source", value: string) {
    try {
        const user = await verifyWorkspaceAdmin(workspaceId);
        let updatedCount = 0;
        
        // 1. Remove from master list
        await (prisma as any).customInput.deleteMany({
            where: { workspaceId, type: type.toUpperCase(), name: value }
        });

        if (type === "service") {
            const result = await prisma.lead.updateMany({
                where: { OR: [{ workspaceId }, { workspaceId: null }], service: value },
                data: { service: null }
            });
            updatedCount = result.count;
        } else if (type === "source") {
            const result = await prisma.lead.updateMany({
                where: { OR: [{ workspaceId }, { workspaceId: null }], source: value },
                data: { source: "MANUAL" }
            });
            updatedCount = result.count;
        }

        await createAuditLog({
            action: "DELETE",
            entityType: type.toUpperCase(),
            details: `Admin ${user.email} deleted Custom ${type === 'service' ? 'Service' : 'Source'} '${value}'. ${updatedCount} leads reverted to default/null.`
        });

        return { success: true, count: updatedCount };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete custom field." };
    }
}
