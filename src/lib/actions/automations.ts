"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function verifyWorkspaceAdmin(workspaceId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");

    if (user.role === "ADMIN") return user; // Global Super Admin

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: user.id
            }
        }
    });

    if (!membership || (membership.role !== "ADMIN" && membership.role !== "MANAGER")) {
        throw new Error("Forbidden: You do not have admin rights for this workspace");
    }

    return user;
}

export async function getAutomations(workspaceId: string) {
    try {
        await verifyWorkspaceAdmin(workspaceId);

        const rules = await (prisma as any).automationRule.findMany({
            where: {
                workspaceId: workspaceId
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, rules };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createAutomation(data: {
    name: string;
    trigger: string;
    conditions: any;
    action: string;
    actionValue: string;
    workspaceId: string;
}) {
    try {
        await verifyWorkspaceAdmin(data.workspaceId);

        const rule = await (prisma as any).automationRule.create({
            data: {
                name: data.name,
                trigger: data.trigger,
                conditions: data.conditions,
                action: data.action,
                actionValue: data.actionValue,
                workspaceId: data.workspaceId,
                isActive: true
            }
        });

        revalidatePath("/(dashboard)/settings", "page");
        return { success: true, rule };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAutomation(id: string) {
    try {
        // Find automation first to extract its workspaceId
        const rule = await (prisma as any).automationRule.findUnique({ where: { id } });
        if (!rule) throw new Error("Automation not found");

        await verifyWorkspaceAdmin(rule.workspaceId);

        await (prisma as any).automationRule.delete({
            where: { id }
        });

        revalidatePath("/(dashboard)/settings", "page");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleAutomation(id: string, isActive: boolean) {
    try {
        const rule = await (prisma as any).automationRule.findUnique({ where: { id } });
        if (!rule) throw new Error("Automation not found");

        await verifyWorkspaceAdmin(rule.workspaceId);

        await (prisma as any).automationRule.update({
            where: { id },
            data: { isActive }
        });

        revalidatePath("/(dashboard)/settings", "page");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
