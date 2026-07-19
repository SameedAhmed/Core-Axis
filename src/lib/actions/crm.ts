"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";
import { revalidatePath } from "next/cache";
import { touchWorkspace } from "./workspaces";

const ENUM_STAGES = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export async function convertLeadToDeal(leadId: string) {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            throw new Error("Lead not found");
        }

        if (lead.status === "CONVERTED") {
            throw new Error("Lead is already converted");
        }

        // Look up the workspace's custom deal stages to find the FIRST stage
        let firstStageValue = "QUALIFICATION"; // fallback
        let firstStageCustom: string | null = null;

        if (lead.workspaceId) {
            const workspace = await prisma.workspace.findUnique({
                where: { id: lead.workspaceId },
                select: { dealStages: true }
            });

            const dealStages = workspace?.dealStages as Array<{ value: string; label: string; order?: number }> | null;

            if (dealStages && dealStages.length > 0) {
                // Sort by order if available, then take the first one
                const sorted = [...dealStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const first = sorted[0];

                if (ENUM_STAGES.includes(first.value)) {
                    firstStageValue = first.value;
                    firstStageCustom = null;
                } else {
                    // Custom stage — store in customStage field, use QUALIFICATION as base enum
                    firstStageValue = "QUALIFICATION";
                    firstStageCustom = first.value;
                }
            }
        }

        // --- PREVENT DUPLICATE CONTACTS (Phase 4 Fix) ---
        let existingContactId: string | null = null;
        if (lead.email || lead.phone) {
            const existingContact = await prisma.contact.findFirst({
                where: {
                    workspaceId: lead.workspaceId,
                    OR: [
                        ...(lead.email ? [{ email: lead.email }] : []),
                        ...(lead.phone ? [{ phone: lead.phone }] : [])
                    ]
                },
                orderBy: { createdAt: "desc" }
            });
            if (existingContact) {
                existingContactId = existingContact.id;
            }
        }

        // Execute in transaction to ensure consistency
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Mark Lead as CONVERTED
            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data: { status: "CONVERTED" },
            });

            // 2. Create Deal at the FIRST workspace stage (not hardcoded QUALIFICATION)
            const deal = await tx.deal.create({
                data: {
                    title: `Deal with ${lead.firstName} ${lead.lastName}`,
                    value: lead.quotation || 0,
                    stage: firstStageValue as any,
                    customStage: firstStageCustom,
                    ownerId: lead.ownerId,
                    organizationId: lead.organizationId,
                    workspaceId: lead.workspaceId,
                    createdById: lead.createdById,
                } as any,
            });

            // 3. Create OR Update Contact linked to the Deal
            let contact;
            if (existingContactId) {
                contact = await tx.contact.update({
                    where: { id: existingContactId },
                    data: {
                        dealId: deal.id,
                        firstName: lead.firstName, // Refresh data from latest lead info
                        lastName: lead.lastName,
                        email: lead.email,
                        phone: lead.phone
                    }
                });
            } else {
                contact = await tx.contact.create({
                    data: {
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        phone: lead.phone,
                        ownerId: lead.ownerId,
                        organizationId: lead.organizationId,
                        dealId: deal.id,
                        workspaceId: lead.workspaceId,
                    },
                });
            }

            return { deal, contact, updatedLead };
        });

        await touchWorkspace(lead.workspaceId);

        // Revalidate relevant pages
        revalidatePath("/dashboard/leads");
        revalidatePath("/dashboard/deals");
        revalidatePath("/dashboard/contacts");

        return { success: true, ...result };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}
