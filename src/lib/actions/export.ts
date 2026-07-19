"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Parser } from "json2csv";
import { Role } from "@/generated/prisma/client/client";

/**
 * Super Admin Export Action
 * Generates CSV data for Leads or Organizations
 * supports single workspace isolation or "all" workspaces
 */
export async function exportCrmData(type: "LEAD" | "ORGANIZATION" | "DEAL" | "ORDER" | "LOST_DEAL" | "CONTACT", workspaceId?: string | "all") {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user || user.role !== "ADMIN") {
            throw new Error("Forbidden: Only Super Admins can export bulk data.");
        }

        const where: any = {};
        if (workspaceId && workspaceId !== "all") {
            where.workspaceId = workspaceId;
        }

        let data: any[] = [];
        let fields: string[] = [];

        if (type === "LEAD") {
            data = await prisma.lead.findMany({
                where,
                include: {
                    owner: { select: { name: true, email: true } },
                    workspace: { select: { name: true } },
                    organization: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" }
            });

            // Format for CSV
            data = data.map(item => ({
                ID: item.id,
                FirstName: item.firstName,
                LastName: item.lastName,
                Email: item.email || "",
                Phone: item.phone || "",
                Location: item.location || "",
                Service: item.service || "",
                Quotation: item.quotation || 0,
                Remarks: item.remarks || "",
                Status: item.status,
                Owner: item.owner?.name || item.owner?.email,
                Workspace: item.workspace?.name || "Global",
                Organization: item.organization?.name || "",
                Source: item.source,
                CreatedAt: item.createdAt.toISOString(),
                UpdatedAt: item.updatedAt.toISOString()
            }));

            fields = ["ID", "FirstName", "LastName", "Email", "Phone", "Location", "Service", "Quotation", "Remarks", "Status", "Owner", "Workspace", "Organization", "Source", "CreatedAt", "UpdatedAt"];
        } else if (type === "ORGANIZATION") {
            data = await prisma.organization.findMany({
                where,
                include: {
                    owner: { select: { name: true, email: true } },
                    workspace: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" }
            });

            data = data.map(item => ({
                ID: item.id,
                Name: item.name,
                Website: item.website || "",
                Owner: item.owner?.name || item.owner?.email,
                Workspace: item.workspace?.name || "Global",
                CreatedAt: item.createdAt.toISOString(),
                UpdatedAt: item.updatedAt.toISOString()
            }));

            fields = ["ID", "Name", "Website", "Owner", "Workspace", "CreatedAt", "UpdatedAt"];
        } else if (type === "DEAL" || type === "ORDER" || type === "LOST_DEAL") {
            const dealWhere: any = { ...where };
            if (type === "ORDER") dealWhere.stage = "WON";
            if (type === "LOST_DEAL") dealWhere.stage = "LOST";

            data = await prisma.deal.findMany({
                where: dealWhere,
                include: {
                    owner: { select: { name: true, email: true } },
                    workspace: { select: { name: true } },
                    organization: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" }
            });

            data = data.map(item => ({
                ID: item.id,
                Title: item.title,
                Value: item.value,
                Stage: item.customStage || item.stage,
                Organization: item.organization?.name || "",
                Owner: item.owner?.name || item.owner?.email,
                Workspace: item.workspace?.name || "Global",
                CreatedAt: item.createdAt.toISOString(),
                UpdatedAt: item.updatedAt.toISOString()
            }));

            fields = ["ID", "Title", "Value", "Stage", "Organization", "Owner", "Workspace", "CreatedAt", "UpdatedAt"];
        } else if (type === "CONTACT") {
            data = await prisma.contact.findMany({
                where,
                include: {
                    owner: { select: { name: true, email: true } },
                    workspace: { select: { name: true } },
                    organization: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" }
            });

            data = data.map(item => ({
                ID: item.id,
                FirstName: item.firstName,
                LastName: item.lastName,
                Email: item.email || "",
                Phone: item.phone || "",
                Organization: item.organization?.name || "",
                Owner: item.owner?.name || item.owner?.email,
                Workspace: item.workspace?.name || "Global",
                CreatedAt: item.createdAt.toISOString(),
                UpdatedAt: item.updatedAt.toISOString()
            }));

            fields = ["ID", "FirstName", "LastName", "Email", "Phone", "Organization", "Owner", "Workspace", "CreatedAt", "UpdatedAt"];
        }

        if (data.length === 0) {
            return { success: true, csv: "", count: 0 };
        }

        const parser = new Parser({ fields });
        const csv = parser.parse(data);

        return { success: true, csv, count: data.length };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to export data" };
    }
}
