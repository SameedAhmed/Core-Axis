"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { touchWorkspace } from "./workspaces";
import { isSuperAdmin } from "@/lib/permissions";

export async function createActivity(data: {
    type: string;
    notes: string;
    leadId?: string | null;
    dealId?: string | null;
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

        const newActivity = await prisma.activity.create({
            data: {
                type: data.type,
                notes: data.notes,
                leadId: data.leadId || null,
                dealId: data.dealId || null,
                userId: user.id,
                workspaceId: (user as any).activeWorkspaceId || null
            }
        });

        await touchWorkspace((user as any).activeWorkspaceId || null);

        // Revalidate multiple paths since activity can show up in different places
        revalidatePath("/dashboard/activities");
        revalidatePath("/dashboard/leads");
        revalidatePath("/dashboard/deals");

        return { success: true, data: newActivity };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

export async function getDealActivities(dealId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const master = await isSuperAdmin(user);
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";

        const activities = await prisma.activity.findMany({
            where: {
                dealId,
                ...(master ? {} : { user: { email: { not: superAdminEmail } } })
            },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: activities };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

export async function getLeadActivities(leadId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) throw new Error("User not found");

        const master = await isSuperAdmin(user);
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com";

        const activities = await prisma.activity.findMany({
            where: {
                leadId,
                ...(master ? {} : { user: { email: { not: superAdminEmail } } })
            },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: activities };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}
