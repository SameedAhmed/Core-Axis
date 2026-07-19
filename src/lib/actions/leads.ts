"use server";

import { prisma } from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "./audit";
import { getVerifiedRecord, getEffectiveRole } from "@/lib/permissions";
import { touchWorkspace } from "./workspaces";
import { z } from "zod";
import { sendAssignmentNotification, sendLeadStatusNotification } from "@/lib/notifications";
import { getEntitlements, PlanTier } from "@/lib/entitlements";

const leadSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    location: z.string().optional().or(z.literal("")),
    service: z.string().optional().or(z.literal("")),
    quotation: z.preprocess((val) => {
        if (typeof val === "string" && val.trim() === "") return 0;
        return Number(val);
    }, z.number()).optional().default(0),
    remarks: z.string().optional().or(z.literal("")),
    status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"]),
    organizationId: z.string().optional().nullable(),
    notes: z.string().optional(),
    source: z.string().optional(),
    createdAt: z.string().optional()
});

export async function createLead(rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        const data = leadSchema.parse(rawData);

        // --- ENFORCE SUBSCRIPTION LIMITS (Phase 2) ---
        const workspaceId = (user as any).activeWorkspaceId || null;

        // --- ENFORCE SUBSCRIPTION LIMITS (Phase 2) ---
        if (workspaceId) {
            const workspace = await (prisma as any).workspace.findUnique({
                where: { id: workspaceId },
                include: { account: true }
            });
            const account = workspace?.account;
            const planTier = account?.planTier || "FREE";
            const entitlements = getEntitlements(planTier as PlanTier);
            
            const currentLeadCount = await prisma.lead.count({ where: { workspaceId } });
            
            if (currentLeadCount >= entitlements.maxLeads) {
                throw new Error(`SUBSCRIPTION_LIMIT: Your ${planTier} plan allows a maximum of ${entitlements.maxLeads} leads. Please upgrade your plan in Settings to continue growing.`);
            }
        }
        // ---------------------------------------------

        // --- DUPLICATE LEAD PREVENTION ---
        if (data.email || data.phone) {
            const existingLead = await prisma.lead.findFirst({
                where: {
                    workspaceId,
                    OR: [
                        data.email ? { email: data.email } : undefined,
                        data.phone ? { phone: data.phone } : undefined,
                    ].filter(Boolean) as any
                }
            });
            if (existingLead) {
                throw new Error(`A lead with this ${existingLead.email === data.email ? 'email' : 'phone number'} already exists in your workspace.`);
            }
        }
        // ---------------------------------

        let finalOrgId = data.organizationId || null;
        if (finalOrgId && finalOrgId !== "none") {
            const existingOrg = await prisma.organization.findUnique({
                where: { id: finalOrgId }
            });
            if (!existingOrg) {
                // Not found as a valid ID, assume it's a typed string from CreatableCombobox
                const newOrg = await prisma.organization.create({
                    data: {
                        name: finalOrgId,
                        ownerId: user.id,
                        createdById: user.id,
                        workspaceId
                    }
                });
                finalOrgId = newOrg.id;
            }
        } else if (finalOrgId === "none") {
            finalOrgId = null;
        }

        const finalOwnerId = user.id;

        const newLead = await prisma.lead.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || null,
                phone: data.phone || null,
                service: data.service || null,
                quotation: data.quotation || 0,
                remarks: data.remarks || null,
                location: data.location || null,
                status: data.status,
                organizationId: finalOrgId,
                ownerId: finalOwnerId,
                createdById: user.id,
                workspaceId,
                source: data.source || "MANUAL",
                ...(data.createdAt && { createdAt: new Date(data.createdAt) })
            }
        });

        if (data.notes && data.notes.trim() !== "") {
            await prisma.activity.create({
                data: {
                    type: "NOTE",
                    notes: data.notes,
                    leadId: newLead.id,
                    userId: user.id,
                    workspaceId: (user as any).activeWorkspaceId || null
                }
            });
        }

        await createAuditLog({
            action: "CREATE",
            entityType: "LEAD",
            entityId: newLead.id,
            details: `Created lead: ${newLead.firstName} ${newLead.lastName}`
        });

        // --- AUTO-CREATE CONTACT ---
        if (newLead.email || newLead.phone) {
            const existingContact = await prisma.contact.findFirst({
                where: {
                    workspaceId,
                    OR: [
                        newLead.email ? { email: newLead.email } : undefined,
                        newLead.phone ? { phone: newLead.phone } : undefined,
                    ].filter(Boolean) as any
                }
            });

            if (!existingContact) {
                await prisma.contact.create({
                    data: {
                        firstName: newLead.firstName,
                        lastName: newLead.lastName,
                        email: newLead.email,
                        phone: newLead.phone,
                        organizationId: newLead.organizationId,
                        ownerId: newLead.ownerId,
                        workspaceId
                    }
                });
            }
        }
        // ---------------------------

        // Note: Intentionally skipping initial assignment notification because the creator is the default owner

        // Trigger Workflows Asynchronously
        import("@/lib/workflow-engine").then(m => {
            m.executeWorkflows("LEAD_CREATED", workspaceId, newLead).catch(console.error);
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/leads");
        return { success: true, data: newLead };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to create lead" };
    }
}

export async function updateLead(id: string, rawData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentLead = await getVerifiedRecord(prisma.lead, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentLead.ownerId !== user.id) {
            throw new Error("Reps can only edit leads assigned to them.");
        }

        const data = leadSchema.partial().parse(rawData);

        // Handle new org creation from CreatableCombobox (same as createLead)
        let finalOrgId = data.organizationId !== undefined ? data.organizationId : undefined;
        if (finalOrgId && finalOrgId !== "none") {
            const existingOrg = await prisma.organization.findUnique({ where: { id: finalOrgId } });
            if (!existingOrg) {
                const newOrg = await prisma.organization.create({
                    data: {
                        name: finalOrgId,
                        ownerId: user.id,
                        createdById: user.id,
                        workspaceId: (user as any).activeWorkspaceId || null
                    }
                });
                finalOrgId = newOrg.id;
            }
        } else if (finalOrgId === "none") {
            finalOrgId = null as any;
        }

        const { createdAt, organizationId: _orgId, ...restData } = data;

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                ...restData,
                email: data.email || null,
                phone: data.phone || null,
                service: data.service || null,
                remarks: data.remarks || null,
                ...(finalOrgId !== undefined && { organizationId: finalOrgId }),
                ...(createdAt && { createdAt: new Date(createdAt) }),
            }
        });

        await createAuditLog({
            action: "UPDATE",
            entityType: "LEAD",
            entityId: updatedLead.id,
            details: `Updated lead: ${updatedLead.firstName} ${updatedLead.lastName}`
        });

        if (data.status && data.status !== currentLead.status) {
            // Trigger notifications asynchronously
            import("@/lib/notifications").then(m => {
                m.sendLeadStatusNotification(updatedLead, updatedLead.status, updatedLead.workspaceId || undefined).catch(console.error);
            });
            
            // Trigger Workflows Asynchronously
            import("@/lib/workflow-engine").then(m => {
                m.executeWorkflows("LEAD_STATUS_CHANGED", updatedLead.workspaceId, updatedLead).catch(console.error);
            });
        }

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/leads");
        return { success: true, data: updatedLead };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update lead" };
    }
}

export async function deleteLead(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentLead = await getVerifiedRecord(prisma.lead, id, user.id, effectiveRole, workspaceId);
        
        if (effectiveRole === "REP" && currentLead.ownerId !== user.id) {
            throw new Error("Reps can only delete leads assigned to them.");
        }

        const deletedLead = await prisma.lead.delete({
            where: { id }
        });

        await createAuditLog({
            action: "DELETE",
            entityType: "LEAD",
            entityId: id,
            details: `Deleted lead: ${deletedLead.firstName} ${deletedLead.lastName}`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/leads");
        return { success: true, data: deletedLead };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete lead" };
    }
}


export async function importBulkLeads(leads: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) throw new Error("User not found");

        // --- ENFORCE SUBSCRIPTION LIMITS (Phase 2) ---
        const workspaceId = (user as any).activeWorkspaceId || null;
        if (workspaceId) {
            const workspace = await (prisma as any).workspace.findUnique({
                where: { id: workspaceId },
                include: { account: true }
            });
            const account = workspace?.account;
            const planTier = account?.planTier || "FREE";
            const entitlements = getEntitlements(planTier as PlanTier);
            
            const currentLeadCount = await prisma.lead.count({ where: { workspaceId } });
            
            if (currentLeadCount + leads.length > entitlements.maxLeads) {
                throw new Error(`SUBSCRIPTION_LIMIT: Importing these ${leads.length} leads would exceed your ${planTier} plan limit of ${entitlements.maxLeads} total leads. Please upgrade to import massive lists.`);
            }
        }
        // ---------------------------------------------

        const formattedLeads = leads.map(lead => {
            let phoneStr = String(lead.phone || lead.Number || "").trim();
            if (phoneStr.toLowerCase().includes('e') && !isNaN(Number(phoneStr))) {
                phoneStr = Number(phoneStr).toLocaleString('fullwide', { useGrouping: false });
            }

            let qVal = lead.quotation || lead.Quotation || 0;
            if (typeof qVal === 'string') {
                qVal = parseFloat(qVal.replace(/[^0-9.]/g, '')) || 0;
            }

            let createdAtDate = new Date();
            const dateStr = lead.date || lead.Date || lead.createdAt || lead["Created At"] || lead["created at"];
            if (dateStr) {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                    createdAtDate = parsedDate;
                }
            }

            let resolvedSource = lead.source || lead.Source || lead.SOURCE || "IMPORT";
            if (typeof resolvedSource === 'string') {
                const upperSource = resolvedSource.toUpperCase().trim();
                if (upperSource === "META") resolvedSource = "META_ADS";
                else if (upperSource === "PPC") resolvedSource = "PPC";
                else if (upperSource === "SEO") resolvedSource = "SEO";
                else if (upperSource === "IMPORT") resolvedSource = "IMPORT";
                else if (upperSource === "MANUAL") resolvedSource = "MANUAL";
            }

            return {
                firstName: lead.firstName || lead["First Name"] || "Unknown",
                lastName: lead.lastName || lead["Last Name"] || "Unknown",
                email: lead.email || lead.Email || null,
                phone: phoneStr,
                location: lead.location || lead.Location || null,
                service: lead.service || lead.Service || null,
                quotation: qVal,
                remarks: lead.remarks || lead.Remarks || null,
                status: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"].includes(lead.status || lead.Status) ? (lead.status || lead.Status) : "NEW",
                ownerId: user.id,
                createdById: user.id,
                workspaceId: (user as any).activeWorkspaceId || null,
                source: resolvedSource,
                createdAt: createdAtDate
            };
        });

        const uniqueFormattedLeads = [];
        const seenCSVEmails = new Set();
        const seenCSVPhones = new Set();

        for (const lead of formattedLeads) {
            let isDuplicate = false;
            if (lead.email) {
                if (seenCSVEmails.has(lead.email)) isDuplicate = true;
                else seenCSVEmails.add(lead.email);
            }
            if (lead.phone) {
                if (seenCSVPhones.has(lead.phone)) isDuplicate = true;
                else seenCSVPhones.add(lead.phone);
            }
            if (!isDuplicate) uniqueFormattedLeads.push(lead);
        }

        const emailsToImport = uniqueFormattedLeads.map(l => l.email).filter(Boolean) as string[];
        const phonesToImport = uniqueFormattedLeads.map(l => l.phone).filter(Boolean) as string[];

        const existingLeads = await prisma.lead.findMany({
            where: {
                workspaceId,
                OR: [
                    emailsToImport.length > 0 ? { email: { in: emailsToImport } } : undefined,
                    phonesToImport.length > 0 ? { phone: { in: phonesToImport } } : undefined
                ].filter(Boolean) as any
            },
            select: { email: true, phone: true }
        });

        const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
        const existingPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean));

        const nonDuplicateLeads = uniqueFormattedLeads.filter(l => {
            if (l.email && existingEmails.has(l.email)) return false;
            if (l.phone && existingPhones.has(l.phone)) return false;
            return true;
        });

        if (nonDuplicateLeads.length === 0) {
             return { success: true, count: 0, duplicateCount: leads.length };
        }

        const result = await (prisma.lead as any).createManyAndReturn({
            data: nonDuplicateLeads,
            skipDuplicates: true
        });

        const createdCount = result.length;
        const duplicateCount = leads.length - createdCount;

        // --- TRIGGER WORKFLOWS FOR EACH IMPORTED LEAD & AUTO-CREATE CONTACTS ---
        if (createdCount > 0) {
            const { executeWorkflows } = await import("@/lib/workflow-engine");

            for (const newLead of result) {
                executeWorkflows("LEAD_CREATED", workspaceId, newLead).catch(console.error);
                // Intentionally skipping sendAssignmentNotification for bulk imports to avoid spamming the importer
            }

            const newEmails = result.map((l: any) => l.email).filter(Boolean) as string[];
            const newPhones = result.map((l: any) => l.phone).filter(Boolean) as string[];

            const existingContacts = await prisma.contact.findMany({
                where: {
                    workspaceId,
                    OR: [
                        newEmails.length > 0 ? { email: { in: newEmails } } : undefined,
                        newPhones.length > 0 ? { phone: { in: newPhones } } : undefined
                    ].filter(Boolean) as any
                },
                select: { email: true, phone: true }
            });

            const existingContactEmails = new Set(existingContacts.map(c => c.email).filter(Boolean));
            const existingContactPhones = new Set(existingContacts.map(c => c.phone).filter(Boolean));

            const contactsToCreate = result.filter((l: any) => {
                if (!l.email && !l.phone) return false;
                if (l.email && existingContactEmails.has(l.email)) return false;
                if (l.phone && existingContactPhones.has(l.phone)) return false;
                return true;
            }).map((l: any) => ({
                firstName: l.firstName,
                lastName: l.lastName,
                email: l.email,
                phone: l.phone,
                organizationId: l.organizationId,
                ownerId: l.ownerId,
                workspaceId: l.workspaceId
            }));

            if (contactsToCreate.length > 0) {
                await prisma.contact.createMany({
                    data: contactsToCreate,
                    skipDuplicates: true
                });
            }
        }

        await createAuditLog({
            action: "BULK_IMPORT",
            entityType: "LEAD",
            details: `Imported ${createdCount} leads via CSV (${duplicateCount} duplicates skipped)`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/leads");
        return { success: true, count: createdCount, duplicateCount };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to import leads" };
    }
}

export async function deleteLeads(ids: string[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");
        
        const effectiveRole = await getEffectiveRole(user);
        
        const workspaceId = (user as any).activeWorkspaceId || null;

        if (effectiveRole === "REP") {
            // First find which leads they are allowed to delete
            const leadsToDelete = await prisma.lead.findMany({
                where: { id: { in: ids }, createdById: user.id, workspaceId }
            });
            const validIds = leadsToDelete.map(l => l.id);
            if (validIds.length === 0) throw new Error("No authorized leads to delete.");
            ids = validIds;
        } else {
            // Check workspace boundaries for Admins/Managers
            const leadsToDelete = await prisma.lead.findMany({
                where: { id: { in: ids }, workspaceId }
            });
            const validIds = leadsToDelete.map(l => l.id);
            if (validIds.length === 0) throw new Error("No authorized leads to delete in this workspace.");
            ids = validIds;
        }

        // Delete activities first
        await prisma.activity.deleteMany({
            where: { leadId: { in: ids } }
        });

        const deleted = await prisma.lead.deleteMany({
            where: { id: { in: ids } }
        });

        await createAuditLog({
            action: "BULK_DELETE",
            entityType: "LEAD",
            details: `Deleted ${deleted.count} leads mapping to IDs: ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? "..." : ""}`
        });

        await touchWorkspace(workspaceId);

        revalidatePath("/dashboard/leads");
        return { success: true, count: deleted.count };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete leads" };
    }
}

export async function assignLead(leadId: string, assignedUserId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const effectiveRole = await getEffectiveRole(user);
        if (effectiveRole === "REP") throw new Error("Not authorized to assign leads. Only managers and admins can reassign.");

        const assignedUser = await prisma.user.findUnique({ where: { id: assignedUserId } });
        if (!assignedUser) throw new Error("Assigned user not found");

        const workspaceId = (user as any).activeWorkspaceId || null;
        const currentLead = await getVerifiedRecord(prisma.lead, leadId, user.id, effectiveRole, workspaceId);

        const updatedLead = await prisma.lead.update({
            where: { id: currentLead.id },
            data: { 
                ownerId: assignedUserId,
                isViewed: false // Reset highlight for the new owner
            }
        });

        await createAuditLog({
            action: "ASSIGN",
            entityType: "LEAD",
            entityId: leadId,
            details: `Assigned lead ${updatedLead.firstName} ${updatedLead.lastName} to ${assignedUser.name || assignedUser.email}`
        });

        // Trigger notification asynchronously
        import("@/lib/notifications").then(m => {
             m.sendAssignmentNotification(updatedLead, assignedUserId, updatedLead.workspaceId || undefined).catch(console.error);
        });

        await touchWorkspace(updatedLead.workspaceId);
        revalidatePath("/dashboard/leads");
        return { success: true, data: updatedLead };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to assign lead" };
    }
}

export async function getLeadFormSuggestions() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");
        
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const workspaceId = (user as any).activeWorkspaceId || null;
        
        // 1. Get from existing leads
        const activeServices = await prisma.lead.findMany({
            where: { workspaceId, service: { not: null } },
            select: { service: true },
            distinct: ['service']
        });
        
        const activeSources = await prisma.lead.findMany({
            where: { workspaceId, source: { not: "" } },
            select: { source: true },
            distinct: ['source']
        });

        // 2. Get from "master list" (pre-added suggestions)
        let masterInputs: any[] = [];
        if (workspaceId) {
             masterInputs = await (prisma as any).customInput.findMany({
                where: { workspaceId }
            });
        }

        const servicesSet = new Set(activeServices.map(s => s.service!).filter(Boolean));
        const sourcesSet = new Set(activeSources.map(s => s.source!).filter(Boolean));

        masterInputs.forEach(ci => {
            if (ci.type === "SERVICE") servicesSet.add(ci.name);
            else sourcesSet.add(ci.name);
        });

        return {
            success: true,
            data: {
                services: Array.from(servicesSet),
                sources: Array.from(sourcesSet)
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to fetch suggestions" };
    }
}
export async function markLeadAsViewed(leadId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const workspaceId = (user as any).activeWorkspaceId || null;

        // Use updateMany for safe scoped update without throwing standard 404s if it fails
        await prisma.lead.updateMany({
            where: { 
                id: leadId,
                workspaceId: workspaceId
                // For reps, we probably should restrict to ownerId, but workspace boundary prevents cross-tenant leaks.
            },
            data: { isViewed: true }
        });

        revalidatePath("/dashboard/leads");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to mark as viewed" };
    }
}
