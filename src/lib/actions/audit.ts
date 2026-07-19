"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createAuditLog(data: {
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return;

        await prisma.auditLog.create({
            data: {
                ...data,
                userId: user.id,
                workspaceId: (user as any).activeWorkspaceId || null
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}

export async function getAuditLogs() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) throw new Error("Unauthorized");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user || user.role !== "ADMIN") throw new Error("Restricted access");

        return await prisma.auditLog.findMany({
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
    }
}
